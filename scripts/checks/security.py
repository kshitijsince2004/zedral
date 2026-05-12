"""
checks/security.py — Security Hardening check.

Responsibilities:
- Scan the repository for committed .env files (excluding .env.example)
  containing dev placeholder secrets:
    zedral_dev_password
    dev-secret-change-in-production
    admin_dev_password
- Verify AUTH_DISABLED is not hardcoded to "true" in docker-compose.full.yml.
- Verify infra/keycloak/realm-export.json defines admin, supervisor, and
  operator roles.
- Flag nginx CORS map if it contains only localhost origins.
- Returns a CheckResult with dimension "Security Hardening".
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

try:
    import yaml  # PyYAML
    _YAML_AVAILABLE = True
except ImportError:
    _YAML_AVAILABLE = False

from models import CheckResult, Status

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Dev placeholder secrets that must NOT appear in committed .env files
DEV_SECRETS: list[str] = [
    "zedral_dev_password",
    "dev-secret-change-in-production",
    "admin_dev_password",
]

# Roles that must be defined in the Keycloak realm export
REQUIRED_KEYCLOAK_ROLES: list[str] = ["admin", "supervisor", "operator"]

# Localhost origin patterns (regex) used to detect localhost-only CORS config
_LOCALHOST_PATTERN = re.compile(r"localhost", re.IGNORECASE)

# Default paths (relative to project root)
_COMPOSE_FULL_PATH = Path("infra") / "docker-compose.full.yml"
_REALM_EXPORT_PATH = Path("infra") / "keycloak" / "realm-export.json"
_NGINX_CONF_CANDIDATES: list[Path] = [
    Path("infra") / "nginx" / "nginx.conf",
    Path("infra") / "nginx.conf",
    Path("nginx.conf"),
]


# ---------------------------------------------------------------------------
# Secret scanning
# ---------------------------------------------------------------------------

def contains_dev_secret(content: str, secrets: list[str] = DEV_SECRETS) -> list[str]:
    """
    Return a list of dev placeholder secrets found in the given file content.

    Parameters
    ----------
    content : str
        The text content to scan.
    secrets : list[str]
        The list of secret strings to look for.

    Returns
    -------
    list[str]
        The subset of ``secrets`` that appear in ``content``.
        Empty list if none are found.
    """
    return [secret for secret in secrets if secret in content]


def scan_env_files(
    project_root: Path,
    secrets: list[str] = DEV_SECRETS,
) -> tuple[list[str], list[str]]:
    """
    Walk the repository looking for .env files (excluding .env.example) and
    check each for dev placeholder secrets.

    A file is considered an ".env file" if:
    - Its name is exactly ".env" or starts with ".env" (e.g. ".env.local",
      ".env.production"), OR
    - Its name ends with ".env" (e.g. "backend.env", "service.env")

    Files named ".env.example" (case-insensitive) are excluded.

    Parameters
    ----------
    project_root : Path
        Root directory to walk.
    secrets : list[str]
        Dev placeholder secrets to scan for.

    Returns
    -------
    (details, failures)
        details: informational lines
        failures: failure messages (non-empty if secrets found)
    """
    details: list[str] = []
    failures: list[str] = []

    env_files_scanned = 0

    for path in sorted(project_root.rglob("*")):
        if not path.is_file():
            continue

        name = path.name

        # Determine if this is an .env file
        is_env_file = (
            name == ".env"
            or name.startswith(".env.")
            or name.endswith(".env")
        )
        if not is_env_file:
            continue

        # Exclude .env.example files (case-insensitive)
        if name.lower() == ".env.example":
            details.append(f"Skipping .env.example: {path.relative_to(project_root)}")
            continue

        env_files_scanned += 1

        try:
            content = path.read_text(encoding="utf-8", errors="replace")
        except Exception as exc:
            details.append(
                f"Could not read {path.relative_to(project_root)}: {exc}"
            )
            continue

        found_secrets = contains_dev_secret(content, secrets)
        rel_path = path.relative_to(project_root)

        if found_secrets:
            for secret in found_secrets:
                failures.append(
                    f"Dev secret {secret!r} found in committed file: {rel_path}"
                )
        else:
            details.append(
                f"No dev secrets found in {rel_path} ✓"
            )

    if env_files_scanned == 0:
        details.append("No .env files (excluding .env.example) found in repository")
    else:
        details.append(
            f"Scanned {env_files_scanned} .env file(s) for dev placeholder secrets"
        )

    return details, failures


# ---------------------------------------------------------------------------
# AUTH_DISABLED check
# ---------------------------------------------------------------------------

def check_auth_disabled(
    compose_path: Path,
) -> tuple[list[str], list[str]]:
    """
    Verify that AUTH_DISABLED is not hardcoded to "true" in
    docker-compose.full.yml.

    Checks for both YAML-style ``AUTH_DISABLED: "true"`` and shell-style
    ``AUTH_DISABLED=true`` (case-insensitive for the value).

    Parameters
    ----------
    compose_path : Path
        Absolute path to docker-compose.full.yml.

    Returns
    -------
    (details, failures)
    """
    details: list[str] = []
    failures: list[str] = []

    if not compose_path.exists():
        failures.append(
            f"docker-compose.full.yml not found at {compose_path}"
        )
        return details, failures

    try:
        content = compose_path.read_text(encoding="utf-8")
    except Exception as exc:
        failures.append(f"Could not read docker-compose.full.yml: {exc}")
        return details, failures

    # Pattern 1: YAML dict style — AUTH_DISABLED: "true" or AUTH_DISABLED: true
    yaml_pattern = re.compile(
        r'AUTH_DISABLED\s*:\s*["\']?true["\']?',
        re.IGNORECASE,
    )
    # Pattern 2: Shell env style — AUTH_DISABLED=true or AUTH_DISABLED="true"
    shell_pattern = re.compile(
        r'AUTH_DISABLED\s*=\s*["\']?true["\']?',
        re.IGNORECASE,
    )

    yaml_matches = yaml_pattern.findall(content)
    shell_matches = shell_pattern.findall(content)

    if yaml_matches or shell_matches:
        for match in yaml_matches + shell_matches:
            failures.append(
                f"AUTH_DISABLED hardcoded to true in docker-compose.full.yml: "
                f"{match!r}"
            )
    else:
        details.append(
            "AUTH_DISABLED is not hardcoded to true in docker-compose.full.yml ✓"
        )

    return details, failures


# ---------------------------------------------------------------------------
# Keycloak realm roles check
# ---------------------------------------------------------------------------

def check_keycloak_roles(
    realm_export_path: Path,
    required_roles: list[str] = REQUIRED_KEYCLOAK_ROLES,
) -> tuple[list[str], list[str]]:
    """
    Verify that infra/keycloak/realm-export.json defines the required roles
    in the ``roles.realm`` array.

    Parameters
    ----------
    realm_export_path : Path
        Absolute path to realm-export.json.
    required_roles : list[str]
        Role names that must be present.

    Returns
    -------
    (details, failures)
    """
    details: list[str] = []
    failures: list[str] = []

    if not realm_export_path.exists():
        failures.append(
            f"realm-export.json not found at {realm_export_path}"
        )
        return details, failures

    try:
        content = realm_export_path.read_text(encoding="utf-8")
        realm = json.loads(content)
    except json.JSONDecodeError as exc:
        failures.append(f"realm-export.json is not valid JSON: {exc}")
        return details, failures
    except Exception as exc:
        failures.append(f"Could not read realm-export.json: {exc}")
        return details, failures

    # Extract realm roles from roles.realm array
    roles_section = realm.get("roles", {})
    realm_roles_list = roles_section.get("realm", []) if isinstance(roles_section, dict) else []

    # Build a set of role names (each entry is a dict with a "name" key)
    defined_role_names: set[str] = set()
    for role_entry in realm_roles_list:
        if isinstance(role_entry, dict):
            name = role_entry.get("name")
            if isinstance(name, str):
                defined_role_names.add(name)
        elif isinstance(role_entry, str):
            defined_role_names.add(role_entry)

    for role in required_roles:
        if role in defined_role_names:
            details.append(
                f"Keycloak realm role {role!r} defined ✓"
            )
        else:
            failures.append(
                f"Keycloak realm role {role!r} not found in realm-export.json "
                f"(roles.realm). Defined roles: {sorted(defined_role_names)}"
            )

    return details, failures


# ---------------------------------------------------------------------------
# Nginx CORS check
# ---------------------------------------------------------------------------

def check_nginx_cors(
    nginx_conf_candidates: list[Path],
) -> tuple[list[str], list[str]]:
    """
    Check the nginx.conf CORS map for localhost-only origins.

    Flags the configuration if the CORS map contains ONLY localhost entries
    (no production origins).

    Parameters
    ----------
    nginx_conf_candidates : list[Path]
        Paths to search for nginx.conf (checked in order).

    Returns
    -------
    (details, failures)
    """
    details: list[str] = []
    failures: list[str] = []

    nginx_conf_path: Optional[Path] = None
    for candidate in nginx_conf_candidates:
        if candidate.exists():
            nginx_conf_path = candidate
            break

    if nginx_conf_path is None:
        details.append(
            "nginx.conf not found at any of: "
            + ", ".join(str(p) for p in nginx_conf_candidates)
            + " — skipping CORS check"
        )
        return details, failures

    try:
        content = nginx_conf_path.read_text(encoding="utf-8")
    except Exception as exc:
        failures.append(f"Could not read nginx.conf: {exc}")
        return details, failures

    # Look for a CORS map block: map $http_origin $cors_origin { ... }
    # Extract the map body
    map_pattern = re.compile(
        r'map\s+\$http_origin\s+\$\w+\s*\{([^}]*)\}',
        re.DOTALL | re.IGNORECASE,
    )
    map_match = map_pattern.search(content)

    if not map_match:
        # No CORS map found — not necessarily a failure, just note it
        details.append(
            "No CORS origin map (map $http_origin ...) found in nginx.conf"
        )
        return details, failures

    map_body = map_match.group(1)

    # Extract all non-default, non-empty origin entries from the map
    # Lines like: "http://localhost:5173" "http://localhost:5173";
    # or:          http://localhost:5173  http://localhost:5173;
    # We look for lines that contain an origin value (not "default" or "~*")
    origin_entries: list[str] = []
    for line in map_body.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # Skip default entries
        if line.lower().startswith("default"):
            continue
        # Extract the key (first token)
        tokens = line.split()
        if tokens:
            key = tokens[0].strip('"\'')
            if key and key not in ("~*", "*", "default"):
                origin_entries.append(key)

    if not origin_entries:
        details.append(
            "CORS map found but contains no explicit origin entries "
            "(may use default/wildcard) — review for production readiness"
        )
        return details, failures

    # Check if ALL entries are localhost
    non_localhost = [
        entry for entry in origin_entries
        if not _LOCALHOST_PATTERN.search(entry)
    ]

    if non_localhost:
        details.append(
            f"CORS map contains {len(non_localhost)} non-localhost origin(s): "
            + ", ".join(non_localhost)
            + " ✓"
        )
    else:
        failures.append(
            f"CORS map in nginx.conf contains only localhost origin(s): "
            + ", ".join(origin_entries)
            + " — update to production frontend origin(s) before go-live"
        )

    return details, failures


# ---------------------------------------------------------------------------
# SecurityCheck class
# ---------------------------------------------------------------------------

class SecurityCheck:
    """
    Checks security hardening readiness.

    Parameters
    ----------
    project_root : Path, optional
        Root of the project. Defaults to three levels up from this file
        (i.e. the repo root).
    """

    def __init__(
        self,
        project_root: Optional[Path] = None,
    ) -> None:
        if project_root is None:
            # Auto-detect: this file is at scripts/checks/security.py
            # so project root is three levels up
            self._project_root = Path(__file__).parent.parent.parent
        else:
            self._project_root = project_root

    @property
    def _compose_full_path(self) -> Path:
        return self._project_root / _COMPOSE_FULL_PATH

    @property
    def _realm_export_path(self) -> Path:
        return self._project_root / _REALM_EXPORT_PATH

    @property
    def _nginx_conf_candidates(self) -> list[Path]:
        return [self._project_root / p for p in _NGINX_CONF_CANDIDATES]

    def run(self) -> CheckResult:
        """Execute all security hardening checks and return a CheckResult."""
        all_details: list[str] = []
        all_failures: list[str] = []

        # ── 1. Scan .env files for dev placeholder secrets ────────────────────
        all_details.append("--- Scanning .env files for dev placeholder secrets ---")
        env_details, env_failures = scan_env_files(self._project_root)
        all_details.extend(env_details)
        all_failures.extend(env_failures)

        # ── 2. Check AUTH_DISABLED in docker-compose.full.yml ─────────────────
        all_details.append("--- Checking AUTH_DISABLED in docker-compose.full.yml ---")
        auth_details, auth_failures = check_auth_disabled(self._compose_full_path)
        all_details.extend(auth_details)
        all_failures.extend(auth_failures)

        # ── 3. Check Keycloak realm roles ─────────────────────────────────────
        all_details.append("--- Checking Keycloak realm roles ---")
        kc_details, kc_failures = check_keycloak_roles(self._realm_export_path)
        all_details.extend(kc_details)
        all_failures.extend(kc_failures)

        # ── 4. Check nginx CORS map ───────────────────────────────────────────
        all_details.append("--- Checking nginx CORS map ---")
        cors_details, cors_failures = check_nginx_cors(self._nginx_conf_candidates)
        all_details.extend(cors_details)
        all_failures.extend(cors_failures)

        # ── Determine overall status ─────────────────────────────────────────
        overall = Status.FAIL if all_failures else Status.PASS

        return CheckResult(
            dimension="Security Hardening",
            status=overall,
            details=all_details,
            failures=all_failures,
        )
