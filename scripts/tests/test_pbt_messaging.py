"""
Property-based tests for event messaging readiness check.

# Feature: deploy-readiness-audit, Property 8: Topic bootstrap idempotence
# Feature: deploy-readiness-audit, Property 9: Critical topics have sufficient partitions

Validates: Requirements 5.2, 5.5
"""
from __future__ import annotations

from pathlib import Path
from typing import Any
import tempfile
import textwrap

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from scripts.checks.messaging import (
    CRITICAL_TOPICS,
    MIN_PARTITIONS,
    MessagingCheck,
    check_bootstrap_idempotence,
    check_critical_topics,
    validate_topic_partitions,
    _parse_admin_api_topics,
)
from scripts.models import Status

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# A valid topic name (alphanumeric, dots, underscores, hyphens)
topic_name_strategy = st.text(
    alphabet="abcdefghijklmnopqrstuvwxyz0123456789._-",
    min_size=1,
    max_size=40,
).filter(lambda s: s.strip(".").strip("-").strip("_"))

# A set of pre-existing topic names (may be empty)
pre_existing_topics_strategy = st.frozensets(
    topic_name_strategy,
    min_size=0,
    max_size=20,
)

# Partition counts: insufficient (< MIN_PARTITIONS)
insufficient_partitions_strategy = st.integers(min_value=0, max_value=MIN_PARTITIONS - 1)

# Partition counts: sufficient (>= MIN_PARTITIONS)
sufficient_partitions_strategy = st.integers(min_value=MIN_PARTITIONS, max_value=100)

# A single critical topic name
critical_topic_strategy = st.sampled_from(CRITICAL_TOPICS)

# A dict mapping all critical topics to partition counts
all_critical_partition_counts_strategy = st.fixed_dictionaries(
    {topic: st.integers(min_value=0, max_value=20) for topic in CRITICAL_TOPICS}
)


# ---------------------------------------------------------------------------
# Property 8: Topic bootstrap idempotence
# ---------------------------------------------------------------------------

def _make_bootstrap_sh(content: str) -> Path:
    """Write a temporary bootstrap.sh with the given content and return its path."""
    tmp = tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".sh",
        delete=False,
        encoding="utf-8",
    )
    tmp.write(content)
    tmp.flush()
    tmp.close()
    return Path(tmp.name)


def _simulate_bootstrap(
    pre_existing: frozenset[str],
    bootstrap_uses_if_not_exists: bool,
) -> tuple[frozenset[str], int]:
    """
    Simulate running the bootstrap logic once.

    Models the idempotence property:
    - If --if-not-exists is used, topics already present are NOT re-created.
    - Returns (final_topic_set, exit_code).

    The bootstrap creates a fixed set of topics (the CRITICAL_TOPICS for
    simplicity in this simulation). Exit code is always 0 when
    --if-not-exists is used (idempotent), or 1 if a topic already exists
    and the flag is absent.
    """
    # Topics the bootstrap script would create
    topics_to_create = frozenset(CRITICAL_TOPICS)

    if bootstrap_uses_if_not_exists:
        # Idempotent: merge without error
        final_topics = pre_existing | topics_to_create
        exit_code = 0
    else:
        # Non-idempotent: fail if any topic already exists
        conflicts = pre_existing & topics_to_create
        if conflicts:
            # Would fail on duplicate creation
            exit_code = 1
            final_topics = pre_existing  # no new topics created on failure
        else:
            final_topics = pre_existing | topics_to_create
            exit_code = 0

    return final_topics, exit_code


