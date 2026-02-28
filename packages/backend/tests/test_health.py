"""Tests for health and public endpoints."""
import httpx
import pytest


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_openapi_docs_accessible(client):
    resp = client.get("/api/docs")
    assert resp.status_code == 200


def test_openapi_json_accessible(client):
    resp = client.get("/api/openapi.json")
    assert resp.status_code == 200
    data = resp.json()
    assert "paths" in data
    assert "openapi" in data
