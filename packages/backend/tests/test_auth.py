"""Tests for admin authentication endpoint."""
import pytest


def test_admin_login_success(client):
    resp = client.post("/api/v1/auth/admin/login", json={
        "email": "admin@uzumbot.dev",
        "password": "Admin1234567!",
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "access_token" in data
    assert data["access_token"]


def test_admin_login_wrong_password(client):
    resp = client.post("/api/v1/auth/admin/login", json={
        "email": "admin@uzumbot.dev",
        "password": "wrongpassword",
    })
    assert resp.status_code in (401, 403, 400), f"Expected auth failure, got {resp.status_code}"


def test_admin_login_wrong_email(client):
    resp = client.post("/api/v1/auth/admin/login", json={
        "email": "notexist@uzumbot.dev",
        "password": "Admin1234567!",
    })
    assert resp.status_code in (401, 403, 404, 400)


def test_unauthenticated_user_endpoint(client):
    """Accessing a protected endpoint without token should return 401."""
    resp = client.get("/api/v1/me")
    assert resp.status_code == 401
