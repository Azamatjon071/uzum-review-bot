"""
Lightweight i18n helper.
Usage:
    from app.i18n import t
    text = t("start.welcome", lang="uz", name="Ali")
"""
from typing import Any

STRINGS: dict[str, dict[str, str]] = {
    # ── /start ──────────────────────────────────────────────────────────────
    "start.welcome": {
        "uz": (
            "Assalomu alaykum, {name}! 👋\n\n"
            "Uzum Market'dagi xaridlaringizdan sharh yozing va ajoyib sovrinlar yuting! 🎁\n\n"
            "Boshlash uchun quyidagi tugmani bosing:"
        ),
        "ru": (
            "Привет, {name}! 👋\n\n"
            "Оставляйте отзывы о покупках на Uzum Market и выигрывайте призы! 🎁\n\n"
            "Нажмите кнопку ниже, чтобы начать:"
        ),
        "en": (
            "Hello, {name}! 👋\n\n"
            "Share your Uzum Market purchase reviews and win amazing prizes! 🎁\n\n"
            "Press the button below to get started:"
        ),
    },
    "start.returning": {
        "uz": "Xush kelibsiz qaytib, {name}! Sharh yuborish uchun /submit buyrug'ini ishlating.",
        "ru": "С возвращением, {name}! Используйте /submit чтобы отправить отзыв.",
        "en": "Welcome back, {name}! Use /submit to send a review.",
    },

    # ── Language selection ───────────────────────────────────────────────────
    "lang.choose": {
        "uz": "Tilni tanlang / Выберите язык / Choose language:",
        "ru": "Tilni tanlang / Выберите язык / Choose language:",
        "en": "Tilni tanlang / Выберите язык / Choose language:",
    },
    "lang.changed": {
        "uz": "Til o'zgartirildi: O'zbek 🇺🇿",
        "ru": "Язык изменён: Русский 🇷🇺",
        "en": "Language changed: English 🇬🇧",
    },

    # ── /help ────────────────────────────────────────────────────────────────
    "help.text": {
        "uz": (
            "<b>Yordam</b>\n\n"
            "/start — Bosh menyu\n"
            "/submit — Sharh yuborish\n"
            "/status — Mening sharhlarim\n"
            "/wallet — Mening mukofotlarim\n"
            "/charity — Xayriya\n"
            "/help — Yordam\n\n"
            "<i>Savollar bo'lsa @support_username ga murojaat qiling.</i>"
        ),
        "ru": (
            "<b>Помощь</b>\n\n"
            "/start — Главное меню\n"
            "/submit — Отправить отзыв\n"
            "/status — Мои отзывы\n"
            "/wallet — Мои награды\n"
            "/charity — Благотворительность\n"
            "/help — Помощь\n\n"
            "<i>По вопросам обращайтесь к @support_username.</i>"
        ),
        "en": (
            "<b>Help</b>\n\n"
            "/start — Main menu\n"
            "/submit — Submit a review\n"
            "/status — My reviews\n"
            "/wallet — My rewards\n"
            "/charity — Charity\n"
            "/help — Help\n\n"
            "<i>For questions contact @support_username.</i>"
        ),
    },

    # ── Submission FSM ───────────────────────────────────────────────────────
    "submit.ask_url": {
        "uz": (
            "📦 <b>Sharh yuborish</b>\n\n"
            "Uzum Market'dagi mahsulot havolasini yuboring.\n"
            "<i>Masalan: https://uzum.uz/product/...</i>"
        ),
        "ru": (
            "📦 <b>Отправить отзыв</b>\n\n"
            "Отправьте ссылку на товар с Uzum Market.\n"
            "<i>Например: https://uzum.uz/product/...</i>"
        ),
        "en": (
            "📦 <b>Submit a review</b>\n\n"
            "Send the link to the product on Uzum Market.\n"
            "<i>Example: https://uzum.uz/product/...</i>"
        ),
    },
    "submit.invalid_url": {
        "uz": "❌ Noto'g'ri havola. Uzum Market mahsulot havolasini yuboring.",
        "ru": "❌ Неверная ссылка. Отправьте ссылку на товар Uzum Market.",
        "en": "❌ Invalid link. Please send an Uzum Market product URL.",
    },
    "submit.ask_screenshots": {
        "uz": (
            "✅ Havola qabul qilindi!\n\n"
            "Endi mahsulotingiz uchun yozgan sharhingizning skrinshotini yuboring.\n"
            "(<b>1–5 rasm</b>, JPEG yoki PNG)\n\n"
            "Hammasini yuborganingizdan so'ng <b>«Tayyor»</b> tugmasini bosing."
        ),
        "ru": (
            "✅ Ссылка принята!\n\n"
            "Теперь отправьте скриншот(ы) вашего отзыва на этот товар.\n"
            "(<b>1–5 фото</b>, JPEG или PNG)\n\n"
            "После загрузки всех фото нажмите <b>«Готово»</b>."
        ),
        "en": (
            "✅ Link accepted!\n\n"
            "Now send screenshot(s) of your review for this product.\n"
            "(<b>1–5 images</b>, JPEG or PNG)\n\n"
            "After uploading all images, press <b>«Done»</b>."
        ),
    },
    "submit.photo_added": {
        "uz": "📷 Rasm qo'shildi ({count}/5). Ko'proq yuboring yoki «Tayyor» tugmasini bosing.",
        "ru": "📷 Фото добавлено ({count}/5). Добавьте ещё или нажмите «Готово».",
        "en": "📷 Photo added ({count}/5). Add more or press «Done».",
    },
    "submit.max_photos": {
        "uz": "❗ Maksimal 5 ta rasm yuborishingiz mumkin. «Tayyor» tugmasini bosing.",
        "ru": "❗ Максимум 5 фотографий. Нажмите «Готово».",
        "en": "❗ Maximum 5 photos. Press «Done».",
    },
    "submit.no_photos": {
        "uz": "❌ Kamida 1 ta rasm yuborishingiz kerak.",
        "ru": "❌ Нужно отправить хотя бы 1 фото.",
        "en": "❌ You need to send at least 1 photo.",
    },
    "submit.sending": {
        "uz": "⏳ Yuborilmoqda...",
        "ru": "⏳ Отправляется...",
        "en": "⏳ Sending...",
    },
    "submit.success": {
        "uz": (
            "🎉 <b>Sharh yuborildi!</b>\n\n"
            "Sharh raqami: <code>#{submission_id}</code>\n"
            "Natija 24 soat ichida ma'lum qilinadi.\n\n"
            "Holat: /status"
        ),
        "ru": (
            "🎉 <b>Отзыв отправлен!</b>\n\n"
            "Номер отзыва: <code>#{submission_id}</code>\n"
            "Результат будет сообщён в течение 24 часов.\n\n"
            "Статус: /status"
        ),
        "en": (
            "🎉 <b>Review submitted!</b>\n\n"
            "Review ID: <code>#{submission_id}</code>\n"
            "You will be notified within 24 hours.\n\n"
            "Status: /status"
        ),
    },
    "submit.error": {
        "uz": "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
        "ru": "❌ Произошла ошибка. Пожалуйста, попробуйте снова.",
        "en": "❌ An error occurred. Please try again.",
    },
    "submit.duplicate": {
        "uz": "⚠️ Siz allaqachon shu mahsulot uchun sharh yuborgansiz.",
        "ru": "⚠️ Вы уже отправляли отзыв на этот товар.",
        "en": "⚠️ You already submitted a review for this product.",
    },
    "submit.daily_limit": {
        "uz": "⚠️ Bugun kunlik limitga yetdingiz (3 ta). Ertaga qayta urinib ko'ring.",
        "ru": "⚠️ Вы достигли дневного лимита (3 отзыва). Попробуйте завтра.",
        "en": "⚠️ You've reached today's limit (3 reviews). Try again tomorrow.",
    },
    "submit.cancelled": {
        "uz": "❌ Bekor qilindi.",
        "ru": "❌ Отменено.",
        "en": "❌ Cancelled.",
    },

    # ── Status ───────────────────────────────────────────────────────────────
    "status.header": {
        "uz": "📋 <b>Mening sharhlarim:</b>",
        "ru": "📋 <b>Мои отзывы:</b>",
        "en": "📋 <b>My reviews:</b>",
    },
    "status.empty": {
        "uz": "Hali sharh yubormagansiz. /submit buyrug'idan foydalaning.",
        "ru": "Вы ещё не отправляли отзывы. Используйте /submit.",
        "en": "You haven't submitted any reviews yet. Use /submit.",
    },
    "status.item": {
        "uz": "#{id} — {status_emoji} {status} | {created}",
        "ru": "#{id} — {status_emoji} {status} | {created}",
        "en": "#{id} — {status_emoji} {status} | {created}",
    },

    # ── Wallet ───────────────────────────────────────────────────────────────
    "wallet.header": {
        "uz": "💼 <b>Mening mukofotlarim:</b>",
        "ru": "💼 <b>Мои награды:</b>",
        "en": "💼 <b>My rewards:</b>",
    },
    "wallet.empty": {
        "uz": "Hali mukofot yo'q. Sharh yuborib, g'ildiraklarni aylantiring!",
        "ru": "Пока наград нет. Отправляйте отзывы и крутите колесо!",
        "en": "No rewards yet. Submit reviews and spin the wheel!",
    },
    "wallet.open_app": {
        "uz": "Mini Ilovani ochish uchun quyidagi tugmani bosing:",
        "ru": "Нажмите кнопку ниже, чтобы открыть мини-приложение:",
        "en": "Press the button below to open the Mini App:",
    },

    # ── Charity ──────────────────────────────────────────────────────────────
    "charity.header": {
        "uz": "🕌 <b>Xayriya kampaniyalari:</b>",
        "ru": "🕌 <b>Благотворительные кампании:</b>",
        "en": "🕌 <b>Charity campaigns:</b>",
    },
    "charity.empty": {
        "uz": "Hozirda faol kampaniya yo'q.",
        "ru": "Нет активных кампаний.",
        "en": "No active campaigns at the moment.",
    },
    "charity.campaign_item": {
        "uz": "<b>{name}</b>\n{raised} / {goal} UZS ({pct}%)\n",
        "ru": "<b>{name}</b>\n{raised} / {goal} UZS ({pct}%)\n",
        "en": "<b>{name}</b>\n{raised} / {goal} UZS ({pct}%)\n",
    },

    # ── Buttons ──────────────────────────────────────────────────────────────
    "btn.submit_review": {"uz": "📝 Sharh yuborish", "ru": "📝 Отправить отзыв", "en": "📝 Submit review"},
    "btn.open_webapp": {"uz": "🎡 Mini Ilova", "ru": "🎡 Мини-приложение", "en": "🎡 Mini App"},
    "btn.my_rewards": {"uz": "💼 Mukofotlarim", "ru": "💼 Мои награды", "en": "💼 My rewards"},
    "btn.charity": {"uz": "🕌 Xayriya", "ru": "🕌 Благотворительность", "en": "🕌 Charity"},
    "btn.help": {"uz": "❓ Yordam", "ru": "❓ Помощь", "en": "❓ Help"},
    "btn.done": {"uz": "✅ Tayyor", "ru": "✅ Готово", "en": "✅ Done"},
    "btn.cancel": {"uz": "❌ Bekor qilish", "ru": "❌ Отмена", "en": "❌ Cancel"},
    "btn.lang_uz": {"uz": "🇺🇿 O'zbek", "ru": "🇺🇿 O'zbek", "en": "🇺🇿 O'zbek"},
    "btn.lang_ru": {"uz": "🇷🇺 Русский", "ru": "🇷🇺 Русский", "en": "🇷🇺 Русский"},
    "btn.lang_en": {"uz": "🇬🇧 English", "ru": "🇬🇧 English", "en": "🇬🇧 English"},
}

FALLBACK_LANG = "uz"


def t(key: str, lang: str = FALLBACK_LANG, **kwargs: Any) -> str:
    """Translate a key, falling back to Uzbek, then the raw key."""
    entry = STRINGS.get(key, {})
    text = entry.get(lang) or entry.get(FALLBACK_LANG) or key
    if kwargs:
        try:
            text = text.format(**kwargs)
        except KeyError:
            pass
    return text
