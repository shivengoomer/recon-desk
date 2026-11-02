from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, imports, mappings, partners
from app.config import settings

app = FastAPI(title="recon-desk")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
for r in (auth.router, partners.router, mappings.router, imports.router):
    app.include_router(r)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
