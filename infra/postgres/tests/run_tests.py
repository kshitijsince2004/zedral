#!/usr/bin/env python3
"""
Test runner for Zedral Database Schema migration tests.

This script:
1. Checks Docker availability
2. Starts a TimescaleDB container
3. Runs all migration tests
4. Cleans up the container

Usage:
    python run_tests.py
    python run_tests.py -k "test_migration_applies"  # Run specific tests
    python run_tests.py -v  # Verbose output
"""
from __future__ import annotations

import subprocess
import sys
import time
import uuid
from pathlib import Path

# Docker settings
DOCKER_IMAGE = "timescale/timescaledb:latest-pg16"
CONTAINER_PREFIX = "zedral_migration_test"
POSTGRES_PORT = 15432
POSTGRES_USER = "postgres"
POSTGRES_PASSWORD = "postgres"
POSTGRES_DB = "zedral_test"


def run_command(cmd: list[str], check: bool = True, capture: bool = True) -> subprocess.CompletedProcess:
    """Run a shell command."""
    return subprocess.run(
        cmd,
        capture_output=capture,
        text=True,
        check=check
    )


def check_docker() -> bool:
    """Check if Docker is available and running."""
    try:
        result = run_command(["docker", "info"], check=False)
        return result.returncode == 0
    except FileNotFoundError:
        return False


def pull_image() -> bool:
    """Pull the TimescaleDB Docker image."""
    print(f"Pulling Docker image: {DOCKER_IMAGE}")
    try:
        result = run_command(["docker", "pull", DOCKER_IMAGE], check=False)
        if result.returncode != 0:
            print(f"Warning: Could not pull image: {result.stderr}")
        return result.returncode == 0
    except Exception as e:
        print(f"Error pulling image: {e}")
        return False


def start_container(container_name: str) -> bool:
    """Start the TimescaleDB container."""
    print(f"Starting container: {container_name}")
    
    # Remove any existing container
    run_command(["docker", "rm", "-f", container_name], check=False)
    
    # Start new container
    result = run_command([
        "docker", "run", "-d",
        "--name", container_name,
        "-e", f"POSTGRES_USER={POSTGRES_USER}",
        "-e", f"POSTGRES_PASSWORD={POSTGRES_PASSWORD}",
        "-e", f"POSTGRES_DB={POSTGRES_DB}",
        "-p", f"{POSTGRES_PORT}:5432",
        DOCKER_IMAGE
    ], check=False)
    
    return result.returncode == 0


def wait_for_postgres(timeout: int = 60) -> bool:
    """Wait for PostgreSQL to be ready."""
    print("Waiting for PostgreSQL to be ready...")
    
    import psycopg2
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            conn = psycopg2.connect(
                host="localhost",
                port=POSTGRES_PORT,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD,
                dbname=POSTGRES_DB,
                connect_timeout=5
            )
            conn.close()
            print("PostgreSQL is ready!")
            return True
        except psycopg2.OperationalError:
            time.sleep(1)
    
    print("PostgreSQL did not become ready in time")
    return False


def stop_container(container_name: str) -> bool:
    """Stop and remove the container."""
    print(f"Stopping container: {container_name}")
    result = run_command(["docker", "rm", "-f", container_name], check=False)
    return result.returncode == 0


def run_tests(extra_args: list[str] = None) -> int:
    """Run pytest with the given arguments."""
    test_dir = Path(__file__).parent
    
    # Set environment variables for tests
    env_vars = {
        "TEST_POSTGRES_HOST": "localhost",
        "TEST_POSTGRES_PORT": str(POSTGRES_PORT),
        "TEST_POSTGRES_USER": POSTGRES_USER,
        "TEST_POSTGRES_PASSWORD": POSTGRES_PASSWORD,
        "TEST_POSTGRES_DB": POSTGRES_DB,
    }
    
    # Build pytest command
    pytest_args = [
        sys.executable, "-m", "pytest",
        str(test_dir),
        "-c", str(test_dir / "pytest.ini"),
        *(extra_args or [])
    ]
    
    # Run pytest
    import os
    env = os.environ.copy()
    env.update(env_vars)
    
    result = subprocess.run(pytest_args, env=env)
    return result.returncode


def main():
    """Main entry point."""
    # Check Docker
    if not check_docker():
        print("ERROR: Docker is not available or not running.")
        print("Please ensure Docker is installed and running.")
        return 1
    
    # Generate unique container name
    test_run_id = str(uuid.uuid4())[:8]
    container_name = f"{CONTAINER_PREFIX}_{test_run_id}"
    
    try:
        # Pull image (optional - will pull automatically if not present)
        pull_image()
        
        # Start container
        if not start_container(container_name):
            print("ERROR: Failed to start TimescaleDB container")
            return 1
        
        # Wait for PostgreSQL
        if not wait_for_postgres():
            print("ERROR: PostgreSQL did not become ready")
            return 1
        
        # Run tests
        extra_args = sys.argv[1:] if len(sys.argv) > 1 else []
        return run_tests(extra_args)
        
    finally:
        # Cleanup
        stop_container(container_name)


if __name__ == "__main__":
    sys.exit(main())
