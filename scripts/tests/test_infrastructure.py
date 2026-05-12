"""
Unit tests for checks/infrastructure.py — Infrastructure and Docker Readiness.

Tests cover:
- check_no_latest_image_tags: detection of latest/pinned image tags
- check_healthcheck_stanzas: detection of missing healthcheck stanzas
- check_depends_on_conditions: service_healthy vs service_started detection
- check_env_example_completeness: required env var documentation
- check_redpanda_memory_flag: --memory=512M flag presence
- check_container_states: running/exited-0 vs failed states
- InfrastructureCheck.run: dimension and overall status

Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.checks.infrastructure import (
    CUSTOM_SERVICES,
    REQUIRED_ENV_VARS,
    InfrastructureCheck,
    _is_latest_tag,
    check_container_states,
    check_depends_on_conditions,
    check_env_example_completeness,
    check_healthcheck_stanzas,
    check_no_latest_image_tags,
    check_redpanda_memory_flag,
)
from scripts.models import Status


# ---------------------------------------------------------------------------
# _is_latest_tag helper
# ---------------------------------------------------------------------------

class TestIsLatestTag:
    def test_explicit_latest_tag(self):
        assert _is_latest_tag("nginx:latest") is True

    def test_implicit_latest_no_tag(self):
        assert _is_latest_tag("nginx") is True

    def test_pinned_version_tag(self):
        assert _is_latest_tag("nginx:1.25-alpine") is False

    def test_semver_tag(self):
        assert _is_latest_tag("myrepo/myimage:v1.2.3") is False

    def test_sha_digest_stripped(self):
        # Image with digest but no tag → implicit latest
        assert _is_latest_tag("nginx@sha256:abc123") is True

    def test_pinned_with_digest(self):
        # Image with tag and digest → tag is checked
        assert _is_latest_tag("nginx:1.25-alpine@sha256:abc123") is False

    def test_registry_with_port_no_tag(self):
        # localhost:5000/myimage — the "5000" is a port, not a tag
        assert _is_latest_tag("localhost:5000/myimage") is True

    def test_registry_with_port_and_tag(self):
        assert _is_latest_tag("localhost:5000/myimage:v1.0") is False

    def test_redpanda_pinned(self):
        assert _is_latest_tag("redpandadata/redpanda:v23.3.1") is False

    def test_redpanda_latest(self):
        assert _is_latest_tag("redpandadata/redpanda:latest") is True


# ---------------------------------------------------------------------------
# check_no_latest_image_tags
# ---------------------------------------------------------------------------

def _write_compose(tmp_path: Path, content: str, filename: str = "docker-compose.full.yml") -> Path:
    p = tmp_path / filename
    p.write_text(content)
    return p


class TestCheckNoLatestImageTags:
    def test_pinned_image_passes(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  nginx-gateway:
    image: nginx:1.25-alpine
""")
        details, failures = check_no_latest_image_tags(compose, {"nginx-gateway"})
        assert failures == []
        assert any("pinned" in d for d in details)

    def test_latest_image_fails(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  nginx-gateway:
    image: nginx:latest
""")
        details, failures = check_no_latest_image_tags(compose, {"nginx-gateway"})
        assert len(failures) >= 1
        assert any("latest" in f for f in failures)

    def test_implicit_latest_no_tag_fails(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  nginx-gateway:
    image: nginx
""")
        details, failures = check_no_latest_image_tags(compose, {"nginx-gateway"})
        assert len(failures) >= 1

    def test_build_only_service_passes(self, tmp_path: Path):
        """Build-only services (no image: key) are not flagged."""
        compose = _write_compose(tmp_path, """
services:
  m2-master:
    build:
      context: ../backend/services/m2-master
      dockerfile: Dockerfile
""")
        details, failures = check_no_latest_image_tags(compose, {"m2-master"})
        assert failures == []
        assert any("build-only" in d for d in details)

    def test_missing_service_skipped(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  other-service:
    image: something:v1
""")
        details, failures = check_no_latest_image_tags(compose, {"nginx-gateway"})
        assert failures == []
        assert any("not found" in d for d in details)

    def test_missing_file_fails(self, tmp_path: Path):
        compose = tmp_path / "docker-compose.full.yml"
        details, failures = check_no_latest_image_tags(compose, {"nginx-gateway"})
        assert len(failures) >= 1
        assert any("not found" in f.lower() for f in failures)

    def test_multiple_services_one_latest_fails(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  nginx-gateway:
    image: nginx:1.25-alpine
  m2-master:
    build:
      context: .
  bad-service:
    image: someimage:latest
""")
        details, failures = check_no_latest_image_tags(
            compose, {"nginx-gateway", "m2-master", "bad-service"}
        )
        assert len(failures) == 1
        assert any("bad-service" in f for f in failures)


