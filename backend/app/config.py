from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    database_url: str = ""
    jwt_secret: str = ""
    jwt_expire_minutes: int = 60
    frontend_origin: str = "http://localhost:3000"
    demo_executive_password: str = ""
    demo_cofounder_password: str = ""
    llm_enabled: bool = False
    gemini_api_key: str = ""
    upload_max_mb: int = 25


settings = Settings()
