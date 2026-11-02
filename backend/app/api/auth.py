import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import audit
from app.db import get_db
from app.models import User
from app.security import ANY_STAFF, create_token, verify_password

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