@given(pre_existing=pre_existing_topics_strategy)
@settings(max_examples=100)
def test_bootstrap_idempotence_with_if_not_exists(
    pre_existing: frozenset[str],
):
    """
    # Feature: deploy-readiness-audit, Property 8: Topic bootstrap idempotence

    For any initial set of pre-existing Redpanda topics (including the empty
    set), running the bootstrap logic twice SHALL produce exactly the same
    final topic set as running it once, with no duplicate topics created and
    exit code 0 on both runs.

    This test verifies the idempotence logic when --if-not-exists is used.

    Validates: Requirements 5.2
    """
    # Run bootstrap once
    topics_after_first, exit_code_first = _simulate_bootstrap(
        pre_existing=pre_existing,
        bootstrap_uses_if_not_exists=True,
    )

    # Run bootstrap a second time (starting from the state after the first run)
    topics_after_second, exit_code_second = _simulate_bootstrap(
        pre_existing=topics_after_first,
        bootstrap_uses_if_not_exists=True,
    )

    # Property: both runs exit with code 0
    assert exit_code_first == 0, (
        f"First bootstrap run should exit 0 with --if-not-exists, "
        f"got exit code {exit_code_first}. "
        f"Pre-existing topics: {pre_existing}"
    )
    assert exit_code_second == 0, (
        f"Second bootstrap run should exit 0 with --if-not-exists, "
        f"got exit code {exit_code_second}. "
        f"Topics after first run: {topics_after_first}"
    )

    # Property: final topic set is identical after both runs (no duplicates,
    # same set)
    assert topics_after_first == topics_after_second, (
        f"Topic set after second run differs from first run — bootstrap is "
        f"not idempotent.\n"
        f"After first run:  {sorted(topics_after_first)}\n"
        f"After second run: {sorted(topics_after_second)}\n"
        f"Pre-existing: {sorted(pre_existing)}"
    )

    # Property: all originally pre-existing topics are still present
    assert pre_existing.issubset(topics_after_second), (
        f"Pre-existing topics were lost after bootstrap runs.\n"
        f"Missing: {pre_existing - topics_after_second}"
    )


@given(pre_existing=pre_existing_topics_strategy)
@settings(max_examples=100)
def test_bootstrap_without_if_not_exists_fails_on_conflict(
    pre_existing: frozenset[str],
):
    """
    # Feature: deploy-readiness-audit, Property 8: Topic bootstrap idempotence

    Without --if-not-exists, running bootstrap a second time SHALL fail
    (non-zero exit code) when any topic already exists — demonstrating WHY
    the flag is required for idempotence.

    Validates: Requirements 5.2
    """
    # Run bootstrap once (no conflicts yet)
    topics_after_first, exit_code_first = _simulate_bootstrap(
        pre_existing=pre_existing,
        bootstrap_uses_if_not_exists=False,
    )

    if exit_code_first != 0:
        # Pre-existing topics already conflicted — skip this case
        return

    # Run bootstrap a second time without --if-not-exists
    # Now the topics from the first run are "pre-existing"
    _, exit_code_second = _simulate_bootstrap(
        pre_existing=topics_after_first,
        bootstrap_uses_if_not_exists=False,
    )

    # If the first run created any of the critical topics, the second run
    # should fail (topics already exist)
    created_critical = frozenset(CRITICAL_TOPICS) - pre_existing
    if created_critical:
        assert exit_code_second != 0, (
            f"Expected non-zero exit code on second run without --if-not-exists "
            f"when topics {sorted(created_critical)} already exist, "
            f"but got exit code 0"
        )


@given(pre_existing=pre_existing_topics_strategy)
@settings(max_examples=100)
def test_check_bootstrap_idempotence_detects_if_not_exists_flag(
    pre_existing: frozenset[str],
):
    """
    # Feature: deploy-readiness-audit, Property 8: Topic bootstrap idempotence

    check_bootstrap_idempotence SHALL return no failures when the bootstrap
    script contains the --if-not-exists flag, regardless of what topics
    pre-exist.

    Validates: Requirements 5.2
    """
    # Create a temporary bootstrap.sh that contains --if-not-exists
    content = textwrap.dedent("""\
        #!/bin/bash
        rpk topic create "floor.dispatch.issued" \\
          --brokers "$BROKER" \\
          --partitions 3 \\
          --if-not-exists
    """)
    bootstrap_path = _make_bootstrap_sh(content)

    try:
        details, failures = check_bootstrap_idempotence(
            bootstrap_candidates=[bootstrap_path]
        )
        assert failures == [], (
            f"Expected no failures when --if-not-exists is present, "
            f"got: {failures}"
        )
        assert any("idempotent" in d.lower() or "if-not-exists" in d for d in details), (
            f"Expected details to mention idempotence, got: {details}"
        )
    finally:
        bootstrap_path.unlink(missing_ok=True)


