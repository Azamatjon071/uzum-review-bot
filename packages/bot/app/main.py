"""
Bot entrypoint.
- Production: webhook mode (aiohttp server on port 8080)
- Development: long-polling mode
"""
import asyncio
import logging

import structlog
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiohttp import web

from app.config import get_settings
from app.middlewares import UserMiddleware
from app.handlers import common, language, submit, status

settings = get_settings()

structlog.configure(
    wrapper_class=structlog.make_filtering_bound_logger(
        logging.getLevelName(settings.LOG_LEVEL)
    ),
)
log = structlog.get_logger()


def create_dispatcher() -> Dispatcher:
    # Use RedisStorage so FSM state survives bot restarts
    storage = RedisStorage.from_url(settings.REDIS_URL)
    dp = Dispatcher(storage=storage)

    # Middleware
    dp.update.middleware(UserMiddleware())

    # Routers
    dp.include_router(common.router)
    dp.include_router(language.router)
    dp.include_router(submit.router)
    dp.include_router(status.router)

    return dp


async def on_startup(bot: Bot) -> None:
    if settings.BOT_WEBHOOK_URL:
        webhook_url = f"{settings.BOT_WEBHOOK_URL}{settings.BOT_WEBHOOK_PATH}"
        await bot.set_webhook(
            url=webhook_url,
            secret_token=settings.BOT_WEBHOOK_SECRET,
            allowed_updates=["message", "callback_query"],
        )
        log.info("Webhook set", url=webhook_url)
    else:
        log.info("Webhook URL not set, using polling")

    # Set bot commands — include ALL available commands
    from aiogram.types import BotCommand, BotCommandScopeDefault
    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Bosh menyu"),
            BotCommand(command="submit", description="Sharh yuborish"),
            BotCommand(command="status", description="Sharhlarim"),
            BotCommand(command="myspins", description="Spinlarim"),
            BotCommand(command="referral", description="Taklif dasturi"),
            BotCommand(command="wallet", description="Mukofotlarim"),
            BotCommand(command="charity", description="Xayriya"),
            BotCommand(command="language", description="Tilni o'zgartirish"),
            BotCommand(command="help", description="Yordam"),
        ],
        scope=BotCommandScopeDefault(),
    )


async def on_shutdown(bot: Bot) -> None:
    if settings.BOT_WEBHOOK_URL:
        await bot.delete_webhook()
    log.info("Bot shutdown")


def main() -> None:
    bot = Bot(
        token=settings.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = create_dispatcher()
    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)

    if settings.ENVIRONMENT == "production" and settings.BOT_WEBHOOK_URL:
        # Webhook mode — run lightweight aiohttp server
        app = web.Application()
        handler = SimpleRequestHandler(dispatcher=dp, bot=bot, secret_token=settings.BOT_WEBHOOK_SECRET)
        handler.register(app, path=settings.BOT_WEBHOOK_PATH)
        setup_application(app, dp, bot=bot)
        log.info("Starting bot in webhook mode", port=8080)
        web.run_app(app, host="0.0.0.0", port=8080)
    else:
        # Polling mode (development)
        log.info("Starting bot in polling mode")
        asyncio.run(dp.start_polling(bot, allowed_updates=["message", "callback_query"]))


if __name__ == "__main__":
    main()
