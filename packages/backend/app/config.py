from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List, Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    API_BASE_URL: str = "http://localhost:8000"
    ADMIN_URL: str = "http://localhost:4000"
    WEBAPP_URL: str = "http://localhost:5000"
    PUBLIC_DOMAIN: str = "localhost"          # e.g. uzum.n8nautomate.me

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://uzumbot:changeme@localhost:5432/uzumbot"

    # Redis
    REDIS_URL: str = "redis://:changeme@localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://:changeme@localhost:6379/1"

    # MinIO / S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "changeme123"
    MINIO_BUCKET: str = "uzumbot-files"
    MINIO_PUBLIC_URL: str = "http://localhost:9000/uzumbot-files"
    # Public base URL for presigned URL rewriting (e.g. https://domain.com/minio)
    # Leave empty to skip rewriting (presigned URLs will use MINIO_ENDPOINT directly)
    MINIO_PUBLIC_BASE_URL: str = ""
    MINIO_SECURE: bool = False

    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_REFRESH_SECRET: str = "dev-refresh-secret"
    ADMIN_JWT_SECRET: str = "dev-admin-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_EXPIRE_DAYS: int = 30
    ADMIN_JWT_EXPIRE_HOURS: int = 8

    # Telegram
    BOT_TOKEN: str = ""
    BOT_WEBHOOK_SECRET: str = ""
    BOT_WEBHOOK_URL: str = ""
    BOT_USERNAME: str = ""
    SUPPORT_USERNAME: str = "support"          # Telegram support handle (no @)

    # CORS
    CORS_ORIGINS: str = "http://localhost:4000,http://localhost:5000"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: str = "image/jpeg,image/png,image/webp"

    # Business Logic
    MAX_SUBMISSIONS_PER_DAY: int = 3
    MAX_IMAGES_PER_SUBMISSION: int = 5
    SPIN_COOLDOWN_HOURS: int = 24
    REFERRAL_BONUS_SPINS: int = 1             # spins granted to referrer per successful referral

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def allowed_image_types_list(self) -> List[str]:
        return [t.strip() for t in self.ALLOWED_IMAGE_TYPES.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
