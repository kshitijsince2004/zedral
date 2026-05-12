"""
Property-based tests for audit_runner orchestration logic.

# Feature: deploy-readiness-audit, Property 17: Infrastructure-dependent checks skip when stack unreachable

For any check marked as infrastructure_dependent, when the Docker Compose stack
is unreachable (connection refused on all service ports), that check's result
SHALL have status == SKIP — never FAIL — and the report SHALL note that the
stack must be running for a full audit.

Validates: Requirements 10.6
"""
from hypothesis import given, settings
from hypothesis import strategies as st
from unittest.mock import MagicMock, patch

from scripts.models import CheckResult, Status


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Infrastructure-dependent check names (from the design)
INFRA_DEPENDENT_CHECKS = [
    "Backend Health",
    "DB Schema",
    "API Contracts",
    "Event Messaging",
]

# Static check names (always run regardless of stack state)
STATIC_CHECKS = [
    "Frontend Switchover",
    "Test Coverage",
    "Security Hardening",
    "Infrastructure",
]


# ---------------------------------------------------------------------------
# Property 17: Infrastructure-dependent checks skip when stack unreachable
# ---------------------------------------------------------------------------

@given(
    # Generate a random subset of infrastructure-dependent checks
    infra_checks=st.lists(
        st.sampled_from(INFRA_DEPENDENT_CHECKS),
        min_size=1,
        max_size=len(INFRA_DEPENDENT_CHECKS),
        unique=True,
    ),
    # Generate a random subset of static checks
    static_checks=st.lists(
        st.sampled_from(STATIC_CHECKS),
        min_size=0,
        max_size=len(STATIC_CHECKS),
        unique=True,
    ),
)
@settings(max_examples=100, deadline=None)
def test_pbt_skip_when_unreachable(infra_checks, static_checks):
    """
    # Feature: deploy-readiness-audit, Property 17: Infrastructure-dependent checks skip when stack unreachable

    When the stack is unreachable (connection refused), all infrastructure-dependent
    checks should produce SKIP status, never FAIL.

    Validates: Requirements 10.6
    """
    # Import here to avoid circular dependencies during module load
    from scripts.audit_runner import (
        is_stack_reachable,
        run_checks,
        INFRASTRUCTURE_DEPENDENT_CHECKS,
    )

    # Mock the stack reachability check to return False (unreachable)
    with patch("scripts.audit_runner.is_stack_reachable", return_value=False):
        # Mock all check modules to return dummy results
        # (we're testing the orchestration logic, not the checks themselves)
        with patch("scripts.audit_runner.HealthCheck") as mock_health, \
             patch("scripts.audit_runner.DBSchemaCheck") as mock_db, \
             patch("scripts.audit_runner.APIContractsCheck") as mock_api, \
             patch("scripts.audit_runner.FrontendCheck") as mock_frontend, \
             patch("scripts.audit_runner.MessagingCheck") as mock_messaging, \
             patch("scripts.audit_runner.TestCoverageCheck") as mock_tests, \
             patch("scripts.audit_runner.SecurityCheck") as mock_security, \
             patch("scripts.audit_runner.InfrastructureCheck") as mock_infra:

            # Configure mocks to return CheckResult objects
            # Infrastructure-dependent checks should be skipped by the runner
            # when stack is unreachable, so we don't need to configure them
            # to return SKIP — the runner should do that for us

            # Static checks should still run normally
            mock_frontend.return_value.run.return_value = CheckResult(
                dimension="Frontend Switchover",
                status=Status.PASS,
                details=[],
                failures=[],
            )
            mock_tests.return_value.run.return_value = CheckResult(
                dimension="Test Coverage",
                status=Status.PASS,
                details=[],
                failures=[],
            )
            mock_security.return_value.run.return_value = CheckResult(
                dimension="Security Hardening",
                status=Status.PASS,
                details=[],
                failures=[],
            )
            mock_infra.return_value.run.return_value = CheckResult(
                dimension="Infrastructure",
                status=Status.PASS,
                details=[],
                failures=[],
            )

            # Run the checks with a mock config
            config = {
                "gateway_url": "http://localhost:8000",
                "db_url": "postgresql://test:test@localhost:5432/test",
                "redpanda_brokers": "localhost:9092",
                "skip_tests": False,
                "skip_infra": False,
            }

            results = run_checks(config)

            # Verify that all infrastructure-dependent checks have SKIP status
            infra_results = [
                r for r in results
                if r.dimension in INFRASTRUCTURE_DEPENDENT_CHECKS
            ]

            for result in infra_results:
                assert result.status == Status.SKIP, (
                    f"Infrastructure-dependent check {result.dimension!r} "
                    f"should have SKIP status when stack is unreachable, "
                    f"but got {result.status}"
                )

            # Verify that none of the infrastructure-dependent checks have FAIL status
            for result in infra_results:
                assert result.status != Status.FAIL, (
                    f"Infrastructure-dependent check {result.dimension!r} "
                    f"should never have FAIL status when stack is unreachable, "
                    f"but got FAIL"
                )


