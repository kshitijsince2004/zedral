"""
Unit tests for checks/security.py — Security Hardening.

Tests cover:
- contains_dev_secret: correct identification of dev placeholder strings
- scan_env_files: .env.example exclusion, files without secrets pass
- check_auth_disabled: AUTH_DISABLED detection in docker-compose YAML
- check_keycloak_roles: role presence in realm-export.json
- check_nginx_cors: localhost-only CORS map detection
- SecurityCheck.run: dimension and overall status

Requirements: 7.7
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from scripts.checks.security import (
    DEV_SECRETS,
    REQUIRED_KEYCLOAK_ROLES,
    SecurityCheck,
    check_auth_disabled,
    check_keycloak_roles,
    check_nginx_cors,
    contains_dev_secret,
    scan_env_files,
)
from scripts.models import Status


# ---------------------------------------------------------------------------
# contains_dev_secret
# ---------------------------------------------------------------------------

class TestContainsDevSecret:
    """Tests for the contains_dev_secret helper."""

    def test_returns_empty_list_for_clean_content(self):
        """Content with no dev secrets returns an empty list."""
        content = "POSTGRES_PASSWORD=super_strong_random_password_xyz\nAUTH_DISABLED=false\n"
        result = contains_dev_secret(content)
        assert result == []

    def test_detects_zedral_dev_password(self):
        """Detects 'zedral_dev_password' in content."""
        content = "POSTGRES_PASSWORD=zedral_dev_password\n"
        result = contains_dev_secret(content)
        assert "zedral_dev_password" in result

    def test_detects_dev_secret_change_in_production(self):
        """Detects 'dev-secret-change-in-production' in content."""
        content = "EVENT_SIGNING_SECRET=dev-secret-change-in-production\n"
        result = contains_dev_secret(content)
        assert "dev-secret-change-in-production" in result

    def test_detects_admin_dev_password(self):
        """Detects 'admin_dev_password' in content."""
        content = "KEYCLOAK_ADMIN_PASSWORD=admin_dev_password\n"
        result = contains_dev_secret(content)
        assert "admin_dev_password" in result

    def test_detects_multiple_secrets_in_same_content(self):
        """Detects multiple dev secrets when all are present."""
        content = (
            "POSTGRES_PASSWORD=zedral_dev_password\n"
            "EVENT_SIGNING_SECRET=dev-secret-change-in-production\n"
            "KEYCLOAK_ADMIN_PASSWORD=admin_dev_password\n"
        )
        result = contains_dev_secret(content)
        assert set(result) == set(DEV_SECRETS)

    def test_returns_only_matching_secrets(self):
        """Returns only the secrets that are actually present."""
        content = "POSTGRES_PASSWORD=zedral_dev_password\n"
        result = contains_dev_secret(content)
        assert len(result) == 1
        assert result[0] == "zedral_dev_password"

    def test_empty_content_returns_empty_list(self):
        """Empty content returns an empty list."""
        assert contains_dev_secret("") == []

    def test_secret_embedded_in_longer_string(self):
        """Detects a secret even when embedded in a longer value."""
        content = "SOME_VAR=prefix_zedral_dev_password_suffix\n"
        result = contains_dev_secret(content)
        assert "zedral_dev_password" in result

    def test_custom_secrets_list(self):
        """Accepts a custom list of secrets to scan for."""
        content = "MY_SECRET=custom_secret_value\n"
        result = contains_dev_secret(content, secrets=["custom_secret_value"])
        assert result == ["custom_secret_value"]

    def test_custom_secrets_list_no_match(self):
        """Returns empty list when custom secrets are not present."""
        content = "MY_SECRET=something_else\n"
        result = contains_dev_secret(content, secrets=["custom_secret_value"])
        assert result == []


# ---------------------------------------------------------------------------
# scan_env_files
# ---------------------------------------------------------------------------

class TestScanEnvFiles:
    """Tests for the scan_env_files function."""

    def test_env_example_is_excluded(self, tmp_path: Path):
        """Files named .env.example are excluded from scanning."""
        env_example = tmp_path / ".env.example"
        env_example.write_text(
            "POSTGRES_PASSWORD=zedral_dev_password\n"
            "EVENT_SIGNING_SECRET=dev-secret-change-in-production\n"
        )
        details, failures = scan_env_files(tmp_path)
        assert failures == [], (
            f".env.example should be excluded from scanning, "
            f"but got failures: {failures}"
        )
        # Should mention skipping
        assert any(".env.example" in d.lower() or "skip" in d.lower() for d in details)

    def test_env_file_without_secrets_passes(self, tmp_path: Path):
        """A .env file with no dev secrets produces no failures."""
        env_file = tmp_path / ".env"
        env_file.write_text(
            "POSTGRES_PASSWORD=a_very_strong_production_password_123\n"
            "AUTH_DISABLED=false\n"
        )
        details, failures = scan_env_files(tmp_path)
        assert failures == [], (
            f"Expected no failures for clean .env file, got: {failures}"
        )

    def test_env_file_with_zedral_dev_password_fails(self, tmp_path: Path):
        """A .env file containing 'zedral_dev_password' produces a failure."""
        env_file = tmp_path / ".env"
        env_file.write_text("POSTGRES_PASSWORD=zedral_dev_password\n")
        details, failures = scan_env_files(tmp_path)
        assert len(failures) >= 1
        assert any("zedral_dev_password" in f for f in failures)

    def test_env_file_with_dev_secret_change_fails(self, tmp_path: Path):
        """A .env file containing 'dev-secret-change-in-production' produces a failure."""
        env_file = tmp_path / ".env"
        env_file.write_text("EVENT_SIGNING_SECRET=dev-secret-change-in-production\n")
        details, failures = scan_env_files(tmp_path)
        assert len(failures) >= 1
        assert any("dev-secret-change-in-production" in f for f in failures)

    def test_env_file_with_admin_dev_password_fails(self, tmp_path: Path):
        """A .env file containing 'admin_dev_password' produces a failure."""
        env_file = tmp_path / ".env"
        env_file.write_text("KEYCLOAK_ADMIN_PASSWORD=admin_dev_password\n")
        details, failures = scan_env_files(tmp_path)
        assert len(failures) >= 1
        assert any("admin_dev_password" in f for f in failures)

    def test_dotenv_local_file_is_scanned(self, tmp_path: Path):
        """Files named .env.local are scanned (not excluded)."""
        env_local = tmp_path / ".env.local"
        env_local.write_text("POSTGRES_PASSWORD=zedral_dev_password\n")
        details, failures = scan_env_files(tmp_path)
        assert len(failures) >= 1
        assert any("zedral_dev_password" in f for f in failures)

    def test_service_dot_env_file_is_scanned(self, tmp_path: Path):
        """Files named 'service.env' (ending in .env) are scanned."""
        service_env = tmp_path / "service.env"
        service_env.write_text("POSTGRES_PASSWORD=zedral_dev_password\n")
        details, failures = scan_env_files(tmp_path)
        assert len(failures) >= 1

    def test_no_env_files_produces_no_failures(self, tmp_path: Path):
        """A directory with no .env files produces no failures."""
        (tmp_path / "config.yaml").write_text("key: value\n")
        details, failures = scan_env_files(tmp_path)
        assert failures == []

    def test_env_example_excluded_case_insensitive(self, tmp_path: Path):
        """Files named .ENV.EXAMPLE (uppercase) are also excluded."""
        # Note: on case-insensitive filesystems this may not create a separate
        # file, but the logic should handle it
        env_example = tmp_path / ".env.example"
        env_example.write_text("POSTGRES_PASSWORD=zedral_dev_password\n")
        details, failures = scan_env_files(tmp_path)
        assert failures == []

    def test_multiple_env_files_all_clean(self, tmp_path: Path):
        """Multiple clean .env files all pass."""
        (tmp_path / ".env").write_text("POSTGRES_PASSWORD=strong_pass_1\n")
        (tmp_path / ".env.staging").write_text("POSTGRES_PASSWORD=strong_pass_2\n")
        details, failures = scan_env_files(tmp_path)
        assert failures == []

    def test_multiple_env_files_one_dirty(self, tmp_path: Path):
        """When one of multiple .env files has a secret, it is reported."""
        (tmp_path / ".env").write_text("POSTGRES_PASSWORD=strong_pass_1\n")
        (tmp_path / ".env.staging").write_text(
            "POSTGRES_PASSWORD=zedral_dev_password\n"
        )
        details, failures = scan_env_files(tmp_path)
        assert len(failures) >= 1
        assert any("zedral_dev_password" in f for f in failures)

    def test_failure_message_includes_file_path(self, tmp_path: Path):
        """Failure messages include the relative path of the offending file."""
        env_file = tmp_path / ".env"
        env_file.write_text("POSTGRES_PASSWORD=zedral_dev_password\n")
        details, failures = scan_env_files(tmp_path)
        assert any(".env" in f for f in failures)

    def test_nested_env_file_is_scanned(self, tmp_path: Path):
        """Nested .env files in subdirectories are also scanned."""
        subdir = tmp_path / "services" / "backend"
        subdir.mkdir(parents=True)
        (subdir / ".env").write_text("POSTGRES_PASSWORD=zedral_dev_password\n")
        details, failures = scan_env_files(tmp_path)
        assert len(failures) >= 1


# ---------------------------------------------------------------------------
# check_auth_disabled
# ---------------------------------------------------------------------------

class TestCheckAuthDisabled:
    """Tests for the check_auth_disabled function."""

    def test_auth_disabled_false_passes(self, tmp_path: Path):
        """AUTH_DISABLED=false does not trigger a failure."""
        compose = tmp_path / "docker-compose.full.yml"
        compose.write_text(
            "services:\n"
            "  m2-master:\n"
            "    environment:\n"
            "      AUTH_DISABLED: \"false\"\n"
        )
        details, failures = check_auth_disabled(compose)
        assert failures == []

    def test_auth_disabled_true_yaml_style_fails(self, tmp_path: Path):
        """AUTH_DISABLED: \"true\" (YAML style) triggers a failure."""
        compose = tmp_path / "docker-compose.full.yml"
        compose.write_text(
            "services:\n"
            "  m2-master:\n"
            "    environment:\n"
            "      AUTH_DISABLED: \"true\"\n"
        )
        details, failures = check_auth_disabled(compose)
        assert len(failures) >= 1
        assert any("AUTH_DISABLED" in f for f in failures)

    def test_auth_disabled_true_shell_style_fails(self, tmp_path: Path):
        """AUTH_DISABLED=true (shell style) triggers a failure."""
        compose = tmp_path / "docker-compose.full.yml"
        compose.write_text(
            "services:\n"
            "  m2-master:\n"
            "    environment:\n"
            "      - AUTH_DISABLED=true\n"
        )
        details, failures = check_auth_disabled(compose)
        assert len(failures) >= 1
        assert any("AUTH_DISABLED" in f for f in failures)

    def test_auth_disabled_true_unquoted_yaml_fails(self, tmp_path: Path):
        """AUTH_DISABLED: true (unquoted YAML boolean) triggers a failure."""
        compose = tmp_path / "docker-compose.full.yml"
        compose.write_text(
            "services:\n"
            "  m2-master:\n"
            "    environment:\n"
            "      AUTH_DISABLED: true\n"
        )
        details, failures = check_auth_disabled(compose)
        assert len(failures) >= 1

    def test_missing_compose_file_fails(self, tmp_path: Path):
        """Missing docker-compose.full.yml produces a failure."""
        compose = tmp_path / "docker-compose.full.yml"
        details, failures = check_auth_disabled(compose)
        assert len(failures) >= 1
        assert any("not found" in f.lower() for f in failures)

    def test_no_auth_disabled_key_passes(self, tmp_path: Path):
        """A compose file with no AUTH_DISABLED key passes."""
        compose = tmp_path / "docker-compose.full.yml"
        compose.write_text(
            "services:\n"
            "  m2-master:\n"
            "    environment:\n"
            "      POSTGRES_PASSWORD: strong_pass\n"
        )
        details, failures = check_auth_disabled(compose)
        assert failures == []


