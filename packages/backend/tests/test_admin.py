"""Tests for admin endpoints — prizes, users, submissions."""
import pytest


def test_admin_get_prizes(client, admin_headers):
    resp = client.get("/api/v1/admin/prizes", headers=admin_headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "prizes" in data
    assert isinstance(data["prizes"], list)


def test_admin_prizes_schema(client, admin_headers):
    """Each prize should have all required fields."""
    resp = client.get("/api/v1/admin/prizes", headers=admin_headers)
    assert resp.status_code == 200
    for p in resp.json()["prizes"]:
        assert "id" in p
        assert "name_uz" in p
        assert "name_ru" in p
        assert "name_en" in p
        assert "is_active" in p
        assert "weight" in p


def test_admin_toggle_prize(client, admin_headers):
    """Toggle prize should work — returns is_active in response."""
    # First get a prize id
    resp = client.get("/api/v1/admin/prizes", headers=admin_headers)
    assert resp.status_code == 200
    prizes = resp.json()["prizes"]
    if not prizes:
        pytest.skip("No prizes in DB — skipping toggle test")

    prize_id = prizes[0]["id"]
    original_active = prizes[0]["is_active"]

    # Toggle
    resp2 = client.patch(f"/api/v1/admin/prizes/{prize_id}/toggle", headers=admin_headers)
    assert resp2.status_code == 200, f"Toggle failed: {resp2.status_code}: {resp2.text}"
    data = resp2.json()
    assert "is_active" in data
    assert data["is_active"] != original_active

    # Toggle back to restore state
    client.patch(f"/api/v1/admin/prizes/{prize_id}/toggle", headers=admin_headers)


def test_admin_get_users(client, admin_headers):
    resp = client.get("/api/v1/admin/users", headers=admin_headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "users" in data or "items" in data


def test_admin_get_submissions(client, admin_headers):
    resp = client.get("/api/v1/admin/submissions", headers=admin_headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"


def test_admin_get_products(client, admin_headers):
    resp = client.get("/api/v1/admin/products", headers=admin_headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    # Admin products router returns {items: [...], total: ...}
    assert "items" in data or "products" in data


def test_admin_requires_auth(client):
    """Admin endpoints should reject unauthenticated requests."""
    resp = client.get("/api/v1/admin/prizes")
    assert resp.status_code == 401


def test_admin_create_and_delete_prize(client, admin_headers):
    """Create a test prize then deactivate (soft-delete) it."""
    payload = {
        "name_uz": "Test Sovg'a",
        "name_ru": "Тестовый приз",
        "name_en": "Test Prize",
        "prize_type": "gift",
        "value": 10000,
        "weight": 1,
        "color": "#ff0000",
        "is_active": True,
    }
    # Create
    resp = client.post("/api/v1/admin/prizes", json=payload, headers=admin_headers)
    assert resp.status_code == 201, f"Create failed: {resp.status_code}: {resp.text}"
    prize_id = resp.json()["id"]

    # Delete (soft)
    resp2 = client.delete(f"/api/v1/admin/prizes/{prize_id}", headers=admin_headers)
    assert resp2.status_code == 200, f"Delete failed: {resp2.status_code}: {resp2.text}"