@given(pre_existing=pre_existing_topics_strategy)
@settings(max_examples=100)
def test_check_bootstrap_idempotence_fails_without_if_not_exists_flag(
    pre_existing: frozenset[str],
):
    """
    # Feature: deploy-readiness-audit, Property 8: Topic bootstrap idempotence

    check_bootstrap_idempotence SHALL return at least one failure when the
    bootstrap script does NOT contain the --if-not-exists flag, regardless
    of what topics pre-exist.

    Validates: Requirements 5.2
    """
    # Create a temporary bootstrap.sh WITHOUT --if-not-exists
    content = textwrap.dedent("""\
        #!/bin/bash
        rpk topic create "floor.dispatch.issued" \\
          --brokers "$BROKER" \\
          --partitions 3
    """)
    bootstrap_path = _make_bootstrap_sh(content)

    try:
        details, failures = check_bootstrap_idempotence(
            bootstrap_candidates=[bootstrap_path]
        )
        assert len(failures) >= 1, (
            f"Expected at least 1 failure when --if-not-exists is absent, "
            f"got 0 failures. Details: {details}"
        )
    finally:
        bootstrap_path.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Property 9: Critical topics have sufficient partitions
# ---------------------------------------------------------------------------

@given(
    topic=critical_topic_strategy,
    partition_count=sufficient_partitions_strategy,
)
@settings(max_examples=100)
def test_validate_topic_partitions_accepts_sufficient_count(
    topic: str,
    partition_count: int,
):
    """
    # Feature: deploy-readiness-audit, Property 9: Critical topics have sufficient partitions

    For any topic in the critical set, the partition validator SHALL accept
    any partition count >= MIN_PARTITIONS (3).

    Validates: Requirements 5.5
    """
    ok, reason = validate_topic_partitions(topic, partition_count)
    assert ok is True, (
        f"Expected validator to accept {partition_count} partitions for "
        f"topic {topic!r} (>= {MIN_PARTITIONS}), but got rejection: {reason!r}"
    )
    assert reason == "", (
        f"Expected empty reason on success, got: {reason!r}"
    )


@given(
    topic=critical_topic_strategy,
    partition_count=insufficient_partitions_strategy,
)
@settings(max_examples=100)
def test_validate_topic_partitions_rejects_insufficient_count(
    topic: str,
    partition_count: int,
):
    """
    # Feature: deploy-readiness-audit, Property 9: Critical topics have sufficient partitions

    For any topic in the critical set, the partition validator SHALL reject
    any partition count < MIN_PARTITIONS (3).

    Validates: Requirements 5.5
    """
    ok, reason = validate_topic_partitions(topic, partition_count)
    assert ok is False, (
        f"Expected validator to reject {partition_count} partitions for "
        f"topic {topic!r} (< {MIN_PARTITIONS}), but it was accepted."
    )
    assert isinstance(reason, str) and reason.strip(), (
        f"Rejection reason must be a non-empty string, got: {reason!r}"
    )
    # The reason must mention the topic name and the actual count
    assert topic in reason or str(partition_count) in reason, (
        f"Rejection reason should mention the topic or partition count. "
        f"Got: {reason!r}"
    )


