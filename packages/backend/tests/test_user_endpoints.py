"""Tests for protected user endpoints (submissions, rewards, me) — auth required."""
import pytest


def test_submissions_requires_auth(client):
    resp = client.get("/api/v1/submissions")
    assert resp.status_code == 401


def test_rewards_requires_auth(client):
    resp = client.get("/api/v1/rewards")
    assert resp.status_code == 401


def test_me_requires_auth(client):
    resp = client.get("/api/v1/me")
    assert resp.status_code == 401


def test_me_referral_requires_auth(client):
    resp = client.get("/api/v1/me/referral")
    assert resp.status_code == 401


def test_claim_reward_requires_auth(client):
    import uuid
    resp = client.post(f"/api/v1/rewards/{uuid.uuid4()}/claim")
    assert resp.status_code == 401


def test_donate_reward_requires_auth(client):
    import uuid
    resp = client.post(f"/api/v1/rewards/{uuid.uuid4()}/donate")
    assert resp.status_code == 401


def test_create_submission_requires_auth(client):
    resp = client.post("/api/v1/submissions", data={"product_url": "https://uzum.uz/test"})
    assert resp.status_code == 401
