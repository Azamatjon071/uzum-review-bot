from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    BOT_TOKEN: str
    BOT_WEBHOOK_URL: str = ""
    BOT_WEBHOOK_SECRET: str = ""
    BOT_WEBHOOK_PATH: str = "/api/v1/webhook/telegram"

    API_BASE_URL: str = "http://backend:8000"
    WEBAPP_URL: str = "http://localhost:5000"

    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
