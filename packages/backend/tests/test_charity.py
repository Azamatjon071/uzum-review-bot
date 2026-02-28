"""Tests for charity endpoints."""
import pytest


def test_get_campaigns_no_auth(client):
    """Charity campaigns are publicly accessible."""
    resp = client.get("/api/v1/charity/campaigns")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "campaigns" in data
    assert isinstance(data["campaigns"], list)


def test_campaigns_schema(client):
    """Each campaign should have expected fields."""
    resp = client.get("/api/v1/charity/campaigns")
    assert resp.status_code == 200
    for c in resp.json()["campaigns"]:
        assert "id" in c
        assert "goal_amount" in c
        assert "raised_amount" in c
        assert "progress_pct" in c


def test_charity_leaderboard(client):
    resp = client.get("/api/v1/charity/leaderboard")
    assert resp.status_code == 200
    data = resp.json()
    assert "leaderboard" in data
    assert isinstance(data["leaderboard"], list)


def test_donate_requires_auth(client):
    """Donation requires user auth."""
    resp = client.post("/api/v1/charity/donate", json={"amount": 10000})
    assert resp.status_code == 401


def test_donate_with_invalid_body(client):
    """POST with no amount should fail validation (after auth, but auth fails first)."""
    resp = client.post("/api/v1/charity/donate", json={})
    assert resp.status_code == 401  # auth before body validation
