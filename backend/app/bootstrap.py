"""Reference data every environment needs: partners, settings, demo users (passwords from env)."""
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models import AppSetting, Partner, User
from app.models.core import PartnerKind, Role
from app.security import hash_password

PARTNERS = [
    # code, name, kind, settlement_due_days
    ("WEB", "Website", PartnerKind.channel, 7),
    ("MP1", "Marketplace 1", PartnerKind.channel, 10),
    ("MP2", "Marketplace 2", PartnerKind.channel, 8),
    ("MP3", "Marketplace 3", PartnerKind.channel, 7),
    ("QC1", "Quick-commerce 1", PartnerKind.channel, 5),
    ("QC2", "Quick-commerce 2", PartnerKind.channel, 5),
    ("SWIFT", "SwiftShip", PartnerKind.courier, 7),
    ("KARGO", "KargoLink", PartnerKind.courier, 8),
]
SETTINGS = {"tolerance_inr": "10"}


def ensure_reference_data(db: Session, executive_password: str = "", cofounder_password: str = "") -> None:
    for code, name, kind, due in PARTNERS:
        db.execute(pg_insert(Partner).values(code=code, name=name, kind=kind, settlement_due_days=due)
                   .on_conflict_do_nothing(index_elements=["code"]))
    for k, v in SETTINGS.items():
        db.execute(pg_insert(AppSetting).values(key=k, value=v).on_conflict_do_nothing(index_elements=["key"]))
    for email, name, role, pw in (
        ("exec@recon.example", "Asha Rao (Finance Executive)", Role.finance_executive, executive_password),
        ("founder@recon.example", "Vikram Shah (Co-founder)", Role.cofounder, cofounder_password),
    ):
        if pw and db.scalar(select(User.id).where(User.email == email)) is None:
            db.add(User(email=email, name=name, role=role, password_hash=hash_password(pw)))
    db.flush()
