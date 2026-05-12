"""
Property-based tests for report gate logic.

# Feature: deploy-readiness-audit, Property 15: Report gate logic correctness

For any list of CheckResult objects:
- If the list contains at least one result with status == FAIL,
  gate_open must be False.
- If no result has status == FAIL, gate_open must be True.

Validates: Requirements 10.2, 10.3
"""
from hypothesis import given, settings
from hypothesis import strategies as st

from scripts.models import ChecklistReport, CheckResult, Status

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

status_strategy = st.sampled_from(Status)

check_result_strategy = st.builds(
    CheckResult,
    dimension=st.text(min_size=1, max_size=50),
    status=status_strategy,
    details=st.lists(st.text(max_size=100), max_size=5),
    failures=st.lists(st.text(max_size=100), max_size=5),
)

checklist_report_strategy = st.builds(
    ChecklistReport,
    timestamp=st.text(min_size=1, max_size=30),
    git_sha=st.text(min_size=1, max_size=40),
    environment=st.text(min_size=1, max_size=30),
    results=st.lists(check_result_strategy, max_size=20),
)


# ---------------------------------------------------------------------------
# Property 15: Report gate logic correctness
# ---------------------------------------------------------------------------

@given(checklist_report_strategy)
@settings(max_examples=100)
def test_gate_open_false_when_any_fail(report: ChecklistReport):
    """
    # Feature: deploy-readiness-audit, Property 15: Report gate logic correctness

    If any result has status FAIL, gate_open must be False.

    Validates: Requirements 10.2, 10.3
    """
    has_fail = any(r.status == Status.FAIL for r in report.results)
    if has_fail:
        assert report.gate_open is False


@given(checklist_report_strategy)
@settings(max_examples=100)
def test_gate_open_true_when_no_fail(report: ChecklistReport):
    """
    # Feature: deploy-readiness-audit, Property 15: Report gate logic correctness

    If no result has status FAIL, gate_open must be True.

    Validates: Requirements 10.2, 10.3
    """
    has_fail = any(r.status == Status.FAIL for r in report.results)
    if not has_fail:
        assert report.gate_open is True


@given(
    st.lists(check_result_strategy, min_size=1, max_size=20).filter(
        lambda results: any(r.status == Status.FAIL for r in results)
    )
)
@settings(max_examples=100)
def test_gate_blocked_when_results_contain_fail(results: list):
    """
    # Feature: deploy-readiness-audit, Property 15: Report gate logic correctness

    Directly test: a report built from a list that contains at least one FAIL
    must have gate_open == False.

    Validates: Requirements 10.2, 10.3
    """
    report = ChecklistReport(
        timestamp="2025-01-01T00:00:00",
        git_sha="deadbeef",
        environment="test",
        results=results,
    )
    assert report.gate_open is False


@given(
    st.lists(
        st.builds(
            CheckResult,
            dimension=st.text(min_size=1, max_size=50),
            status=st.sampled_from([Status.PASS, Status.SKIP]),
            details=st.lists(st.text(max_size=100), max_size=5),
            failures=st.lists(st.text(max_size=100), max_size=5),
        ),
        max_size=20,
    )
)
@settings(max_examples=100)
def test_gate_open_when_results_contain_no_fail(results: list):
    """
    # Feature: deploy-readiness-audit, Property 15: Report gate logic correctness

    Directly test: a report built from a list with only PASS/SKIP results
    must have gate_open == True.

    Validates: Requirements 10.2, 10.3
    """
    report = ChecklistReport(
        timestamp="2025-01-01T00:00:00",
        git_sha="deadbeef",
        environment="test",
        results=results,
    )
    assert report.gate_open is True


# ---------------------------------------------------------------------------
# Property 16: Report metadata completeness
# ---------------------------------------------------------------------------

# Feature: deploy-readiness-audit, Property 16: Report metadata completeness
#
# For any generated report, the report text SHALL contain a non-empty timestamp
# string, a non-empty Git SHA string, and a non-empty environment name string —
# all three fields are always present regardless of check outcomes.
#
# Validates: Requirements 10.4

from scripts.report import ReportBuilder


@given(
    st.builds(
        ChecklistReport,
        timestamp=st.text(min_size=1, max_size=50).filter(str.strip),
        git_sha=st.text(min_size=1, max_size=40).filter(str.strip),
        environment=st.text(min_size=1, max_size=50).filter(str.strip),
        results=st.lists(check_result_strategy, max_size=20),
    )
)
@settings(max_examples=100)
def test_report_metadata_completeness(report: ChecklistReport):
    """
    # Feature: deploy-readiness-audit, Property 16: Report metadata completeness

    For any generated report, the report text SHALL contain a non-empty timestamp
    string, a non-empty Git SHA string, and a non-empty environment name string.

    Validates: Requirements 10.4
    """
    text = ReportBuilder(report).build()

    # All three metadata fields must appear verbatim in the report text
    assert report.timestamp in text, (
        f"Timestamp '{report.timestamp}' not found in report"
    )
    assert report.git_sha in text, (
        f"Git SHA '{report.git_sha}' not found in report"
    )
    assert report.environment in text, (
        f"Environment '{report.environment}' not found in report"
    )
