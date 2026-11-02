"""Suggest a column mapping from file headers. Deterministic heuristics (synonyms + string similarity).

This is the "AI proposes mappings" step: it only proposes; a person previews on 20 rows and approves.
"""
import re
from difflib import SequenceMatcher

from app.ingest.fields import FIELDS
from app.models.core import FileKind


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower().replace("₹", " ")).strip()


def suggest_mapping(kind: FileKind, headers: list[str]) -> dict[str, dict]:
    """Return {target_field: {"column": header, "confidence": 0..1}} choosing each header at most once."""
    candidates: list[tuple[float, str, str]] = []
    for f in FIELDS[kind]:
        names = {_norm(f.name), _norm(f.label), *(_norm(s) for s in f.synonyms)}
        for h in headers:
            hn = _norm(h)
            if not hn:
                continue
            if hn in names:
                score = 1.0
            else:
                score = max(SequenceMatcher(None, hn, n).ratio() for n in names)
                if any(n and (n in hn or hn in n) for n in names if len(n) > 3):
                    score = max(score, 0.75)
            if score >= 0.6:
                candidates.append((score, f.name, h))
    result: dict[str, dict] = {}
    used: set[str] = set()
    for score, field, header in sorted(candidates, reverse=True):
        if field in result or header in used:
            continue
        result[field] = {"column": header, "confidence": round(score, 2)}
        used.add(header)
    return result
