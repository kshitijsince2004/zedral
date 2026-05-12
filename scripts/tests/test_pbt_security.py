"""
Property-based tests for security hardening check.

# Feature: deploy-readiness-audit, Property 12: No production secrets in committed .env files

For any file in the repository matching *.env or .env* (excluding .env.example),
the file content SHALL NOT contain any of the known dev placeholder secrets
(zedral_dev_password, dev-secret-change-in-production, admin_dev_password).

Validates: Requirements 7.7
"""
from __future__ import annotations

# Feature: deploy-readiness-audit, Property 12: No production secrets in committed .env files

import tempfile
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from scripts.checks.security import (
    DEV_SECRETS,
    contains_dev_secret,
    scan_env_files,
)

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Printable text that does NOT contain any of the dev placeholder secrets
_safe_chars = st.characters(
    whitelist_categories=("Lu", "Ll", "Nd", "Pc", "Pd"),
    whitelist_characters=" =\n_./:",
)

safe_text_strategy = st.text(
    alphabet=_safe_chars,
    min_size=0,
    max_size=500,
).filter(
    lambda s: not any(secret in s for secret in DEV_SECRETS)
)

# A single dev placeholder secret
dev_secret_strategy = st.sampled_from(DEV_SECRETS)

# Text that contains at least one dev placeholder secret
# (built by inserting a secret into otherwise safe text)
text_with_secret_strategy = st.builds(
    lambda prefix, secret, suffix: prefix + secret + suffix,
    prefix=safe_text_strategy,
    secret=dev_secret_strategy,
    suffix=safe_text_strategy,
)

# Valid .env file names (not .env.example)
env_filename_strategy = st.one_of(
    st.just(".env"),
    st.builds(
        lambda suffix: f".env.{suffix}",
        suffix=st.text(
            alphabet="abcdefghijklmnopqrstuvwxyz0123456789",
            min_size=1,
            max_size=15,
        ).filter(lambda s: s != "example"),
    ),
    st.builds(
        lambda prefix: f"{prefix}.env",
        prefix=st.text(
            alphabet="abcdefghijklmnopqrstuvwxyz0123456789",
            min_size=1,
            max_size=15,
        ),
    ),
)


# ---------------------------------------------------------------------------
# Property 12: No production secrets in committed .env files
# ---------------------------------------------------------------------------

@given(content=safe_text_strategy)
@settings(max_examples=100)
def test_secret_scanner_accepts_content_without_secrets(content: str):
    """
    # Feature: deploy-readiness-audit, Property 12: No production secrets in committed .env files

    For any file content that does NOT contain any of the known dev placeholder
    secrets, the secret scanner SHALL return an empty list (no secrets found).

    Validates: Requirements 7.7
    """
    found = contains_dev_secret(content)
    assert found == [], (
        f"Expected no secrets in content without dev placeholders, "
        f"but found: {found!r}\n"
        f"Content (first 200 chars): {content[:200]!r}"
    )


@given(content=text_with_secret_strategy)
@settings(max_examples=100)
def test_secret_scanner_detects_content_with_secrets(content: str):
    """
    # Feature: deploy-readiness-audit, Property 12: No production secrets in committed .env files

    For any file content that DOES contain at least one of the known dev
    placeholder secrets, the secret scanner SHALL return a non-empty list
    identifying the secrets found.

    Validates: Requirements 7.7
    """
    found = contains_dev_secret(content)
    assert len(found) >= 1, (
        f"Expected at least one secret to be detected in content that "
        f"contains a dev placeholder, but found none.\n"
        f"Content (first 200 chars): {content[:200]!r}"
    )
    # Every returned secret must actually be in the content
    for secret in found:
        assert secret in content, (
            f"Scanner reported secret {secret!r} but it is not in the content"
        )
    # Every returned secret must be from the known DEV_SECRETS list
    for secret in found:
        assert secret in DEV_SECRETS, (
            f"Scanner returned unknown secret {secret!r} not in DEV_SECRETS"
        )


