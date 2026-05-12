"""
Basic smoke tests for m2-master service.
"""
from pathlib import Path


def test_app_module_exists():
    """Verify the app module structure is present."""
    app_dir = Path(__file__).parent.parent / "app"
    assert app_dir.exists(), "app/ directory must exist"
    assert (app_dir / "main.py").exists(), "app/main.py must exist"


def test_requirements_file_exists():
    """Verify requirements.txt is present for reproducible builds."""
    req_file = Path(__file__).parent.parent / "requirements.txt"
    assert req_file.exists(), "requirements.txt must exist"
    content = req_file.read_text()
    assert "fastapi" in content.lower(), "fastapi must be in requirements.txt"