@given(all_critical_partition_counts_strategy)
@settings(max_examples=100)
def test_check_critical_topics_passes_when_all_sufficient(
    partition_counts: dict[str, int],
):
    """
    # Feature: deploy-readiness-audit, Property 9: Critical topics have sufficient partitions

    check_critical_topics SHALL return no failures when all critical topics
    exist and have >= MIN_PARTITIONS partitions each.

    Validates: Requirements 5.5
    """
    # Only include topics with sufficient partitions
    topics = {
        topic: count
        for topic, count in partition_counts.items()
        if count >= MIN_PARTITIONS
    }

    # Ensure all critical topics are present with sufficient partitions
    for critical_topic in CRITICAL_TOPICS:
        topics[critical_topic] = max(
            partition_counts.get(critical_topic, MIN_PARTITIONS),
            MIN_PARTITIONS,
        )

    details, failures = check_critical_topics(topics)
    assert failures == [], (
        f"Expected no failures when all critical topics have >= {MIN_PARTITIONS} "
        f"partitions, got: {failures}\nTopics: {topics}"
    )


@given(all_critical_partition_counts_strategy)
@settings(max_examples=100)
def test_check_critical_topics_fails_when_any_insufficient(
    partition_counts: dict[str, int],
):
    """
    # Feature: deploy-readiness-audit, Property 9: Critical topics have sufficient partitions

    check_critical_topics SHALL return at least one failure when any critical
    topic has fewer than MIN_PARTITIONS partitions.

    Validates: Requirements 5.5
    """
    # Find topics with insufficient partitions
    insufficient = {
        topic: count
        for topic, count in partition_counts.items()
        if count < MIN_PARTITIONS
    }

    if not insufficient:
        # All happen to be sufficient — skip this case
        return

    details, failures = check_critical_topics(partition_counts)
    assert len(failures) >= len(insufficient), (
        f"Expected at least {len(insufficient)} failure(s) for topics with "
        f"insufficient partitions {insufficient!r}, got {len(failures)}: {failures}"
    )

    # Each insufficient topic must appear in the failures
    for topic in insufficient:
        assert any(topic in f for f in failures), (
            f"Topic {topic!r} with {insufficient[topic]} partitions not "
            f"reported in failures: {failures}"
        )


@given(
    topic=critical_topic_strategy,
    partition_count=insufficient_partitions_strategy,
)
@settings(max_examples=100)
def test_check_critical_topics_fails_for_single_insufficient_topic(
    topic: str,
    partition_count: int,
):
    """
    # Feature: deploy-readiness-audit, Property 9: Critical topics have sufficient partitions

    check_critical_topics SHALL return at least one failure when a single
    critical topic has fewer than MIN_PARTITIONS partitions, even if all
    other critical topics are fine.

    Validates: Requirements 5.5
    """
    # Build a topics dict where all critical topics have sufficient partitions
    # except the one under test
    topics = {t: MIN_PARTITIONS for t in CRITICAL_TOPICS}
    topics[topic] = partition_count  # override with insufficient count

    details, failures = check_critical_topics(topics)
    assert len(failures) >= 1, (
        f"Expected at least 1 failure when topic {topic!r} has "
        f"{partition_count} partitions (< {MIN_PARTITIONS}), got 0 failures"
    )
    assert any(topic in f for f in failures), (
        f"Expected failure to mention topic {topic!r}, got: {failures}"
    )


@given(
    extra_topics=st.frozensets(topic_name_strategy, min_size=0, max_size=10),
    partition_count=sufficient_partitions_strategy,
)
@settings(max_examples=100)
def test_check_critical_topics_ignores_non_critical_topics(
    extra_topics: frozenset[str],
    partition_count: int,
):
    """
    # Feature: deploy-readiness-audit, Property 9: Critical topics have sufficient partitions

    check_critical_topics SHALL not fail due to non-critical topics having
    any partition count — only the four critical topics are checked.

    Validates: Requirements 5.5
    """
    # All critical topics have sufficient partitions
    topics = {t: MIN_PARTITIONS for t in CRITICAL_TOPICS}
    # Add extra non-critical topics with any partition count
    for extra in extra_topics:
        if extra not in CRITICAL_TOPICS:
            topics[extra] = partition_count

    details, failures = check_critical_topics(topics)
    assert failures == [], (
        f"Expected no failures when all critical topics are fine, "
        f"got: {failures}\nExtra topics: {extra_topics}"
    )


