from tests.conftest import login


def test_unauthenticated_gets_401(client):
    for path in ("/api/partners", "/api/imports", "/api/auth/me"):
        assert client.get(path).status_code == 401


def test_bad_token_gets_401(client):
    assert client.get("/api/partners", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_login_and_me(client):
    h = login(client, "founder")
    me = client.get("/api/auth/me", headers=h).json()
    assert me["role"] == "cofounder"


def test_wrong_password_401_and_rate_limit(client):
    for _ in range(5):
        r = client.post("/api/auth/login", json={"email": "exec@recon.example", "password": "bad"})
        assert r.status_code == 401
    r = client.post("/api/auth/login", json={"email": "exec@recon.example", "password": "bad"})
    assert r.status_code == 429


def test_login_validation_is_clean_json(client):
    r = client.post("/api/auth/login", json={"email": "x"})
    assert r.status_code == 422 and "detail" in r.json()


def _reg(client, **over):
    body = {"name": "New Person", "email": "new@recon.example", "password": "a-long-password", "invite_code": "invite-123", **over}
    return client.post("/api/auth/register", json=body)


def test_registration_disabled_without_invite_code(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "registration_invite_code", "")
    assert client.get("/api/auth/config").json() == {"registration_enabled": False}
    assert _reg(client).status_code == 404


def test_registration_flow(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "registration_invite_code", "invite-123")
    assert client.get("/api/auth/config").json() == {"registration_enabled": True}
    assert _reg(client, invite_code="wrong").status_code == 403
    assert _reg(client, password="short").status_code == 422
    assert _reg(client, email="not-an-email").status_code == 422
    ok = _reg(client)
    assert ok.status_code == 201
    body = ok.json()
    assert body["user"]["role"] == "finance_executive"  # never self-assigned co-founder
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert _reg(client).status_code == 409  # duplicate email
    login = client.post("/api/auth/login", json={"email": "new@recon.example", "password": "a-long-password"})
    assert login.status_code == 200
    # a new executive cannot reach co-founder routes
    assert client.get("/api/audit-log", headers={"Authorization": f"Bearer {body['access_token']}"}).status_code == 403


def test_registration_invite_attempts_are_rate_limited(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "registration_invite_code", "invite-123")
    for _ in range(5):
        assert _reg(client, invite_code="guess").status_code == 403
    assert _reg(client, invite_code="guess").status_code == 429