@given(
    gateway_url=st.just("http://localhost:8000"),
)
@settings(max_examples=50, deadline=None)
def test_pbt_skip_message_when_unreachable(gateway_url):
    """
    # Feature: deploy-readiness-audit, Property 17: Infrastructure-dependent checks skip when stack unreachable

    When the stack is unreachable, the report should note that the stack must
    be running for a full audit.

    Validates: Requirements 10.6
    """
    from scripts.audit_runner import run_checks

    # Mock the stack reachability check to return False
    with patch("scripts.audit_runner.is_stack_reachable", return_value=False):
        # Mock all check modules
        with patch("scripts.audit_runner.HealthCheck") as mock_health, \
             patch("scripts.audit_runner.DBSchemaCheck") as mock_db, \
             patch("scripts.audit_runner.APIContractsCheck") as mock_api, \
             patch("scripts.audit_runner.FrontendCheck") as mock_frontend, \
             patch("scripts.audit_runner.MessagingCheck") as mock_messaging, \
             patch("scripts.audit_runner.TestCoverageCheck") as mock_tests, \
             patch("scripts.audit_runner.SecurityCheck") as mock_security, \
             patch("scripts.audit_runner.InfrastructureCheck") as mock_infra:

            # Configure static check mocks
            mock_frontend.return_value.run.return_value = CheckResult(
                dimension="Frontend Switchover",
                status=Status.PASS,
                details=[],
                failures=[],
            )
            mock_tests.return_value.run.return_value = CheckResult(
                dimension="Test Coverage",
                status=Status.PASS,
                details=[],
                failures=[],
            )
            mock_security.return_value.run.return_value = CheckResult(
                dimension="Security Hardening",
                status=Status.PASS,
                details=[],
                failures=[],
            )
            mock_infra.return_value.run.return_value = CheckResult(
                dimension="Infrastructure",
                status=Status.PASS,
                details=[],
                failures=[],
            )

            config = {
                "gateway_url": gateway_url,
                "db_url": "postgresql://test:test@localhost:5432/test",
                "redpanda_brokers": "localhost:9092",
                "skip_tests": False,
                "skip_infra": False,
            }

            results = run_checks(config)

            # At least one SKIP result should mention that the stack must be running
            skip_results = [r for r in results if r.status == Status.SKIP]
            assert len(skip_results) > 0, (
                "Expected at least one SKIP result when stack is unreachable"
            )

            # Check that at least one SKIP result has a message about the stack
            has_stack_message = any(
                any(
                    "stack" in detail.lower() or "running" in detail.lower()
                    for detail in r.details + r.failures
                )
                for r in skip_results
            )

            assert has_stack_message, (
                "Expected at least one SKIP result to mention that the stack "
                "must be running for a full audit"
            )