# ---------------------------------------------------------------------------
# check_healthcheck_stanzas
# ---------------------------------------------------------------------------

class TestCheckHealthcheckStanzas:
    def test_both_services_have_healthcheck_passes(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  m1-demand:
    image: m1:v1
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8002/health || exit 1"]
      interval: 10s
  m5a-material:
    image: m5a:v1
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8003/health || exit 1"]
      interval: 10s
""")
        details, failures = check_healthcheck_stanzas(compose)
        assert failures == []
        assert len(details) == 2

    def test_m1_demand_missing_healthcheck_fails(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  m1-demand:
    image: m1:v1
  m5a-material:
    image: m5a:v1
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8003/health || exit 1"]
""")
        details, failures = check_healthcheck_stanzas(compose)
        assert len(failures) == 1
        assert any("m1-demand" in f for f in failures)

    def test_m5a_material_missing_healthcheck_fails(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  m1-demand:
    image: m1:v1
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8002/health || exit 1"]
  m5a-material:
    image: m5a:v1
""")
        details, failures = check_healthcheck_stanzas(compose)
        assert len(failures) == 1
        assert any("m5a-material" in f for f in failures)

    def test_both_missing_healthcheck_fails_twice(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  m1-demand:
    image: m1:v1
  m5a-material:
    image: m5a:v1
""")
        details, failures = check_healthcheck_stanzas(compose)
        assert len(failures) == 2

    def test_missing_file_fails(self, tmp_path: Path):
        compose = tmp_path / "docker-compose.full.yml"
        details, failures = check_healthcheck_stanzas(compose)
        assert len(failures) >= 1


# ---------------------------------------------------------------------------
# check_depends_on_conditions
# ---------------------------------------------------------------------------

