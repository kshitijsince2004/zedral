"""Pytest configuration and fixtures for migration tests.

Provides Docker-based PostgreSQL 16 + TimescaleDB container management
for isolated migration testing.
"""
from __future__ import annotations

import os
import subprocess
import time
import uuid
from pathlib import Path

import pytest
import psycopg2


# Docker container settings
DOCKER_IMAGE = "timescale/timescaledb:latest-pg16"
CONTAINER_PREFIX = "zedral_test"
POSTGRES_PORT = 5432
POSTGRES_USER = "postgres"
POSTGRES_PASSWORD = "postgres"
POSTGRES_DB = "zedral_test"


def get_docker_container_name(test_run_id: str) -> str:
    """Generate a unique container name for this test run."""
    return f"{CONTAINER_PREFIX}_{test_run_id}"


def is_docker_available() -> bool:
    """Check if Docker is available and running."""
    try:
        result = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def start_timescaledb_container(container_name: str, port: int) -> bool:
    """Start a TimescaleDB Docker container."""
    try:
        # Remove any existing container with the same name
        subprocess.run(
            ["docker", "rm", "-f", container_name],
            capture_output=True,
            timeout=30
        )
        
        # Start new container
        result = subprocess.run(
            [
                "docker", "run", "-d",
                "--name", container_name,
                "-e", f"POSTGRES_USER={POSTGRES_USER}",
                "-e", f"POSTGRES_PASSWORD={POSTGRES_PASSWORD}",
                "-e", f"POSTGRES_DB={POSTGRES_DB}",
                "-p", f"{port}:{POSTGRES_PORT}",
                DOCKER_IMAGE
            ],
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, Exception):
        return False


def stop_container(container_name: str) -> bool:
    """Stop and remove a Docker container."""
    try:
        subprocess.run(
            ["docker", "rm", "-f", container_name],
            capture_output=True,
            timeout=30
        )
        return True
    except (subprocess.TimeoutExpired, Exception):
        return False


def wait_for_postgres(host: str, port: int, timeout: int = 60) -> bool:
    """Wait for PostgreSQL to be ready to accept connections."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            conn = psycopg2.connect(
                host=host,
                port=port,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD,
                dbname=POSTGRES_DB,
                connect_timeout=5
            )
            conn.close()
            return True
        except psycopg2.OperationalError:
            time.sleep(1)
    return False


def get_migration_sql() -> str:
    """Read the migration SQL file."""
    migration_path = Path(__file__).parent.parent / "init" / "001_zedral_schema.sql"
    if not migration_path.exists():
        raise FileNotFoundError(f"Migration file not found: {migration_path}")
    return migration_path.read_text(encoding="utf-8")


def apply_migration(host: str, port: int, dbname: str = POSTGRES_DB) -> tuple[bool, str]:
    """
    Apply the migration SQL file to the database.
    
    Returns:
        Tuple of (success, error_message)
    """
    migration_sql = get_migration_sql()
    
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            dbname=dbname,
            connect_timeout=10
        )
        conn.autocommit = False
        cursor = conn.cursor()
        
        try:
            cursor.execute(migration_sql)
            conn.commit()
            return True, ""
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        return False, str(e)


def get_connection(host: str, port: int, dbname: str = POSTGRES_DB):
    """Get a database connection."""
    return psycopg2.connect(
        host=host,
        port=port,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        dbname=dbname,
        connect_timeout=10
    )


# Session-scoped fixture for Docker container
@pytest.fixture(scope="session")
def docker_postgres():
    """
    Session-scoped fixture that provides a PostgreSQL + TimescaleDB container.
    
    Starts the container once per test session and cleans up afterwards.
    """
    # Skip if Docker is not available
    if not is_docker_available():
        pytest.skip("Docker is not available or not running")
    
    test_run_id = str(uuid.uuid4())[:8]
    container_name = get_docker_container_name(test_run_id)
    
    # Find an available port
    test_port = 15432
    
    # Start container
    if not start_timescaledb_container(container_name, test_port):
        pytest.skip(f"Failed to start TimescaleDB container")
    
    # Wait for PostgreSQL to be ready
    if not wait_for_postgres("localhost", test_port, timeout=60):
        stop_container(container_name)
        pytest.skip("PostgreSQL did not become ready in time")
    
    yield {
        "host": "localhost",
        "port": test_port,
        "user": POSTGRES_USER,
        "password": POSTGRES_PASSWORD,
        "dbname": POSTGRES_DB,
        "container_name": container_name
    }
    
    # Cleanup: stop container
    stop_container(container_name)


@pytest.fixture(scope="function")
def fresh_database(docker_postgres):
    """
    Function-scoped fixture that applies migration to a fresh database.
    
    Creates a fresh database for each test, applies the migration,
    and drops it afterwards.
    """
    host = docker_postgres["host"]
    port = docker_postgres["port"]
    
    # Create a unique database name for this test
    test_db_name = f"test_{uuid.uuid4().hex[:12]}"
    
    # Connect to default database to create test database
    conn = get_connection(host, port, POSTGRES_DB)
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute(f'CREATE DATABASE "{test_db_name}"')
    cursor.close()
    conn.close()
    
    # Apply migration to the new database
    success, error = apply_migration(host, port, test_db_name)
    if not success:
        # Clean up the database if migration failed
        conn = get_connection(host, port, POSTGRES_DB)
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(f'DROP DATABASE IF EXISTS "{test_db_name}"')
        cursor.close()
        conn.close()
        pytest.fail(f"Migration failed: {error}")
    
    # Yield connection details
    yield {
        "host": host,
        "port": port,
        "user": POSTGRES_USER,
        "password": POSTGRES_PASSWORD,
        "dbname": test_db_name
    }
    
    # Cleanup: drop the test database
    try:
        conn = get_connection(host, port, POSTGRES_DB)
        conn.autocommit = True
        cursor = conn.cursor()
        # Terminate all connections to the test database
        cursor.execute(f"""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '{test_db_name}'
            AND pid <> pg_backend_pid()
        """)
        cursor.execute(f'DROP DATABASE IF EXISTS "{test_db_name}"')
        cursor.close()
        conn.close()
    except Exception:
        pass  # Best effort cleanup


@pytest.fixture
def db_connection(fresh_database):
    """Get a connection to the fresh test database."""
    conn = get_connection(
        fresh_database["host"],
        fresh_database["port"],
        fresh_database["dbname"]
    )
    yield conn
    conn.close()


@pytest.fixture
def db_cursor(db_connection):
    """Get a cursor to the fresh test database."""
    cursor = db_connection.cursor()
    yield cursor
    cursor.close()


@pytest.fixture
def migration_sql():
    """Get the migration SQL content."""
    return get_migration_sql()