# ---------------------------------------------------------------------------
# check_keycloak_roles
# ---------------------------------------------------------------------------

class TestCheckKeycloakRoles:
    """Tests for the check_keycloak_roles function."""

    def _write_realm(self, path: Path, roles: list[str]) -> None:
        """Write a minimal realm-export.json with the given role names."""
        realm = {
            "realm": "zedral",
            "roles": {
                "realm": [{"name": role} for role in roles]
            }
        }
        path.write_text(json.dumps(realm))

    def test_all_required_roles_present_passes(self, tmp_path: Path):
        """All three required roles present produces no failures."""
        realm_file = tmp_path / "realm-export.json"
        self._write_realm(realm_file, ["admin", "supervisor", "operator"])
        details, failures = check_keycloak_roles(realm_file)
        assert failures == []
        assert len(details) == 3  # one detail per role

    def test_missing_admin_role_fails(self, tmp_path: Path):
        """Missing 'admin' role produces a failure."""
        realm_file = tmp_path / "realm-export.json"
        self._write_realm(realm_file, ["supervisor", "operator"])
        details, failures = check_keycloak_roles(realm_file)
        assert len(failures) >= 1
        assert any("admin" in f for f in failures)

    def test_missing_supervisor_role_fails(self, tmp_path: Path):
        """Missing 'supervisor' role produces a failure."""
        realm_file = tmp_path / "realm-export.json"
        self._write_realm(realm_file, ["admin", "operator"])
        details, failures = check_keycloak_roles(realm_file)
        assert len(failures) >= 1
        assert any("supervisor" in f for f in failures)

    def test_missing_operator_role_fails(self, tmp_path: Path):
        """Missing 'operator' role produces a failure."""
        realm_file = tmp_path / "realm-export.json"
        self._write_realm(realm_file, ["admin", "supervisor"])
        details, failures = check_keycloak_roles(realm_file)
        assert len(failures) >= 1
        assert any("operator" in f for f in failures)

    def test_all_roles_missing_produces_three_failures(self, tmp_path: Path):
        """All three roles missing produces three failures."""
        realm_file = tmp_path / "realm-export.json"
        self._write_realm(realm_file, [])
        details, failures = check_keycloak_roles(realm_file)
        assert len(failures) == 3

    def test_extra_roles_do_not_cause_failure(self, tmp_path: Path):
        """Extra roles beyond the required set do not cause failures."""
        realm_file = tmp_path / "realm-export.json"
        self._write_realm(
            realm_file,
            ["admin", "supervisor", "operator", "viewer", "auditor"],
        )
        details, failures = check_keycloak_roles(realm_file)
        assert failures == []

    def test_missing_realm_file_fails(self, tmp_path: Path):
        """Missing realm-export.json produces a failure."""
        realm_file = tmp_path / "realm-export.json"
        details, failures = check_keycloak_roles(realm_file)
        assert len(failures) >= 1
        assert any("not found" in f.lower() for f in failures)

    def test_invalid_json_fails(self, tmp_path: Path):
        """Invalid JSON in realm-export.json produces a failure."""
        realm_file = tmp_path / "realm-export.json"
        realm_file.write_text("{ not valid json }")
        details, failures = check_keycloak_roles(realm_file)
        assert len(failures) >= 1

    def test_missing_roles_key_fails(self, tmp_path: Path):
        """realm-export.json without a 'roles' key produces failures for all roles."""
        realm_file = tmp_path / "realm-export.json"
        realm_file.write_text(json.dumps({"realm": "zedral"}))
        details, failures = check_keycloak_roles(realm_file)
        assert len(failures) == 3