class TestCheckDependsOnConditions:
    def test_service_healthy_condition_passes(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  m1-demand:
    image: m1:v1
    depends_on:
      postgres:
        condition: service_healthy
      redpanda:
        condition: service_healthy
""")
        details, failures = check_depends_on_conditions(
            compose, {"m1-demand": {"postgres", "redpanda"}}
        )
        assert failures == []

    def test_service_started_condition_fails(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  m1-demand:
    image: m1:v1
    depends_on:
      postgres:
        condition: service_started
      redpanda:
        condition: service_healthy
""")
        details, failures = check_depends_on_conditions(
            compose, {"m1-demand": {"postgres", "redpanda"}}
        )
        assert len(failures) == 1
        assert any("postgres" in f for f in failures)
        assert any("service_started" in f for f in failures)

    def test_simple_list_depends_on_fails(self, tmp_path: Path):
        """Simple list form (no conditions) should be flagged."""
        compose = _write_compose(tmp_path, """
services:
  m1-demand:
    image: m1:v1
    depends_on:
      - postgres
      - redpanda
""")
        details, failures = check_depends_on_conditions(
            compose, {"m1-demand": {"postgres", "redpanda"}}
        )
        assert len(failures) >= 1

    def test_missing_service_skipped(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  other:
    image: other:v1
""")
        details, failures = check_depends_on_conditions(
            compose, {"m1-demand": {"postgres"}}
        )
        assert failures == []

    def test_missing_file_fails(self, tmp_path: Path):
        compose = tmp_path / "docker-compose.full.yml"
        details, failures = check_depends_on_conditions(
            compose, {"m1-demand": {"postgres"}}
        )
        assert len(failures) >= 1


# ---------------------------------------------------------------------------
# check_env_example_completeness
# ---------------------------------------------------------------------------

class TestCheckEnvExampleCompleteness:
    def test_all_required_vars_present_passes(self, tmp_path: Path):
        env_example = tmp_path / ".env.example"
        env_example.write_text(
            "EVENT_SIGNING_SECRET=dev-secret\n"
            "PLANT_ID=hsl_ludhiana\n"
            "CORS_ORIGINS=http://localhost:5173\n"
            "AUTH_DISABLED=true\n"
            "POSTGRES_PASSWORD=zedral_dev_password\n"
            "POSTGRES_USER=zedral\n"
            "POSTGRES_DB=zedral\n"
        )
        details, failures = check_env_example_completeness(env_example)
        assert failures == []
        assert len(details) == len(REQUIRED_ENV_VARS)

    def test_missing_event_signing_secret_fails(self, tmp_path: Path):
        env_example = tmp_path / ".env.example"
        env_example.write_text(
            "PLANT_ID=hsl_ludhiana\n"
            "CORS_ORIGINS=http://localhost:5173\n"
            "AUTH_DISABLED=true\n"
            "POSTGRES_PASSWORD=zedral_dev_password\n"
            "POSTGRES_USER=zedral\n"
            "POSTGRES_DB=zedral\n"
        )
        details, failures = check_env_example_completeness(env_example)
        assert len(failures) == 1
        assert any("EVENT_SIGNING_SECRET" in f for f in failures)

    def test_commented_out_var_not_counted(self, tmp_path: Path):
        """A variable that only appears in a comment is not considered documented."""
        env_example = tmp_path / ".env.example"
        env_example.write_text(
            "# EVENT_SIGNING_SECRET=example\n"
            "PLANT_ID=hsl_ludhiana\n"
            "CORS_ORIGINS=http://localhost:5173\n"
            "AUTH_DISABLED=true\n"
            "POSTGRES_PASSWORD=zedral_dev_password\n"
            "POSTGRES_USER=zedral\n"
            "POSTGRES_DB=zedral\n"
        )
        details, failures = check_env_example_completeness(env_example)
        assert any("EVENT_SIGNING_SECRET" in f for f in failures)

    def test_missing_file_fails(self, tmp_path: Path):
        env_example = tmp_path / ".env.example"
        details, failures = check_env_example_completeness(env_example)
        assert len(failures) >= 1
        assert any("not found" in f.lower() for f in failures)

    def test_all_vars_missing_produces_correct_count(self, tmp_path: Path):
        env_example = tmp_path / ".env.example"
        env_example.write_text("# empty file\n")
        details, failures = check_env_example_completeness(env_example)
        assert len(failures) == len(REQUIRED_ENV_VARS)

    def test_extra_vars_do_not_cause_failure(self, tmp_path: Path):
        env_example = tmp_path / ".env.example"
        env_example.write_text(
            "EVENT_SIGNING_SECRET=dev-secret\n"
            "PLANT_ID=hsl_ludhiana\n"
            "CORS_ORIGINS=http://localhost:5173\n"
            "AUTH_DISABLED=true\n"
            "POSTGRES_PASSWORD=zedral_dev_password\n"
            "POSTGRES_USER=zedral\n"
            "POSTGRES_DB=zedral\n"
            "EXTRA_VAR=something\n"
            "ANOTHER_VAR=value\n"
        )
        details, failures = check_env_example_completeness(env_example)
        assert failures == []


# ---------------------------------------------------------------------------
# check_redpanda_memory_flag
# ---------------------------------------------------------------------------

class TestCheckRedpandaMemoryFlag:
    def test_memory_flag_present_passes(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  redpanda:
    image: redpandadata/redpanda:v23.3.1
    command:
      - redpanda
      - start
      - --smp=1
      - --memory=512M
      - --reserve-memory=0M
""", "docker-compose.yml")
        details, failures = check_redpanda_memory_flag(compose)
        assert failures == []
        assert any("512M" in d for d in details)

    def test_memory_flag_missing_fails(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  redpanda:
    image: redpandadata/redpanda:v23.3.1
    command:
      - redpanda
      - start
      - --smp=1
      - --reserve-memory=0M
""", "docker-compose.yml")
        details, failures = check_redpanda_memory_flag(compose)
        assert len(failures) >= 1
        assert any("512M" in f for f in failures)

    def test_different_memory_value_fails(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  redpanda:
    image: redpandadata/redpanda:v23.3.1
    command:
      - redpanda
      - start
      - --memory=256M
""", "docker-compose.yml")
        details, failures = check_redpanda_memory_flag(compose)
        assert len(failures) >= 1

    def test_missing_redpanda_service_fails(self, tmp_path: Path):
        compose = _write_compose(tmp_path, """
services:
  postgres:
    image: postgres:16
""", "docker-compose.yml")
        details, failures = check_redpanda_memory_flag(compose)
        assert len(failures) >= 1

    def test_missing_file_fails(self, tmp_path: Path):
        compose = tmp_path / "docker-compose.yml"
        details, failures = check_redpanda_memory_flag(compose)
        assert len(failures) >= 1

    def test_string_command_form_passes(self, tmp_path: Path):
        """Command as a single string (not list) is also parsed."""
        compose = _write_compose(tmp_path, """
services:
  redpanda:
    image: redpandadata/redpanda:v23.3.1
    command: "redpanda start --smp=1 --memory=512M --reserve-memory=0M"
""", "docker-compose.yml")
        details, failures = check_redpanda_memory_flag(compose)
        assert failures == []


