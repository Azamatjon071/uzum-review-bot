"""
Celery application factory and base task configuration.
"""
from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "uzumbot",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.notifications",
        "app.tasks.reports",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Tashkent",
    enable_utc=True,
    # Retry policy defaults
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_max_retries=3,
    # Result expiry
    result_expires=3600,
    # Beat schedule
    beat_schedule={
        "expire-old-spin-commitments": {
            "task": "app.tasks.notifications.expire_spin_commitments",
            "schedule": 300.0,  # every 5 minutes
        },
        "daily-summary-report": {
            "task": "app.tasks.reports.send_daily_summary",
            "schedule": 86400.0,  # every 24 hours
        },
    },
)
