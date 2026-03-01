"""
Celery application factory and base task configuration.
"""
from celery import Celery
from celery.schedules import crontab
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "uzumbot",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.notifications",
        "app.tasks.reports",
        "app.tasks.gamification",
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
        # ── Existing ──────────────────────────────────────────────────────────
        "expire-old-spin-commitments": {
            "task": "app.tasks.notifications.expire_spin_commitments",
            "schedule": 300.0,  # every 5 minutes
        },
        "daily-summary-report": {
            "task": "app.tasks.reports.send_daily_summary",
            "schedule": 86400.0,  # every 24 hours
        },
        # ── Gamification ──────────────────────────────────────────────────────
        # Warn users at risk of losing their streak at 15:00 UTC daily
        "check-streak-risks": {
            "task": "app.tasks.gamification.check_streak_risks",
            "schedule": crontab(hour=15, minute=0),
        },
        # Generate daily missions at 19:00 UTC (midnight Tashkent)
        "generate-daily-missions": {
            "task": "app.tasks.gamification.generate_daily_missions",
            "schedule": crontab(hour=19, minute=0),
        },
        # Refresh leaderboards every 5 minutes
        "compute-leaderboards": {
            "task": "app.tasks.gamification.compute_leaderboards",
            "schedule": 300.0,
        },
        # Award leaderboard winners every Sunday at 19:00 UTC
        "award-leaderboard-winners": {
            "task": "app.tasks.gamification.award_leaderboard_winners",
            "schedule": crontab(hour=19, minute=0, day_of_week="sunday"),
        },
        # Send weekly summary to users every Monday at 04:00 UTC
        "send-weekly-summary": {
            "task": "app.tasks.gamification.send_weekly_summary",
            "schedule": crontab(hour=4, minute=0, day_of_week="monday"),
        },
        # Recompute fraud scores nightly at 03:00 UTC
        "recompute-fraud-scores": {
            "task": "app.tasks.gamification.recompute_fraud_scores",
            "schedule": crontab(hour=3, minute=0),
        },
        # Expire old unclaimed rewards every hour
        "expire-old-rewards": {
            "task": "app.tasks.gamification.expire_old_rewards",
            "schedule": 3600.0,
        },
    },
)