# ---------------------------------------------------------------------------
# check_container_states
# ---------------------------------------------------------------------------

class TestCheckContainerStates:
    def _make_subprocess(self, states: dict[str, dict]) -> callable:
        """Create a mock subprocess runner returning given states per container."""
        def run_subprocess(args: list[str]) -> tuple[int, str, str]:
            # args = ["docker", "inspect", "--format", "{{json .State}}", name]
            name = args[-1]
            if name in states:
                return 0, json.dumps(states[name]), ""
            return 1, "", f"Error: No such container: {name}"
        return run_subprocess

    def test_running_container_passes(self):
        runner = self._make_subprocess({
            "zedral-postgres": {"Status": "running", "Running": True, "ExitCode": 0}
        })
        details, failures = check_container_states(["zedral-postgres"], runner)
        assert failures == []
        assert any("running" in d for d in details)

    def test_exited_zero_container_passes(self):
        runner = self._make_subprocess({
            "zedral-redpanda-init": {"Status": "exited", "Running": False, "ExitCode": 0}
        })
        details, failures = check_container_states(["zedral-redpanda-init"], runner)
        assert failures == []
        assert any("exited-0" in d for d in details)

    def test_exited_nonzero_container_fails(self):
        runner = self._make_subprocess({
            "zedral-m1-demand": {"Status": "exited", "Running": False, "ExitCode": 1}
        })
        details, failures = check_container_states(["zedral-m1-demand"], runner)
        assert len(failures) >= 1
        assert any("exit" in f.lower() for f in failures)

    def test_container_not_found_is_noted(self):
        def run_subprocess(args):
            return 1, "", "Error: No such container"
        details, failures = check_container_states(["zedral-missing"], run_subprocess)
        # Not found is a detail, not a hard failure (stack may not be running)
        assert any("not found" in d.lower() for d in details)

    def test_unexpected_state_fails(self):
        runner = self._make_subprocess({
            "zedral-postgres": {"Status": "paused", "Running": False, "ExitCode": 0}
        })
        details, failures = check_container_states(["zedral-postgres"], runner)
        assert len(failures) >= 1
        assert any("paused" in f for f in failures)

    def test_multiple_containers_all_running_passes(self):
        states = {
            f"zedral-svc-{i}": {"Status": "running", "Running": True, "ExitCode": 0}
            for i in range(3)
        }
        runner = self._make_subprocess(states)
        details, failures = check_container_states(list(states.keys()), runner)
        assert failures == []

    def test_multiple_containers_one_failed(self):
        runner = self._make_subprocess({
            "zedral-postgres": {"Status": "running", "Running": True, "ExitCode": 0},
            "zedral-m1-demand": {"Status": "exited", "Running": False, "ExitCode": 2},
        })
        details, failures = check_container_states(
            ["zedral-postgres", "zedral-m1-demand"], runner
        )
        assert len(failures) == 1
        assert any("m1-demand" in f for f in failures)


# ---------------------------------------------------------------------------
# InfrastructureCheck integration
# ---------------------------------------------------------------------------

