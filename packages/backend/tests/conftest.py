"""
Test configuration and fixtures.
Tests run against the live server at https://uzum.n8nautomate.me
"""
import pytest
import httpx

BASE_URL = "https://uzum.n8nautomate.me"
ADMIN_EMAIL = "admin@uzumbot.dev"
ADMIN_PASSWORD = "Admin1234567!"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def client():
    """Synchronous httpx client for simple tests."""
    with httpx.Client(base_url=BASE_URL, timeout=30) as c:
        yield c


@pytest.fixture(scope="session")
def admin_token(client):
    """Get admin JWT token."""
    resp = client.post("/api/v1/auth/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    data = resp.json()
    return data["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
