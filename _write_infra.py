from pathlib import Path

content = r'''"""
checks/infrastructure.py — Infrastructure and Docker Readiness check.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Optional

try:
    import yaml
    _YAML_AVAILABLE = True
except ImportError:
    _YAML_AVAILABLE = False

from scripts.models import CheckResult, Status

CUSTOM_SERVICES = {
    "m2-master",
    "m1-demand",
    "m5a-material",
    "m6-dispatch",
    "nginx-gateway",
}

EXPECTED_CONTAINERS = [
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

REQUIRED_ENV_VARS = [
    "EVENT_SIGNING_SECRET",
    "PLANT_ID",
    "CORS_ORIGINS",
    "AUTH_DISABLED",
    "POSTGRES_PASSWORD",
    "POSTGRES_USER",
    "POSTGRES_DB",
]

SERVICES_REQUIRING_HEALTHY_DEPENDS = {
    "m1-demand": {"postgres", "redpanda"},
    "m5a-material": {"postgres", "redpanda"},
    "m6-dispatch": {"postgres", "redpanda"},
    "m2-master": {"postgres", "redpanda"},
    "nginx-gateway": {"m2-master", "m6-dispatch"},
}

_COMPOSE_FULL_PATH = Path("infra") / "docker-compose.full.yml"
_COMPOSE_BASE_PATH = Path("infra") / "docker-compose.yml"
_ENV_EXAMPLE_PATH = Path("infra") / ".env.example"


def check_container_states(
    containers: list,
    run_subprocess=None,
) -> tuple:
    details: list = []
    failures: list = []

    if run_subprocess is None:
        def run_subprocess(args):
            result = subprocess.run(args, capture_output=True, text=True, timeout=30)
            return result.returncode, result.stdout, result.stderr

    for name in containers:
        try:
            rc, stdout, stderr = run_subprocess(
                ["docker", "inspect", "--format", "{{json .State}}", name]
            )
        except FileNotFoundError:
            failures.append("docker command not found — cannot inspect containers")
            return