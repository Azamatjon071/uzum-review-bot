"""Tests for spin endpoints (public — no user auth needed for prizes/verify)."""
import pytest


def test_get_prizes(client):
    """Public prize list."""
    resp = client.get("/api/v1/spins/prizes")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "prizes" in data
    assert isinstance(data["prizes"], list)


def test_prizes_schema(client):
    """Each prize should have all required fields including multilingual names."""
    resp = client.get("/api/v1/spins/prizes")
    assert resp.status_code == 200
    for p in resp.json()["prizes"]:
        assert "id" in p
        assert "name_uz" in p
        assert "name_ru" in p
        assert "name_en" in p
        assert "weight" in p
        assert "probability_pct" in p
        assert "color" in p


def test_eligibility_requires_auth(client):
    resp = client.get("/api/v1/spins/eligibility")
    assert resp.status_code == 401


def test_commit_requires_auth(client):
    resp = client.post("/api/v1/spins/commit")
    assert resp.status_code == 401


def test_execute_requires_auth(client):
    import uuid
    resp = client.post("/api/v1/spins/execute", json={"commitment_id": str(uuid.uuid4())})
    assert resp.status_code == 401


def test_commitments_requires_auth(client):
    resp = client.get("/api/v1/spins/commitments")
    assert resp.status_code == 401


def test_history_requires_auth(client):
    resp = client.get("/api/v1/spins/history")
    assert resp.status_code == 401


def test_verify_spin_not_found(client):
    """Verify with random UUID returns 404."""
    import uuid
    resp = client.post("/api/v1/spins/verify", json={
        "spin_id": str(uuid.uuid4()),
        "server_seed": "a" * 64,
        "nonce": "b" * 32,
        "seed_hash": "c" * 64,
    })
    assert resp.status_code == 404
