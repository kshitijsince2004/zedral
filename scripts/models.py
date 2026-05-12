"""
Core data models for the Deploy Readiness Audit runner.
"""
from dataclasses import dataclass, field
from enum import Enum


class Status(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    SKIP = "SKIP"


@dataclass
class CheckResult:
    dimension: str          # e.g. "Backend Health"
    status: Status
    details: list[str]      # human-readable lines explaining the result
    failures: list[str]     # specific failure messages (empty on PASS)


@dataclass
class ChecklistReport:
    timestamp: str
    git_sha: str
    environment: str
    results: list[CheckResult] = field(default_factory=list)

    @property
    def gate_open(self) -> bool:
        """Return True if no result has status FAIL, False otherwise."""
        return all(r.status != Status.FAIL for r in self.results)