@given(
    content=safe_text_strategy,
    filename=env_filename_strategy,
)
@settings(max_examples=100)
def test_env_file_without_secrets_produces_no_failures(
    content: str,
    filename: str,
):
    """
    # Feature: deploy-readiness-audit, Property 12: No production secrets in committed .env files

    For any .env file (not .env.example) whose content does NOT contain any
    dev placeholder secrets, scan_env_files SHALL produce no failures.

    Validates: Requirements 7.7
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        env_file = tmp_path / filename
        env_file.write_text(content, encoding="utf-8")

        details, failures = scan_env_files(tmp_path)
        assert failures == [], (
            f"Expected no failures for .env file {filename!r} with clean content, "
            f"but got: {failures}\n"
            f"Content (first 200 chars): {content[:200]!r}"
        )


@given(
    content=text_with_secret_strategy,
    filename=env_filename_strategy,
)
@settings(max_examples=100)
def test_env_file_with_secrets_produces_failures(
    content: str,
    filename: str,
):
    """
    # Feature: deploy-readiness-audit, Property 12: No production secrets in committed .env files

    For any .env file (not .env.example) whose content DOES contain at least
    one dev placeholder secret, scan_env_files SHALL produce at least one
    failure.

    Validates: Requirements 7.7
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        env_file = tmp_path / filename
        env_file.write_text(content, encoding="utf-8")

        details, failures = scan_env_files(tmp_path)
        assert len(failures) >= 1, (
            f"Expected at least one failure for .env file {filename!r} "
            f"containing dev placeholder secrets, but got no failures.\n"
            f"Content (first 200 chars): {content[:200]!r}"
        )


@given(
    secret_content=text_with_secret_strategy,
)
@settings(max_examples=100)
def test_env_example_with_secrets_is_excluded(secret_content: str):
    """
    # Feature: deploy-readiness-audit, Property 12: No production secrets in committed .env files

    For any .env.example file, even if it contains dev placeholder secrets,
    scan_env_files SHALL NOT produce failures — .env.example files are
    documentation templates and are explicitly excluded from scanning.

    Validates: Requirements 7.7
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        env_example = tmp_path / ".env.example"
        env_example.write_text(secret_content, encoding="utf-8")

        details, failures = scan_env_files(tmp_path)
        assert failures == [], (
            f"Expected no failures for .env.example (should be excluded), "
            f"but got: {failures}\n"
            f"Content (first 200 chars): {secret_content[:200]!r}"
        )


@given(
    safe_content=safe_text_strategy,
    secret_content=text_with_secret_strategy,
    safe_filename=env_filename_strategy,
)
@settings(max_examples=100)
def test_only_dirty_env_file_is_reported(
    safe_content: str,
    secret_content: str,
    safe_filename: str,
):
    """
    # Feature: deploy-readiness-audit, Property 12: No production secrets in committed .env files

    When a repository contains both clean and dirty .env files, only the
    dirty file(s) SHALL be reported in failures — clean files SHALL NOT
    appear in failures.

    Validates: Requirements 7.7
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        # Write a clean .env file
        clean_file = tmp_path / safe_filename
        clean_file.write_text(safe_content, encoding="utf-8")

        # Write a dirty .env file with a different name
        dirty_file = tmp_path / ".env.dirty"
        dirty_file.write_text(secret_content, encoding="utf-8")

        details, failures = scan_env_files(tmp_path)

        # There must be at least one failure (for the dirty file)
        assert len(failures) >= 1, (
            f"Expected at least one failure for dirty .env file, "
            f"but got none. Failures: {failures}"
        )

        # The clean file path should NOT appear in failures
        for failure in failures:
            assert safe_filename not in failure or "dirty" in failure or any(
                secret in failure for secret in DEV_SECRETS
            ), (
                f"Clean file {safe_filename!r} should not appear in failures "
                f"unless it's about a secret. Got failure: {failure!r}"
            )


@given(
    content=safe_text_strategy,
)
@settings(max_examples=100)
def test_contains_dev_secret_is_subset_of_dev_secrets(content: str):
    """
    # Feature: deploy-readiness-audit, Property 12: No production secrets in committed .env files

    The contains_dev_secret function SHALL only return secrets from the
    DEV_SECRETS list — it never invents new secrets.

    Validates: Requirements 7.7
    """
    found = contains_dev_secret(content)
    for secret in found:
        assert secret in DEV_SECRETS, (
            f"contains_dev_secret returned {secret!r} which is not in DEV_SECRETS"
        )


@given(
    prefix=safe_text_strategy,
    suffix=safe_text_strategy,
    secret=dev_secret_strategy,
)
@settings(max_examples=100)
def test_secret_detected_regardless_of_surrounding_context(
    prefix: str,
    suffix: str,
    secret: str,
):
    """
    # Feature: deploy-readiness-audit, Property 12: No production secrets in committed .env files

    A dev placeholder secret SHALL be detected regardless of what text
    surrounds it — the scanner performs substring matching.

    Validates: Requirements 7.7
    """
    content = prefix + secret + suffix
    found = contains_dev_secret(content)
    assert secret in found, (
        f"Expected secret {secret!r} to be detected in content with "
        f"prefix={prefix[:50]!r} and suffix={suffix[:50]!r}, "
        f"but found: {found!r}"
    )
