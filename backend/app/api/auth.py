import secrets
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import audit
from app.config import settings
from app.db import get_db
from app.models import User
from app.models.core import Role
from app.security import ANY_STAFF, create_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Single-process in-memory limiter: 5 failed logins per 60s per (ip, email). Fine for one service instance.
_FAILS: dict[tuple[str, str], deque] = defaultdict(deque)
WINDOW, MAX_FAILS = 60, 5


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+$")
    password: str = Field(min_length=1, max_length=200)


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str


def _limited(key: tuple[str, str]) -> bool:
    q = _FAILS[key]
    while q and q[0] < time.monotonic() - WINDOW:
        q.popleft()
    return len(q) >= MAX_FAILS


@router.post("/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)) -> dict:
    key = (request.client.host if request.client else "?", body.email.lower())
    if _limited(key):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Try again in a minute.")
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        _FAILS[key].append(time.monotonic())
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    _FAILS.pop(key, None)
    audit(db, user.id, "auth.login", "user", user.id)
    db.commit()
    return {"access_token": create_token(user), "token_type": "bearer",
            "user": UserOut(id=user.id, email=user.email, name=user.name, role=user.role.value)}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(ANY_STAFF)) -> UserOut:
    return UserOut(id=user.id, email=user.email, name=user.name, role=user.role.value)


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+$")
    password: str = Field(min_length=10, max_length=200)
    invite_code: str = Field(min_length=1, max_length=200)


@router.get("/config")
def auth_config() -> dict:
    """Lets the sign-in page decide whether to offer registration."""
    return {"registration_enabled": bool(settings.registration_invite_code)}


@router.post("/register", status_code=201)
def register(body: RegisterIn, request: Request, db: Session = Depends(get_db)) -> dict:
    """Invite-code registration. New accounts are finance executives; the co-founder role is never self-assigned."""
    if not settings.registration_invite_code:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registration is not enabled")
    key = (request.client.host if request.client else "?", "register")
    if _limited(key):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Try again in a minute.")
    if not secrets.compare_digest(body.invite_code.encode(), settings.registration_invite_code.encode()):
        _FAILS[key].append(time.monotonic())
        raise HTTPException(status.HTTP_403_FORBIDDEN, "That invite code is not valid")
    email = body.email.strip().lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with that email already exists")
    user = User(email=email, name=body.name.strip(), role=Role.finance_executive, password_hash=hash_password(body.password))
    db.add(user)
    db.flush()
    audit(db, user.id, "auth.register", "user", user.id, None, {"email": email, "role": user.role.value})
    db.commit()
    return {"access_token": create_token(user), "token_type": "bearer",
            "user": UserOut(id=user.id, email=user.email, name=user.name, role=user.role.value)}
