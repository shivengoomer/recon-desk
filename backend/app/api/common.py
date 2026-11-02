from decimal import Decimal

from pydantic import BaseModel


class Page(BaseModel):
    total: int
    page: int
    page_size: int


def money(v: Decimal | None) -> str | None:
    return None if v is None else f"{v:.2f}"
