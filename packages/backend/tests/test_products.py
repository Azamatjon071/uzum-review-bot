"""Tests for public products endpoint."""
import pytest


def test_list_products_no_auth(client):
    """Public products endpoint requires no authentication."""
    resp = client.get("/api/v1/products")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "products" in data
    assert "total" in data
    assert isinstance(data["products"], list)


def test_list_products_search(client):
    """Search param should filter without crashing."""
    resp = client.get("/api/v1/products", params={"search": "test"})
    assert resp.status_code == 200
    data = resp.json()
    assert "products" in data


def test_list_products_pagination(client):
    """Pagination params should work."""
    resp = client.get("/api/v1/products", params={"page": 1, "page_size": 5})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["products"]) <= 5


def test_products_schema(client):
    """Each product should have required fields."""
    resp = client.get("/api/v1/products")
    assert resp.status_code == 200
    products = resp.json()["products"]
    for p in products:
        assert "id" in p
        assert "name_uz" in p
        assert "name_ru" in p
        assert "name_en" in p
