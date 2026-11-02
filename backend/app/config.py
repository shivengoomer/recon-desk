from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    jwt_secret: str = ""
    jwt_expire_minutes: int = 60
    frontend_origin: str = ""
    demo_analyst_password: str = ""
    demo_admin_password: str = ""
    llm_enabled: bool = False
    gemini_api_key: str = ""


settings = Settings()