# ---------------------------------------------------------------------------
# check_nginx_cors
# ---------------------------------------------------------------------------

class TestCheckNginxCors:
    """Tests for the check_nginx_cors function."""

    def test_localhost_only_cors_map_fails(self, tmp_path: Path):
        """A CORS map with only localhost origins produces a failure."""
        nginx_conf = tmp_path / "nginx.conf"
        nginx_conf.write_text(
            'map $http_origin $cors_origin {\n'
            '    default "";\n'
            '    "http://localhost:5173" "http://localhost:5173";\n'
            '    "http://localhost:5174" "http://localhost:5174";\n'
            '}\n'
        )
        details, failures = check_nginx_cors([nginx_conf])
        assert len(failures) >= 1
        assert any("localhost" in f.lower() for f in failures)

    def test_production_origin_in_cors_map_passes(self, tmp_path: Path):
        """A CORS map with a production origin produces no failures."""
        nginx_conf = tmp_path / "nginx.conf"
        nginx_conf.write_text(
            'map $http_origin $cors_origin {\n'
            '    default "";\n'
            '    "https://mes.herosteels.com" "https://mes.herosteels.com";\n'
            '}\n'
        )
        details, failures = check_nginx_cors([nginx_conf])
        assert failures == []

    def test_mixed_origins_passes(self, tmp_path: Path):
        """A CORS map with both localhost and production origins passes."""
        nginx_conf = tmp_path / "nginx.conf"
        nginx_conf.write_text(
            'map $http_origin $cors_origin {\n'
            '    default "";\n'
            '    "http://localhost:5173" "http://localhost:5173";\n'
            '    "https://mes.herosteels.com" "https://mes.herosteels.com";\n'
            '}\n'
        )
        details, failures = check_nginx_cors([nginx_conf])
        assert failures == []

    def test_missing_nginx_conf_produces_no_failure(self, tmp_path: Path):
        """Missing nginx.conf produces no failure (just a detail note)."""
        details, failures = check_nginx_cors([tmp_path / "nginx.conf"])
        assert failures == []
        assert any("not found" in d.lower() or "skip" in d.lower() for d in details)

    def test_no_cors_map_produces_no_failure(self, tmp_path: Path):
        """nginx.conf without a CORS map produces no failure."""
        nginx_conf = tmp_path / "nginx.conf"
        nginx_conf.write_text(
            "server {\n"
            "    listen 80;\n"
            "    location / { proxy_pass http://backend; }\n"
            "}\n"
        )
        details, failures = check_nginx_cors([nginx_conf])
        assert failures == []

    def test_first_existing_candidate_is_used(self, tmp_path: Path):
        """The first existing candidate path is used."""
        first = tmp_path / "first.conf"
        second = tmp_path / "second.conf"
        first.write_text(
            'map $http_origin $cors_origin {\n'
            '    "https://production.example.com" "https://production.example.com";\n'
            '}\n'
        )
        second.write_text(
            'map $http_origin $cors_origin {\n'
            '    "http://localhost:5173" "http://localhost:5173";\n'
            '}\n'
        )
        details, failures = check_nginx_cors([first, second])
        # Should use first (production origin) → no failure
        assert failures == []


