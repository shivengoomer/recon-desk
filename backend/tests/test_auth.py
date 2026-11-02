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
