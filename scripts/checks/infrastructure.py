"""
checks/infrastructure.py -- Infrastructure and Docker Readiness check.

Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Callable, Optional

try:
    import yaml
    _YAML_AVAILABLE = True
except ImportError:
    _YAML_AVAILABLE = False

from models import CheckResult, Status

CUSTOM_SERVICES: set[str] = {
    "m2-master",
    "m1-demand",
    "m5a-material",
    "m6-dispatch",
    "nginx-gateway",
}

REQUIRED_ENV_VARS: list[str] = [
    "EVENT_SIGNING_SECRET",
    "PLANT_ID",
    "CORS_ORIGINS",
    "AUTH_DISABLED",
    "POSTGRES_PASSWORD",
    "POSTGRES_USER",
    "POSTGRES_DB",
]

_HEALTHCHECK_REQUIRED: list[str] = ["m1-demand", "m5a-material"]

_EXPECTED_CONTAINERS: list[str] = [
    "zedral-postgres",
    "zedral-redpanda",
    "zedral-redpanda-init",
    "zedral-keycloak",
    "zedral-m2-master",
    "zedral-m1-demand",
    "zedral-m5a-material",
    "zedral-m6-dispatch",
    "zedral-nginx-gateway",
]

_COMPOSE_FULL = Path("infra") / "docker-compose.full.yml"
_COMPOSE_BASE = Path("infra") / "docker-compose.yml"
_ENV_EXAMPLE = Path("infra") / ".env.example"

SubprocessRunner = Callable[[list[str]], tuple[int, str, str]]


def _default_subprocess_runner(args: list[str]) -> tuple[int, str, str]:
    import subprocess
    result = subprocess.run(args, capture_output=True, text=True)
    return result.returncode, result.stdout, result.stderr


def _load_yaml(path: Path) -> tuple[Optional[dict], Optional[str]]:
    if not path.exists():
        return None, f"File not found: {path}"
    if not _YAML_AVAILABLE:
        return None, "PyYAML not available"
    try:
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        return data or {}, None
    except Exception as exc:
        return None, f"YAML parse error in {path}: {exc}"


def _is_latest_tag(image: str) -> bool:
    digest_sep = image.find("@")
    if digest_sep != -1:
        image_without_digest = image[:digest_sep]
    else:
        image_without_digest = image

    last_colon = image_without_digest.rfind(":")
    if last_colon == -1:
        return True

    potential_tag = image_without_digest[last_colon + 1:]

    if "/" in potential_tag:
        return True

    if potential_tag.isdigit():
        return True

    if potential_tag == "latest":
        return True

    return False


def check_no_latest_image_tags(
    compose_path: Path,
    custom_services: set[str],
) -> tuple[list[str], list[str]]:
    details: list[str] = []
    failures: list[str] = []

    data, err = _load_yaml(compose_path)
    if err:
        failures.append(f"docker-compose file not found or unreadable: {err}")
        return details, failures

    raw_services = data.get("services", {}) if isinstance(data, dict) else {}
    # YAML may parse numeric service names as integers; normalise keys to str
    services = {str(k): v for k, v in raw_services.items()}

    for svc_name in sorted(custom_services):
        svc = services.get(svc_name)
        if svc is None:
            details.append(f"Service {svc_name!r} not found in compose file -- skipped")
            continue

        image = svc.get("image")
        if image is None:
            details.append(f"Service {svc_name!r} is build-only (no image:) -- skipped (build-only)")
            continue

        if _is_latest_tag(str(image)):
            failures.append(
                f"Service {svc_name!r} uses latest (or untagged) image: {image!r} -- "
                f"pin to a specific version tag"
            )
        else:
            details.append(f"Service {svc_name!r} image {image!r} is pinned")

    return details, failures


def check_healthcheck_stanzas(
    compose_path: Path,
    services: list[str] = _HEALTHCHECK_REQUIRED,
) -> tuple[list[str], list[str]]:
    details: list[str] = []
    failures: list[str] = []

    data, err = _load_yaml(compose_path)
    if err:
        failures.append(f"docker-compose file not found or unreadable: {err}")
        return details, failures

    compose_services = data.get("services", {}) if isinstance(data, dict) else {}

    for svc_name in services:
        svc = compose_services.get(svc_name)
        if svc is None:
            failures.append(
                f"Service {svc_name!r} not found in compose file -- "
                f"cannot verify healthcheck stanza"
            )
            continue

        if svc.get("healthcheck"):
            details.append(f"Service {svc_name!r} has healthcheck stanza")
        else:
            failures.append(
                f"Service {svc_name!r} is missing a healthcheck stanza in "
                f"{compose_path.name} (Req 1.5/1.6)"
            )

    return details, failures


def check_depends_on_conditions(
    compose_path: Path,
    expected: dict[str, set[str]],
) -> tuple[list[str], list[str]]:
    details: list[str] = []
    failures: list[str] = []

    data, err = _load_yaml(compose_path)
    if err:
        failures.append(f"docker-compose file not found or unreadable: {err}")
        return details, failures

    compose_services = data.get("services", {}) if isinstance(data, dict) else {}

    for svc_name, required_deps in expected.items():
        svc = compose_services.get(svc_name)
        if svc is None:
            details.append(f"Service {svc_name!r} not found in compose file -- skipped")
            continue

        depends_on = svc.get("depends_on")
        if depends_on is None:
            details.append(f"Service {svc_name!r} has no depends_on -- skipped")
            continue

        if isinstance(depends_on, list):
            for dep in required_deps:
                if dep in depends_on:
                    failures.append(
                        f"Service {svc_name!r} depends_on {dep!r} uses simple list "
                        f"form (no condition) -- use service_healthy instead"
                    )
                else:
                    details.append(f"Service {svc_name!r} does not depend on {dep!r} -- skipped")
        elif isinstance(depends_on, dict):
            for dep in required_deps:
                if dep not in depends_on:
                    details.append(f"Service {svc_name!r} does not depend on {dep!r} -- skipped")
                    continue

                dep_config = depends_on[dep]
                if isinstance(dep_config, dict):
                    condition = dep_config.get("condition", "")
                else:
                    condition = str(dep_config)

                if condition == "service_healthy":
                    details.append(f"Service {svc_name!r} -> {dep!r}: condition=service_healthy")
                else:
                    failures.append(
                        f"Service {svc_name!r} -> {dep!r}: condition={condition!r} -- "
                        f"expected service_healthy (Req 8.7)"
                    )

    return details, failures


def check_env_example_completeness(
    env_example_path: Path,
    required_vars: list[str] = REQUIRED_ENV_VARS,
) -> tuple[list[str], list[str]]:
    details: list[str] = []
    failures: list[str] = []

    if not env_example_path.exists():
        failures.append(f".env.example not found at {env_example_path}")
        return details, failures

    try:
        content = env_example_path.read_text(encoding="utf-8")
    except Exception as exc:
        failures.append(f"Could not read .env.example: {exc}")
        return details, failures

    documented: set[str] = set()
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)\s*=', stripped)
        if match:
            documented.add(match.group(1))

    for var in required_vars:
        if var in documented:
            details.append(f"{var} documented in .env.example")
        else:
            failures.append(f"Required env var {var!r} not documented in {env_example_path.name}")

    return details, failures


def check_redpanda_memory_flag(
    compose_path: Path,
) -> tuple[list[str], list[str]]:
    details: list[str] = []
    failures: list[str] = []

    data, err = _load_yaml(compose_path)
    if err:
        failures.append(f"docker-compose.yml not found or unreadable: {err}")
        return details, failures

    services = data.get("services", {}) if isinstance(data, dict) else {}
    redpanda = services.get("redpanda")

    if redpanda is None:
        failures.append(
            "Redpanda service not found in docker-compose.yml -- "
            "cannot verify --memory=512M flag"
        )
        return details, failures

    command = redpanda.get("command", "")
    if isinstance(command, list):
        command_str = " ".join(str(c) for c in command)
    else:
        command_str = str(command)

    if "--memory=512M" in command_str:
        details.append("Redpanda --memory=512M flag is present in docker-compose.yml")
    else:
        failures.append(
            "Redpanda --memory=512M flag is missing from docker-compose.yml "
            "(Req 8.8) -- add --memory=512M to the redpanda service command"
        )

    return details, failures


def check_container_states(
    container_names: list[str],
    subprocess_runner: SubprocessRunner = _default_subprocess_runner,
) -> tuple[list[str], list[str]]:
    details: list[str] = []
    failures: list[str] = []

    for name in container_names:
        returncode, stdout, stderr = subprocess_runner(
            ["docker", "inspect", "--format", "{{json .State}}", name]
        )

        if returncode != 0:
            details.append(f"Container {name!r} not found -- stack may not be running")
            continue

        try:
            state = json.loads(stdout.strip())
        except json.JSONDecodeError:
            failures.append(f"Container {name!r}: could not parse docker inspect output")
            continue

        status = state.get("Status", "unknown")
        running = state.get("Running", False)
        exit_code = state.get("ExitCode", -1)

        if running or status == "running":
            details.append(f"Container {name!r}: running")
        elif status == "exited" and exit_code == 0:
            details.append(f"Container {name!r}: exited-0")
        elif status == "exited" and exit_code != 0:
            failures.append(
                f"Container {name!r}: exited with non-zero code {exit_code} "
                f"(status={status!r})"
            )
        else:
            failures.append(
                f"Container {name!r}: unexpected state {status!r} "
                f"(exit_code={exit_code})"
            )

    return details, failures


class InfrastructureCheck:
    def __init__(
        self,
        project_root: Optional[Path] = None,
        skip_container_check: bool = False,
        subprocess_runner: SubprocessRunner = _default_subprocess_runner,
    ) -> None:
        if project_root is None:
            self._project_root = Path(__file__).parent.parent.parent
        else:
            self._project_root = project_root

        self._skip_container_check = skip_container_check
        self._subprocess_runner = subprocess_runner

    @property
    def _compose_full_path(self) -> Path:
        return self._project_root / _COMPOSE_FULL

    @property
    def _compose_base_path(self) -> Path:
        return self._project_root / _COMPOSE_BASE

    @property
    def _env_example_path(self) -> Path:
        return self._project_root / _ENV_EXAMPLE

    def run(self) -> CheckResult:
        all_details: list[str] = []
        all_failures: list[str] = []

        if not self._skip_container_check:
            all_details.append("--- Checking container states ---")
            c_details, c_failures = check_container_states(
                _EXPECTED_CONTAINERS, self._subprocess_runner
            )
            all_details.extend(c_details)
            all_failures.extend(c_failures)

        all_details.append("--- Checking for latest image tags ---")
        img_details, img_failures = check_no_latest_image_tags(
            self._compose_full_path, CUSTOM_SERVICES
        )
        all_details.extend(img_details)
        all_failures.extend(img_failures)

        all_details.append("--- Checking healthcheck stanzas ---")
        hc_details, hc_failures = check_healthcheck_stanzas(self._compose_full_path)
        all_details.extend(hc_details)
        all_failures.extend(hc_failures)

        all_details.append("--- Checking depends_on conditions ---")
        dep_details, dep_failures = check_depends_on_conditions(
            self._compose_full_path,
            {
                "m1-demand": {"postgres", "redpanda"},
                "m5a-material": {"postgres", "redpanda"},
                "m6-dispatch": {"postgres", "redpanda"},
                "nginx-gateway": {"m2-master", "m6-dispatch"},
            },
        )
        all_details.extend(dep_details)
        all_failures.extend(dep_failures)

        all_details.append("--- Checking infra/.env.example completeness ---")
        env_details, env_failures = check_env_example_completeness(self._env_example_path)
        all_details.extend(env_details)
        all_failures.extend(env_failures)

        all_details.append("--- Checking Redpanda --memory=512M flag ---")
        mem_details, mem_failures = check_redpanda_memory_flag(self._compose_base_path)
        all_details.extend(mem_details)
        all_failures.extend(mem_failures)

        overall = Status.FAIL if all_failures else Status.PASS

        return CheckResult(
            dimension="Infrastructure",
            status=overall,
            details=all_details,
            failures=all_failures,
        )

