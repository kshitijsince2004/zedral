"""
checks/frontend.py — Frontend Switchover and Floor Console check.

Responsibilities (Requirements 4 & 9):
- Verify apps/ops-console/.env.example documents VITE_USE_MOCK,
  VITE_API_BASE_URL, and VITE_USE_SSE.
- Verify apps/floor-console/.env.example documents VITE_API_BASE_URL,
  VITE_USE_MOCK, and VITE_PLANT_ID.
- Inspect the Ops_Console source (apps/ops-console/src/) for the string
  "EnvValidationError" to confirm the throw when VITE_API_BASE_URL is missing.
- Run "npm run typecheck" in both app directories via subprocess and capture
  exit codes.
- Returns a CheckResult with dimension "Frontend Switchover".
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import Callable, Optional

from models import CheckResult, Status

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Project root is three levels up from this file:
# scripts/checks/frontend.py → scripts/checks/ → scripts/ → project root
_DEFAULT_PROJECT_ROOT = Path(__file__).parent.parent.parent

# Required env vars per app
_OPS_CONSOLE_REQUIRED_VARS: list[str] = [
    "VITE_USE_MOCK",
    "VITE_API_BASE_URL",
    "VITE_USE_SSE",
]

_FLOOR_CONSOLE_REQUIRED_VARS: list[str] = [
    "VITE_API_BASE_URL",
    "VITE_USE_MOCK",
    "VITE_PLANT_ID",
]

# String that must appear in the Ops_Console src/ directory
_ENV_VALIDATION_ERROR_STRING = "EnvValidationError"


# ---------------------------------------------------------------------------
# .env.example inspection
# ---------------------------------------------------------------------------

def check_env_example(
    env_example_path: Path,
    required_vars: list[str],
    app_label: str,
) -> tuple[list[str], list[str]]:
    """
    Verify that an .env.example file documents all required variable names.

    A variable is considered "documented" if its name appears anywhere in the
    file (as a key assignment or a comment).

    Parameters
    ----------
    env_example_path : Path
        Absolute path to the .env.example file.
    required_vars : list[str]
        Variable names that must appear in the file.
    app_label : str
        Human-readable label for the app (used in messages).

    Returns
    -------
    (details, failures) where details are informational lines and failures are
    failure messages.
    """
    details: list[str] = []
    failures: list[str] = []

    if not env_example_path.exists():
        failures.append(
            f"{app_label}: .env.example not found at {env_example_path}"
        )
        return details, failures

    try:
        content = env_example_path.read_text(encoding="utf-8")
    except Exception as exc:
        failures.append(f"{app_label}: could not read .env.example — {exc}")
        return details, failures

    for var in required_vars:
        if var in content:
            details.append(f"{app_label} .env.example: {var} documented ✓")
        else:
            failures.append(
                f"{app_label} .env.example: missing required variable {var!r}"
            )

    return details, failures


# ---------------------------------------------------------------------------
# EnvValidationError source inspection
# ---------------------------------------------------------------------------

def check_env_validation_error(
    ops_console_src: Path,
) -> tuple[list[str], list[str]]:
    """
    Search the Ops_Console src/ directory for the string "EnvValidationError".

    This confirms that the application throws an EnvValidationError when
    VITE_API_BASE_URL is missing (Requirement 4.2).

    Parameters
    ----------
    ops_console_src : Path
        Path to the apps/ops-console/src/ directory.

    Returns
    -------
    (details, failures)
    """
    details: list[str] = []
    failures: list[str] = []

    if not ops_console_src.exists():
        failures.append(
            f"Ops_Console src/ directory not found at {ops_console_src}"
        )
        return details, failures

    # Walk all files in src/ looking for the string
    found_in: list[str] = []
    try:
        for path in ops_console_src.rglob("*"):
            if not path.is_file():
                continue
            # Only inspect text-like files (TypeScript, JavaScript, TSX, JSX)
            if path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            if _ENV_VALIDATION_ERROR_STRING in text:
                # Record relative path for readability
                try:
                    rel = path.relative_to(ops_console_src.parent.parent)
                except ValueError:
                    rel = path
                found_in.append(str(rel))
    except Exception as exc:
        failures.append(
            f"Error scanning Ops_Console src/ for {_ENV_VALIDATION_ERROR_STRING}: {exc}"
        )
        return details, failures

    if found_in:
        details.append(
            f"Ops_Console: {_ENV_VALIDATION_ERROR_STRING!r} found in "
            + ", ".join(found_in)
            + " ✓"
        )
    else:
        failures.append(
            f"Ops_Console src/: {_ENV_VALIDATION_ERROR_STRING!r} not found — "
            "VITE_API_BASE_URL validation throw may be missing"
        )

    return details, failures


# ---------------------------------------------------------------------------
# npm typecheck runner
# ---------------------------------------------------------------------------

def _default_run_subprocess(
    cmd: list[str],
    cwd: Path,
) -> tuple[int, str, str]:
    """
    Run a subprocess command and return (returncode, stdout, stderr).

    This is the default implementation; tests can inject a replacement.
    """
    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=120,  # 2-minute timeout for typecheck
        )
        return result.returncode, result.stdout, result.stderr
    except FileNotFoundError:
        # npm (or the command) not found on PATH
        return -1, "", f"Command not found: {cmd[0]!r}"
    except subprocess.TimeoutExpired:
        return -1, "", f"Command timed out after 120 seconds: {' '.join(cmd)}"
    except Exception as exc:
        return -1, "", f"Unexpected error running {' '.join(cmd)}: {exc}"


def check_npm_typecheck(
    app_dir: Path,
    app_label: str,
    run_subprocess: Callable[[list[str], Path], tuple[int, str, str]],
) -> tuple[list[str], list[str]]:
    """
    Run "npm run typecheck" in the given app directory and check the exit code.

    Parameters
    ----------
    app_dir : Path
        Directory in which to run the typecheck command.
    app_label : str
        Human-readable label for the app (used in messages).
    run_subprocess : callable
        Callable with signature ``(cmd: list[str], cwd: Path) -> (returncode, stdout, stderr)``.

    Returns
    -------
    (details, failures)
    """
    details: list[str] = []
    failures: list[str] = []

    if not app_dir.exists():
        failures.append(
            f"{app_label}: app directory not found at {app_dir}"
        )
        return details, failures

    # On Windows, npm is npm.cmd; use shell=True via the subprocess wrapper
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    returncode, stdout, stderr = run_subprocess([npm_cmd, "run", "typecheck"], app_dir)

    if returncode == -1:
        # Command not found or other execution error
        error_msg = stderr.strip() or "unknown error"
        if "not found" in error_msg.lower() or "Command not found" in error_msg:
            failures.append(
                f"{app_label}: npm not found — cannot run typecheck. "
                "Ensure npm is installed and on PATH."
            )
        else:
            failures.append(
                f"{app_label}: typecheck failed to run — {error_msg}"
            )
    elif returncode == 0:
        details.append(f"{app_label}: npm run typecheck passed (exit 0) ✓")
    else:
        # Collect error output for the failure message
        error_output = (stderr.strip() or stdout.strip())[:500]
        failures.append(
            f"{app_label}: npm run typecheck failed (exit {returncode})"
            + (f" — {error_output}" if error_output else "")
        )

    return details, failures


# ---------------------------------------------------------------------------
# FrontendCheck class
# ---------------------------------------------------------------------------

class FrontendCheck:
    """
    Checks frontend switchover readiness for Ops_Console and Floor_Console.

    Parameters
    ----------
    project_root : Path, optional
        Root of the project (default: auto-detected from this file's location).
    run_subprocess : callable, optional
        Injected subprocess runner for testing. Signature:
        ``(cmd: list[str], cwd: Path) -> (returncode: int, stdout: str, stderr: str)``
        Defaults to a real subprocess.run wrapper.
    """

    def __init__(
        self,
        project_root: Optional[Path] = None,
        run_subprocess: Optional[
            Callable[[list[str], Path], tuple[int, str, str]]
        ] = None,
    ) -> None:
        self._project_root = project_root or _DEFAULT_PROJECT_ROOT
        self._run_subprocess = run_subprocess or _default_run_subprocess

    # ── Derived paths ────────────────────────────────────────────────────────

    @property
    def _ops_console_dir(self) -> Path:
        return self._project_root / "apps" / "ops-console"

    @property
    def _floor_console_dir(self) -> Path:
        return self._project_root / "apps" / "floor-console"

    @property
    def _ops_console_env_example(self) -> Path:
        return self._ops_console_dir / ".env.example"

    @property
    def _floor_console_env_example(self) -> Path:
        return self._floor_console_dir / ".env.example"

    @property
    def _ops_console_src(self) -> Path:
        return self._ops_console_dir / "src"

    # ── Main entry point ─────────────────────────────────────────────────────

    def run(self) -> CheckResult:
        """Execute all frontend checks and return a CheckResult."""
        all_details: list[str] = []
        all_failures: list[str] = []

        # ── 1. Ops_Console .env.example ──────────────────────────────────────
        details, failures = check_env_example(
            env_example_path=self._ops_console_env_example,
            required_vars=_OPS_CONSOLE_REQUIRED_VARS,
            app_label="Ops_Console",
        )
        all_details.extend(details)
        all_failures.extend(failures)

        # ── 2. Floor_Console .env.example ────────────────────────────────────
        details, failures = check_env_example(
            env_example_path=self._floor_console_env_example,
            required_vars=_FLOOR_CONSOLE_REQUIRED_VARS,
            app_label="Floor_Console",
        )
        all_details.extend(details)
        all_failures.extend(failures)

        # ── 3. EnvValidationError in Ops_Console src/ ────────────────────────
        details, failures = check_env_validation_error(
            ops_console_src=self._ops_console_src,
        )
        all_details.extend(details)
        all_failures.extend(failures)

        # ── 4. npm run typecheck — Ops_Console ───────────────────────────────
        details, failures = check_npm_typecheck(
            app_dir=self._ops_console_dir,
            app_label="Ops_Console",
            run_subprocess=self._run_subprocess,
        )
        all_details.extend(details)
        all_failures.extend(failures)

        # ── 5. npm run typecheck — Floor_Console ─────────────────────────────
        details, failures = check_npm_typecheck(
            app_dir=self._floor_console_dir,
            app_label="Floor_Console",
            run_subprocess=self._run_subprocess,
        )
        all_details.extend(details)
        all_failures.extend(failures)

        # ── Determine overall status ─────────────────────────────────────────
        overall = Status.FAIL if all_failures else Status.PASS

        return CheckResult(
            dimension="Frontend Switchover",
            status=overall,
            details=all_details,
            failures=all_failures,
        )