@given(
    missing_topics=st.lists(
        st.sampled_from(CRITICAL_TOPICS),
        min_size=1,
        max_size=len(CRITICAL_TOPICS),
        unique=True,
    )
)
@settings(max_examples=100)
def test_check_critical_topics_fails_when_topic_missing(
    missing_topics: list[str],
):
    """
    # Feature: deploy-readiness-audit, Property 9: Critical topics have sufficient partitions

    check_critical_topics SHALL return at least one failure for each critical
    topic that does not exist on the broker.

    Validates: Requirements 5.5
    """
    # Build topics dict with all critical topics present except the missing ones
    topics = {t: MIN_PARTITIONS for t in CRITICAL_TOPICS}
    for missing in missing_topics:
        del topics[missing]

    details, failures = check_critical_topics(topics)
    assert len(failures) >= len(missing_topics), (
        f"Expected at least {len(missing_topics)} failure(s) for missing "
        f"topics {missing_topics!r}, got {len(failures)}: {failures}"
    )
    for missing in missing_topics:
        assert any(missing in f for f in failures), (
            f"Missing topic {missing!r} not reported in failures: {failures}"
        )


# ---------------------------------------------------------------------------
# Integration-style unit tests (no live stack required)
# ---------------------------------------------------------------------------

def test_messaging_check_skips_when_broker_unreachable():
    """
    MessagingCheck.run() SHALL return SKIP when the Redpanda broker is
    unreachable (connection refused).
    """
    def always_refused(url: str) -> tuple[int, Any]:
        raise ConnectionError(f"Connection refused: {url}")

    # Also mock subprocess so rpk fallback also fails
    def no_subprocess(cmd: list[str]) -> tuple[int, str, str]:
        return -1, "", "rpk not found"

    checker = MessagingCheck(
        redpanda_brokers="localhost:9092",
        http_get=always_refused,
        run_subprocess=no_subprocess,
        bootstrap_candidates=[],  # skip bootstrap check
    )
    result = checker.run()
    assert result.status == Status.SKIP, (
        f"Expected SKIP when broker is unreachable, got {result.status!r}"
    )


def test_messaging_check_dimension():
    """The CheckResult dimension must always be 'Event Messaging'."""
    def always_refused(url: str) -> tuple[int, Any]:
        raise ConnectionError(f"Connection refused: {url}")

    checker = MessagingCheck(
        http_get=always_refused,
        bootstrap_candidates=[],
    )
    result = checker.run()
    assert result.dimension == "Event Messaging"


def test_messaging_check_pass_when_all_topics_present_and_sufficient():
    """
    MessagingCheck.run() SHALL return PASS when:
    - bootstrap.sh contains --if-not-exists
    - All critical topics exist with >= 3 partitions
    - Consumer logs contain startup confirmation
    """
    # Create a temporary bootstrap.sh with --if-not-exists
    content = textwrap.dedent("""\
        #!/bin/bash
        rpk topic create "floor.dispatch.issued" --if-not-exists
        rpk topic create "demand.priority.recalculated" --if-not-exists
        rpk topic create "material.coil.shortage_detected" --if-not-exists
        rpk topic create "floor.shift.handover_submitted" --if-not-exists
    """)
    bootstrap_path = _make_bootstrap_sh(content)

    try:
        # Mock Admin API returning all critical topics with 3 partitions each
        def mock_http_get(url: str) -> tuple[int, Any]:
            topics_response = [
                {"name": topic, "partitions": [{"id": i} for i in range(3)]}
                for topic in CRITICAL_TOPICS
            ]
            return 200, topics_response

        # Mock docker logs returning startup confirmation
        def mock_subprocess(cmd: list[str]) -> tuple[int, str, str]:
            if "docker" in cmd and "logs" in cmd:
                container = cmd[-1]
                if container == "m1-demand":
                    return 0, "Starting run_shortage_consumer task", ""
                if container == "m5a-material":
                    return 0, "Starting run_erp_consumers task", ""
            return 0, "", ""

        checker = MessagingCheck(
            redpanda_brokers="localhost:9092",
            http_get=mock_http_get,
            run_subprocess=mock_subprocess,
            bootstrap_candidates=[bootstrap_path],
        )
        result = checker.run()
        assert result.status == Status.PASS, (
            f"Expected PASS for happy-path, got {result.status!r}. "
            f"Failures: {result.failures}"
        )
    finally:
        bootstrap_path.unlink(missing_ok=True)


