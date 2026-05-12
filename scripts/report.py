"""
ReportBuilder — formats and writes the deploy readiness checklist report.

Responsibilities:
- Format ChecklistReport as a table with columns: Dimension, Status, Notes
- Print DEPLOYMENT GATE: OPEN (exit 0) or DEPLOYMENT GATE: BLOCKED — N items failed (exit 1)
- Write report to deploy-readiness-<timestamp>.txt in the project root
- Log to stderr on write failure but still print to stdout
- Include timestamp, Git SHA, and environment name in the report header
"""
import sys
import os
from pathlib import Path

from models import ChecklistReport, Status

# Column widths for the table
_DIM_WIDTH = 22
_STATUS_WIDTH = 7
_SEPARATOR = "─" * 61
_BORDER = "=" * 61


class ReportBuilder:
    """Formats a ChecklistReport and writes it to stdout and a file."""

    def __init__(self, report: ChecklistReport, project_root: str | None = None):
        """
        Args:
            report: The ChecklistReport to format.
            project_root: Directory where the report file is written.
                          Defaults to the repository root (two levels up from
                          this file: scripts/ → project root).
        """
        self._report = report
        if project_root is None:
            # scripts/report.py → scripts/ → project root
            self._project_root = Path(__file__).parent.parent
        else:
            self._project_root = Path(project_root)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def build(self) -> str:
        """Return the full report as a string."""
        lines: list[str] = []

        # Header
        lines.append(_BORDER)
        lines.append("ZEDRAL DEPLOY READINESS AUDIT")
        lines.append(f"Timestamp  : {self._report.timestamp}")
        lines.append(f"Git SHA    : {self._report.git_sha}")
        lines.append(f"Environment: {self._report.environment}")
        lines.append(_BORDER)
        lines.append("")

        # Table header
        lines.append(
            f"{'Dimension':<{_DIM_WIDTH}} {'Status':<{_STATUS_WIDTH}} Notes"
        )
        lines.append(_SEPARATOR)

        # Table rows
        for result in self._report.results:
            notes = "; ".join(result.failures) if result.failures else ""
            lines.append(
                f"{result.dimension:<{_DIM_WIDTH}} {result.status.value:<{_STATUS_WIDTH}} {notes}".rstrip()
            )

        lines.append("")
        lines.append(_SEPARATOR)

        # Gate verdict
        if self._report.gate_open:
            lines.append("DEPLOYMENT GATE: OPEN")
        else:
            fail_count = sum(
                1 for r in self._report.results if r.status == Status.FAIL
            )
            lines.append(f"DEPLOYMENT GATE: BLOCKED — {fail_count} items failed")

        lines.append(_BORDER)

        return "\n".join(lines)

    def print_report(self) -> None:
        """Print the report to stdout."""
        print(self.build())

    def write_report(self) -> None:
        """
        Write the report to deploy-readiness-<timestamp>.txt in the project root.

        On write failure, logs the error to stderr but does NOT raise — the
        caller should still print to stdout and exit with the appropriate code.
        """
        # Sanitise the timestamp so it is safe as a filename component
        safe_ts = self._report.timestamp.replace(":", "-").replace("+", "_")
        filename = f"deploy-readiness-{safe_ts}.txt"
        filepath = self._project_root / filename

        try:
            filepath.write_text(self.build(), encoding="utf-8")
        except OSError as exc:
            print(
                f"[ReportBuilder] WARNING: could not write report file "
                f"'{filepath}': {exc}",
                file=sys.stderr,
            )

    def exit_code(self) -> int:
        """Return 0 if the gate is open, 1 if blocked."""
        return 0 if self._report.gate_open else 1

    def run(self) -> int:
        """
        Full lifecycle: build report, print to stdout, write to file.

        Returns the exit code (0 = OPEN, 1 = BLOCKED).
        """
        self.print_report()
        self.write_report()
        return self.exit_code()