class TestInfrastructureCheck:
    def _make_clean_project(self, tmp_path: Path) -> None:
        """Set up a minimal clean project structure."""
        infra = tmp_path / "infra"
        infra.mkdir()

        # docker-compose.full.yml — build-only services, nginx pinned
        (infra / "docker-compose.full.yml").write_text("""
services:
  m2-master:
    build:
      context: ../backend/services/m2-master
  m1-demand:
    build:
      context: ../backend/services/m1-demand
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8002/health || exit 1"]
    depends_on:
      postgres:
        condition: service_healthy
      redpanda:
        condition: service_healthy
  m5a-material:
    build:
      context: ../backend/services/m5a-material
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8003/health || exit 1"]
    depends_on:
      postgres:
        condition: service_healthy
      redpanda:
        condition: service_healthy
  m6-dispatch:
    build:
      context: ../backend/services/m6-dispatch
    depends_on:
      postgres:
        condition: service_healthy
      redpanda:
        condition: service_healthy
  nginx-gateway:
    image: nginx:1.25-alpine
    depends_on:
      m2-master:
        condition: service_healthy
      m6-dispatch:
        condition: service_healthy
""")

        # docker-compose.yml — with Redpanda memory flag
        (infra / "docker-compose.yml").write_text("""
services:
  redpanda:
    image: redpandadata/redpanda:v23.3.1
    command:
      - redpanda
      - start
      - --smp=1
      - --memory=512M
      - --reserve-memory=0M
""")

        # .env.example — all required vars
        (infra / ".env.example").write_text(
            "EVENT_SIGNING_SECRET=dev-secret\n"
            "PLANT_ID=hsl_ludhiana\n"
            "CORS_ORIGINS=http://localhost:5173\n"
            "AUTH_DISABLED=true\n"
            "POSTGRES_PASSWORD=zedral_dev_password\n"
            "POSTGRES_USER=zedral\n"
            "POSTGRES_DB=zedral\n"
        )

    def test_dimension_is_infrastructure(self, tmp_path: Path):
        self._make_clean_project(tmp_path)
        checker = InfrastructureCheck(
            project_root=tmp_path, skip_container_check=True
        )
        result = checker.run()
        assert result.dimension == "Infrastructure"

    def test_clean_project_passes(self, tmp_path: Path):
        self._make_clean_project(tmp_path)
        checker = InfrastructureCheck(
            project_root=tmp_path, skip_container_check=True
        )
        result = checker.run()
        assert result.status == Status.PASS, (
            f"Expected PASS for clean project, got {result.status!r}. "
            f"Failures: {result.failures}"
        )

    def test_latest_image_tag_causes_fail(self, tmp_path: Path):
        self._make_clean_project(tmp_path)
        # Overwrite with a latest tag on nginx
        (tmp_path / "infra" / "docker-compose.full.yml").write_text("""
services:
  nginx-gateway:
    image: nginx:latest
  m1-demand:
    build:
      context: .
    healthcheck:
      test: ["CMD"]
    depends_on:
      postgres:
        condition: service_healthy
      redpanda:
        condition: service_healthy
  m5a-material:
    build:
      context: .
    healthcheck:
      test: ["CMD"]
    depends_on:
      postgres:
        condition: service_healthy
      redpanda:
        condition: service_healthy
  m2-master:
    build:
      context: .
    depends_on:
      postgres:
        condition: service_healthy
      redpanda:
        condition: service_healthy
  m6-dispatch:
    build:
      context: .
    depends_on:
      postgres:
        condition: service_healthy
      redpanda:
        condition: service_healthy
""")
        checker = InfrastructureCheck(
            project_root=tmp_path, skip_container_check=True
        )
        result = checker.run()
        assert result.status == Status.FAIL
        assert any("latest" in f for f in result.failures)

    def test_missing_env_var_causes_fail(self, tmp_path: Path):
        self._make_clean_project(tmp_path)
        # Overwrite .env.example without EVENT_SIGNING_SECRET
        (tmp_path / "infra" / ".env.example").write_text(
            "PLANT_ID=hsl_ludhiana\n"
            "CORS_ORIGINS=http://localhost:5173\n"
            "AUTH_DISABLED=true\n"
            "POSTGRES_PASSWORD=zedral_dev_password\n"
            "POSTGRES_USER=zedral\n"
            "POSTGRES_DB=zedral\n"
        )
        checker = InfrastructureCheck(
            project_root=tmp_path, skip_container_check=True
        )
        result = checker.run()
        assert result.status == Status.FAIL
        assert any("EVENT_SIGNING_SECRET" in f for f in result.failures)

    def test_missing_memory_flag_causes_fail(self, tmp_path: Path):
        self._make_clean_project(tmp_path)
        (tmp_path / "infra" / "docker-compose.yml").write_text("""
services:
  redpanda:
    image: redpandadata/redpanda:v23.3.1
    command:
      - redpanda
      - start
      - --smp=1
""")
        checker = InfrastructureCheck(
            project_root=tmp_path, skip_container_check=True
        )
        result = checker.run()
        assert result.status == Status.FAIL
        assert any("512M" in f for f in result.failures)