def test_messaging_check_fails_when_critical_topic_has_insufficient_partitions():
    """
    MessagingCheck.run() SHALL return FAIL when a critical topic has fewer
    than 3 partitions.
    """
    content = "rpk topic create test --if-not-exists"
    bootstrap_path = _make_bootstrap_sh(content)

    try:
        def mock_http_get(url: str) -> tuple[int, Any]:
            # Return critical topics but with only 1 partition each
            topics_response = [
                {"name": topic, "partitions": [{"id": 0}]}  # only 1 partition
                for topic in CRITICAL_TOPICS
            ]
            return 200, topics_response

        def mock_subprocess(cmd: list[str]) -> tuple[int, str, str]:
            if "docker" in cmd:
                return 0, "run_shortage_consumer run_erp_consumers", ""
            return 0, "", ""

        checker = MessagingCheck(
            redpanda_brokers="localhost:9092",
            http_get=mock_http_get,
            run_subprocess=mock_subprocess,
            bootstrap_candidates=[bootstrap_path],
        )
        result = checker.run()
        assert result.status == Status.FAIL, (
            f"Expected FAIL when critical topics have only 1 partition, "
            f"got {result.status!r}"
        )
        assert len(result.failures) >= 1
    finally:
        bootstrap_path.unlink(missing_ok=True)


def test_parse_admin_api_topics_handles_partition_list():
    """_parse_admin_api_topics correctly counts partitions from a list."""
    body = [
        {"name": "floor.dispatch.issued", "partitions": [{"id": 0}, {"id": 1}, {"id": 2}]},
        {"name": "demand.priority.recalculated", "partitions": [{"id": 0}]},
    ]
    result = _parse_admin_api_topics(body)
    assert result is not None
    assert result["floor.dispatch.issued"] == 3
    assert result["demand.priority.recalculated"] == 1


def test_parse_admin_api_topics_handles_integer_partition_count():
    """_parse_admin_api_topics correctly handles integer partition counts."""
    body = [
        {"name": "floor.dispatch.issued", "partitions": 5},
        {"name": "demand.priority.recalculated", "partitions": 2},
    ]
    result = _parse_admin_api_topics(body)
    assert result is not None
    assert result["floor.dispatch.issued"] == 5
    assert result["demand.priority.recalculated"] == 2


def test_parse_admin_api_topics_returns_none_for_non_list():
    """_parse_admin_api_topics returns None when the response is not a list."""
    assert _parse_admin_api_topics(None) is None
    assert _parse_admin_api_topics({}) is None
    assert _parse_admin_api_topics("string") is None


def test_check_bootstrap_idempotence_fails_when_file_missing():
    """check_bootstrap_idempotence returns a failure when no bootstrap.sh exists."""
    details, failures = check_bootstrap_idempotence(
        bootstrap_candidates=[Path("/nonexistent/path/bootstrap.sh")]
    )
    assert len(failures) >= 1
    assert any("not found" in f.lower() for f in failures)
