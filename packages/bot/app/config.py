from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pydantic import model_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    BOT_TOKEN: str
    BOT_WEBHOOK_URL: str = ""
    BOT_WEBHOOK_SECRET: str = ""
    BOT_WEBHOOK_PATH: str = "/api/v1/webhook/telegram"
    # Shared HMAC secret for signing bot→backend requests (must match backend BOT_API_HMAC_SECRET)
    BOT_API_HMAC_SECRET: str = ""

    API_BASE_URL: str = "http://backend:8000"
    WEBAPP_URL: str = "http://localhost:5000"
    REDIS_URL: str = "redis://redis:6379/2"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.is_production:
            if "localhost" in self.WEBAPP_URL:
                raise ValueError("WEBAPP_URL must not be localhost in production")
            if not self.BOT_API_HMAC_SECRET:
                raise ValueError("BOT_API_HMAC_SECRET is required in production")
        return self

    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    BOT_USERNAME: str = "pprosta_bot"
    SUPPORT_USERNAME: str = "pprosta_bot"


@lru_cache
def get_settings() -> Settings:
    return Settings()
