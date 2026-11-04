import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.security import _FAILED_LOGIN_ATTEMPTS


@pytest.fixture
def client():
    return TestClient(app)


def test_admin_login_success_sets_cookies(client):
    """Test that login with valid admin credentials returns CSRF token and sets HttpOnly cookie."""
    _FAILED_LOGIN_ATTEMPTS.clear()
    res = client.post(
        "/api/v1/admin/auth/login",
        json={"username": settings.ADMIN_USERNAME, "password": settings.ADMIN_INITIAL_PASSWORD},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == settings.ADMIN_USERNAME
    assert "csrf_token" in data
    assert len(data["csrf_token"]) > 10

    # Verify cookies in client jar
    assert settings.ADMIN_COOKIE_NAME in client.cookies
    assert settings.ADMIN_CSRF_COOKIE_NAME in client.cookies

    # Verify Set-Cookie header contains HttpOnly, Path=/, SameSite=lax
    set_cookie_headers = [v for k, v in res.headers.items() if k.lower() == "set-cookie"]
    cookie_str = "; ".join(set_cookie_headers)
    assert settings.ADMIN_COOKIE_NAME in cookie_str
    assert "httponly" in cookie_str.lower()
    assert "path=/" in cookie_str.lower()


def test_admin_login_invalid_password(client):
    """Test that login with incorrect password returns 401."""
    _FAILED_LOGIN_ATTEMPTS.clear()
    res = client.post(
        "/api/v1/admin/auth/login",
        json={"username": settings.ADMIN_USERNAME, "password": "wrong-password-123"},
    )
    assert res.status_code == 401
    assert "Invalid administrator credentials" in res.json()["detail"]


def test_admin_login_rate_limiting(client):
    """Test that repeated invalid logins trigger 429 Too Many Requests."""
    _FAILED_LOGIN_ATTEMPTS.clear()
    for _ in range(5):
        client.post(
            "/api/v1/admin/auth/login",
            json={"username": settings.ADMIN_USERNAME, "password": "bad-attempt"},
        )

    # 6th attempt should be blocked with 429
    res_blocked = client.post(
        "/api/v1/admin/auth/login",
        json={"username": settings.ADMIN_USERNAME, "password": "bad-attempt"},
    )
    assert res_blocked.status_code == 429
    assert "Too many failed login attempts" in res_blocked.json()["detail"]
    _FAILED_LOGIN_ATTEMPTS.clear()


def test_protected_admin_endpoint_without_auth(client):
    """Test that accessing admin endpoint without credentials returns 401."""
    client.cookies.clear()
    res = client.get("/api/v1/admin/stats")
    assert res.status_code == 401
    assert "Authentication required" in res.json()["detail"]


def test_admin_csrf_protection_on_state_changing_requests(client):
    """Test that POST/PUT/DELETE via cookie without X-CSRF-Token returns 403."""
    _FAILED_LOGIN_ATTEMPTS.clear()
    login_res = client.post(
        "/api/v1/admin/auth/login",
        json={"username": settings.ADMIN_USERNAME, "password": settings.ADMIN_INITIAL_PASSWORD},
    )
    assert login_res.status_code == 200
    csrf_token = login_res.json()["csrf_token"]

    # State-changing request without CSRF header should fail with 403
    res_no_csrf = client.post("/api/v1/admin/companies", json={"name": "Test CSRF Co"})
    assert res_no_csrf.status_code == 403
    assert "CSRF validation failed" in res_no_csrf.json()["detail"]

    # State-changing request with valid CSRF header should pass CSRF check
    import time
    unique_slug = f"csrf-temp-{int(time.time() * 1000)}"
    res_with_csrf = client.post(
        "/api/v1/admin/companies",
        json={"name": "Temp CSRF Co", "slug": unique_slug, "industry": "DevTools"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res_with_csrf.status_code == 200

    # Cleanup created temp company
    comp_id = res_with_csrf.json()["id"]
    client.delete(f"/api/v1/admin/companies/{comp_id}", headers={"X-CSRF-Token": csrf_token})


def test_admin_get_me_and_logout(client):
    """Test retrieving current admin profile and logging out."""
    _FAILED_LOGIN_ATTEMPTS.clear()
    login_res = client.post(
        "/api/v1/admin/auth/login",
        json={"username": settings.ADMIN_USERNAME, "password": settings.ADMIN_INITIAL_PASSWORD},
    )
    assert login_res.status_code == 200

    # /me should succeed with active session cookie
    res_me = client.get("/api/v1/admin/auth/me")
    assert res_me.status_code == 200
    assert res_me.json()["username"] == settings.ADMIN_USERNAME
    assert res_me.json()["is_active"] is True

    # Logout
    csrf = client.cookies.get(settings.ADMIN_CSRF_COOKIE_NAME)
    res_logout = client.post("/api/v1/admin/auth/logout", headers={"X-CSRF-Token": csrf})
    assert res_logout.status_code == 200

    # After logout, accessing me should return 401
    res_me_after = client.get("/api/v1/admin/auth/me")
    assert res_me_after.status_code == 401


def test_admin_cors_headers_with_credentials(client):
    """Test that CORS preflight from allowed origins returns Access-Control-Allow-Credentials: true."""
    for origin in ["http://localhost:3000", "http://127.0.0.1:3000"]:
        res = client.options(
            "/api/v1/admin/auth/me",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "x-csrf-token",
            },
        )
        assert res.status_code == 200
        assert res.headers.get("access-control-allow-origin") == origin
        assert res.headers.get("access-control-allow-credentials") == "true"