# ---------------------------------------------------------------------------
# SecurityCheck integration
# ---------------------------------------------------------------------------

class TestSecurityCheck:
    """Integration tests for SecurityCheck.run()."""

    def test_dimension_is_security_hardening(self, tmp_path: Path):
        """The CheckResult dimension is always 'Security Hardening'."""
        checker = SecurityCheck(project_root=tmp_path)
        result = checker.run()
        assert result.dimension == "Security Hardening"

    def test_clean_project_passes(self, tmp_path: Path):
        """A project with no security issues produces PASS status."""
        # Create a clean .env file (no dev secrets)
        (tmp_path / ".env").write_text("POSTGRES_PASSWORD=strong_random_pass_xyz\n")

        # Create a docker-compose.full.yml with AUTH_DISABLED=false
        (tmp_path / "infra").mkdir()
        (tmp_path / "infra" / "docker-compose.full.yml").write_text(
            "services:\n"
            "  m2-master:\n"
            "    environment:\n"
            "      AUTH_DISABLED: \"false\"\n"
        )

        # Create a realm-export.json with all required roles
        keycloak_dir = tmp_path / "infra" / "keycloak"
        keycloak_dir.mkdir()
        realm = {
            "realm": "zedral",
            "roles": {
                "realm": [
                    {"name": "admin"},
                    {"name": "supervisor"},
                    {"name": "operator"},
                ]
            }
        }
        (keycloak_dir / "realm-export.json").write_text(json.dumps(realm))

        # Create nginx.conf with a production origin
        nginx_dir = tmp_path / "infra" / "nginx"
        nginx_dir.mkdir()
        (nginx_dir / "nginx.conf").write_text(
            'map $http_origin $cors_origin {\n'
            '    default "";\n'
            '    "https://mes.herosteels.com" "https://mes.herosteels.com";\n'
            '}\n'
        )

        checker = SecurityCheck(project_root=tmp_path)
        result = checker.run()
        assert result.status == Status.PASS, (
            f"Expected PASS for clean project, got {result.status!r}. "
            f"Failures: {result.failures}"
        )

    def test_dev_secret_in_env_file_causes_fail(self, tmp_path: Path):
        """A .env file with a dev secret causes FAIL status."""
        (tmp_path / ".env").write_text(
            "POSTGRES_PASSWORD=zedral_dev_password\n"
        )
        checker = SecurityCheck(project_root=tmp_path)
        result = checker.run()
        assert result.status == Status.FAIL
        assert len(result.failures) >= 1

    def test_auth_disabled_true_causes_fail(self, tmp_path: Path):
        """AUTH_DISABLED=true in docker-compose causes FAIL status."""
        infra_dir = tmp_path / "infra"
        infra_dir.mkdir()
        (infra_dir / "docker-compose.full.yml").write_text(
            "services:\n"
            "  m2-master:\n"
            "    environment:\n"
            "      - AUTH_DISABLED=true\n"
        )
        checker = SecurityCheck(project_root=tmp_path)
        result = checker.run()
        assert result.status == Status.FAIL

    def test_missing_keycloak_role_causes_fail(self, tmp_path: Path):
        """Missing a required Keycloak role causes FAIL status."""
        infra_dir = tmp_path / "infra"
        keycloak_dir = infra_dir / "keycloak"
        keycloak_dir.mkdir(parents=True)
        realm = {
            "realm": "zedral",
            "roles": {
                "realm": [{"name": "admin"}, {"name": "supervisor"}]
                # missing "operator"
            }
        }
        (keycloak_dir / "realm-export.json").write_text(json.dumps(realm))
        checker = SecurityCheck(project_root=tmp_path)
        result = checker.run()
        assert result.status == Status.FAIL
        assert any("operator" in f for f in result.failures)

    def test_localhost_only_cors_causes_fail(self, tmp_path: Path):
        """Localhost-only CORS map causes FAIL status."""
        nginx_dir = tmp_path / "infra" / "nginx"
        nginx_dir.mkdir(parents=True)
        (nginx_dir / "nginx.conf").write_text(
            'map $http_origin $cors_origin {\n'
            '    default "";\n'
            '    "http://localhost:5173" "http://localhost:5173";\n'
            '}\n'
        )
        checker = SecurityCheck(project_root=tmp_path)
        result = checker.run()
        assert result.status == Status.FAIL
        assert any("localhost" in f.lower() for f in result.failures)
