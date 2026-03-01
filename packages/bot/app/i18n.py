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
            "╔══════════════════════╗\n"
            "  Xush kelibsiz, <b>{name}</b>! 🎉\n"
            "╚══════════════════════╝\n\n"
            "🛍 <b>Uzum Market</b> sharhlar botiga xush kelibsiz!\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "📝 Xaridingiz haqida sharh yozing\n"
            "🎡 Sovrin g'ildiragini aylantiring\n"
            "🏆 Ajoyib mukofotlar yuting!\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🔗 Do'stlaringizni taklif qiling — har bir taklif uchun\n"
            "<b>+1 ta qo'shimcha aylanish</b> oling!\n\n"
            "👇 <b>Boshlash uchun quyidagi tugmani bosing!</b>"
        ),
        "ru": (
            "╔══════════════════════╗\n"
            "  Добро пожаловать, <b>{name}</b>! 🎉\n"
            "╚══════════════════════╝\n\n"
            "🛍 Вы в боте отзывов <b>Uzum Market</b>!\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "📝 Оставьте отзыв о покупке\n"
            "🎡 Крутите колесо призов\n"
            "🏆 Выигрывайте крутые награды!\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🔗 Приглашайте друзей — за каждого\n"
            "<b>+1 бонусное вращение</b>!\n\n"
            "👇 <b>Нажмите кнопку ниже, чтобы начать!</b>"
        ),
        "en": (
            "╔══════════════════════╗\n"
            "  Welcome, <b>{name}</b>! 🎉\n"
            "╚══════════════════════╝\n\n"
            "🛍 You're in the <b>Uzum Market</b> reviews bot!\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "📝 Write a review about your purchase\n"
            "🎡 Spin the prize wheel\n"
            "🏆 Win amazing rewards!\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🔗 Invite friends — earn\n"
            "<b>+1 bonus spin</b> per referral!\n\n"
            "👇 <b>Press the button below to get started!</b>"
        ),
    },
    "start.returning": {
        "uz": (
            "👋 Xush kelibsiz qaytib, <b>{name}</b>!\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "🎡 Mavjud aylanishlar: <b>{spin_count}</b>\n"
            "✅ Tasdiqlangan sharhlar: <b>{approved}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "{spin_cta}\n\n"
            "📝 Yangi sharh: /submit\n"
            "📋 Sharhlar holati: /status"
        ),
        "ru": (
            "👋 С возвращением, <b>{name}</b>!\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "🎡 Доступно вращений: <b>{spin_count}</b>\n"
            "✅ Одобренных отзывов: <b>{approved}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "{spin_cta}\n\n"
            "📝 Новый отзыв: /submit\n"
            "📋 Статус отзывов: /status"
        ),
        "en": (
            "👋 Welcome back, <b>{name}</b>!\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "🎡 Available spins: <b>{spin_count}</b>\n"
            "✅ Approved reviews: <b>{approved}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "{spin_cta}\n\n"
            "📝 New review: /submit\n"
            "📋 Review status: /status"
        ),
    },
    "start.returning_spin_cta": {
        "uz": "🔥 Sizda <b>{spin_count} ta aylanish</b> kutmoqda — hoziroq aylantiring!",
        "ru": "🔥 У вас <b>{spin_count} вращений</b> ждут — крутите прямо сейчас!",
        "en": "🔥 You have <b>{spin_count} spin(s)</b> waiting — spin now!",
    },
    "start.returning_no_spin_cta": {
        "uz": "💡 Sharh yuboring va sovrin yutish imkoniyatiga ega bo'ling!",
        "ru": "💡 Отправьте отзыв и получите шанс выиграть приз!",
        "en": "💡 Submit a review to earn your chance to win a prize!",
    },

    # ── Language selection ───────────────────────────────────────────────────
    "lang.choose": {
        "uz": "🌐 Tilni tanlang / Выберите язык / Choose language:",
        "ru": "🌐 Tilni tanlang / Выберите язык / Choose language:",
        "en": "🌐 Tilni tanlang / Выберите язык / Choose language:",
    },
    "lang.changed": {
        "uz": "✅ Til o'zgartirildi: O'zbek 🇺🇿",
        "ru": "✅ Язык изменён: Русский 🇷🇺",
        "en": "✅ Language changed: English 🇬🇧",
    },

    # ── /help ────────────────────────────────────────────────────────────────
    "help.text": {
        "uz": (
            "╔══════════════════════╗\n"
            "  📋 Yordam markazi\n"
            "╚══════════════════════╝\n\n"
            "<b>Buyruqlar:</b>\n"
            "▸ /start — Bosh menyu\n"
            "▸ /submit — Sharh yuborish\n"
            "▸ /status — Sharhlarim holati\n"
            "▸ /myspins — Mavjud aylanishlarim\n"
            "▸ /referral — Taklif havolam\n"
            "▸ /wallet — Mukofotlarim\n"
            "▸ /charity — Xayriya\n"
            "▸ /language — Tilni o'zgartirish\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "<b>🚀 Qanday ishlaydi?</b>\n\n"
            "1️⃣ Uzum Market'dan xarid qiling\n"
            "2️⃣ Mahsulot sahifasida sharh qoldiring\n"
            "3️⃣ Sharh skrinshotini /submit orqali yuboring\n"
            "4️⃣ Tasdiqlangandan so'ng g'ildirakni aylantiring! 🎡\n"
            "5️⃣ Ajoyib sovrinlar yuting! 🏆\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "<i>Savollar bo'lsa @{support} ga murojaat qiling.</i>"
        ),
        "ru": (
            "╔══════════════════════╗\n"
            "  📋 Центр помощи\n"
            "╚══════════════════════╝\n\n"
            "<b>Команды:</b>\n"
            "▸ /start — Главное меню\n"
            "▸ /submit — Отправить отзыв\n"
            "▸ /status — Статус отзывов\n"
            "▸ /myspins — Мои вращения\n"
            "▸ /referral — Реферальная ссылка\n"
            "▸ /wallet — Мои награды\n"
            "▸ /charity — Благотворительность\n"
            "▸ /language — Сменить язык\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "<b>🚀 Как это работает?</b>\n\n"
            "1️⃣ Сделайте покупку на Uzum Market\n"
            "2️⃣ Оставьте отзыв на странице товара\n"
            "3️⃣ Отправьте скриншот отзыва через /submit\n"
            "4️⃣ После одобрения — крутите колесо! 🎡\n"
            "5️⃣ Выигрывайте крутые призы! 🏆\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "<i>По вопросам обращайтесь к @{support}.</i>"
        ),
        "en": (
            "╔══════════════════════╗\n"
            "  📋 Help Center\n"
            "╚══════════════════════╝\n\n"
            "<b>Commands:</b>\n"
            "▸ /start — Main menu\n"
            "▸ /submit — Submit a review\n"
            "▸ /status — Review status\n"
            "▸ /myspins — Available spins\n"
            "▸ /referral — My referral link\n"
            "▸ /wallet — My rewards\n"
            "▸ /charity — Charity\n"
            "▸ /language — Change language\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "<b>🚀 How it works?</b>\n\n"
            "1️⃣ Make a purchase on Uzum Market\n"
            "2️⃣ Leave a review on the product page\n"
            "3️⃣ Send a screenshot via /submit\n"
            "4️⃣ After approval — spin the wheel! 🎡\n"
            "5️⃣ Win amazing prizes! 🏆\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "<i>For questions contact @{support}.</i>"
        ),
    },

    # ── Submission FSM ───────────────────────────────────────────────────────
    "submit.ask_product": {
        "uz": (
            "📦 <b>Sharh yuborish</b>\n\n"
            "Qaysi mahsulot uchun sharh yozgansiz?\n"
            "Ro'yxatdan tanlang yoki mahsulot nomini yozing:"
        ),
        "ru": (
            "📦 <b>Отправить отзыв</b>\n\n"
            "На какой товар вы написали отзыв?\n"
            "Выберите из списка или напишите название:"
        ),
        "en": (
            "📦 <b>Submit a review</b>\n\n"
            "Which product did you review?\n"
            "Select from the list or type a product name to search:"
        ),
    },
    "submit.product_list_header": {
        "uz": "📋 Mavjud mahsulotlar:\n\n",
        "ru": "📋 Доступные товары:\n\n",
        "en": "📋 Available products:\n\n",
    },
    "submit.product_not_found": {
        "uz": "❌ Mahsulot topilmadi. Boshqa so'z bilan qidiring yoki ro'yxatdan tanlang.",
        "ru": "❌ Товар не найден. Попробуйте другой запрос или выберите из списка.",
        "en": "❌ Product not found. Try a different search or select from the list.",
    },
    "submit.product_selected": {
        "uz": "✅ Mahsulot tanlandi: <b>{name}</b>\n\nEndi sharhingizning skrinshotini yuboring.\n(<b>1–5 rasm</b>, JPEG yoki PNG)\n\nHammasini yuborganingizdan so'ng <b>«Tayyor»</b> tugmasini bosing.",
        "ru": "✅ Товар выбран: <b>{name}</b>\n\nТеперь отправьте скриншот(ы) вашего отзыва.\n(<b>1–5 фото</b>, JPEG или PNG)\n\nПосле загрузки нажмите <b>«Готово»</b>.",
        "en": "✅ Product selected: <b>{name}</b>\n\nNow send screenshot(s) of your review.\n(<b>1–5 images</b>, JPEG or PNG)\n\nAfter uploading press <b>«Done»</b>.",
    },
    "submit.no_products": {
        "uz": "⚠️ Hozircha faol mahsulotlar yo'q. Keyinroq qayta urinib ko'ring.",
        "ru": "⚠️ Пока нет активных товаров. Попробуйте позже.",
        "en": "⚠️ No active products available yet. Try again later.",
    },
    "submit.search_hint": {
        "uz": "🔍 Mahsulot nomini yozing yoki «Bekor qilish» tugmasini bosing:",
        "ru": "🔍 Напишите название товара или нажмите «Отмена»:",
        "en": "🔍 Type a product name or press «Cancel»:",
    },
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
            "🎉 <b>Sharh muvaffaqiyatli yuborildi!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "🔖 Sharh raqami: <code>{submission_id}</code>\n"
            "⏱ Ko'rib chiqish: 24 soat ichida\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "✅ Tasdiqlangandan so'ng sizga xabar beramiz\n"
            "va g'ildirakni aylantirish imkoniyatini olasiz! 🎡\n\n"
            "📋 Holat: /status"
        ),
        "ru": (
            "🎉 <b>Отзыв успешно отправлен!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "🔖 Номер отзыва: <code>{submission_id}</code>\n"
            "⏱ Рассмотрение: в течение 24 часов\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "✅ После одобрения вы получите уведомление\n"
            "и возможность крутить колесо! 🎡\n\n"
            "📋 Статус: /status"
        ),
        "en": (
            "🎉 <b>Review submitted successfully!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "🔖 Review ID: <code>{submission_id}</code>\n"
            "⏱ Review time: within 24 hours\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "✅ After approval you'll be notified\n"
            "and can spin the wheel! 🎡\n\n"
            "📋 Status: /status"
        ),
    },
    "submit.error": {
        "uz": "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
        "ru": "❌ Произошла ошибка. Пожалуйста, попробуйте снова.",
        "en": "❌ An error occurred. Please try again.",
    },
    "submit.error_product_not_found": {
        "uz": "❌ Tanlangan mahsulot topilmadi yoki faol emas. Boshqa mahsulotni tanlang.",
        "ru": "❌ Выбранный товар не найден или неактивен. Выберите другой товар.",
        "en": "❌ The selected product was not found or is no longer active. Please select another product.",
    },
    "submit.error_image_invalid": {
        "uz": "❌ Rasm noto'g'ri yoki o'qib bo'lmaydi. Boshqa rasm yuboring.",
        "ru": "❌ Изображение недействительно или не может быть обработано. Попробуйте другое фото.",
        "en": "❌ The image is invalid or could not be processed. Please send a different photo.",
    },
    "submit.error_validation": {
        "uz": "❌ Ma'lumotlar noto'g'ri: {detail}\n\nIltimos, qayta urinib ko'ring.",
        "ru": "❌ Ошибка валидации: {detail}\n\nПожалуйста, попробуйте снова.",
        "en": "❌ Validation error: {detail}\n\nPlease try again.",
    },
    "submit.error_download_failed": {
        "uz": "❌ Rasmni yuklab bo'lmadi. Iltimos, qayta yuboring.",
        "ru": "❌ Не удалось загрузить фото. Пожалуйста, попробуйте снова.",
        "en": "❌ Failed to download the photo. Please try sending it again.",
    },
    "submit.error_server": {
        "uz": "❌ Server xatosi yuz berdi. Biroz kutib, qayta urinib ko'ring.",
        "ru": "❌ Произошла ошибка сервера. Подождите немного и попробуйте снова.",
        "en": "❌ A server error occurred. Please wait a moment and try again.",
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

    # ── Status / History ─────────────────────────────────────────────────────
    "status.header": {
        "uz": "📋 <b>Mening sharhlarim:</b>",
        "ru": "📋 <b>Мои отзывы:</b>",
        "en": "📋 <b>My reviews:</b>",
    },
    "status.empty": {
        "uz": (
            "📭 Hali sharh yubormagansiz.\n\n"
            "💡 Birinchi sharhingizni yuboring va aylanish yuting!\n"
            "/submit"
        ),
        "ru": (
            "📭 Вы ещё не отправляли отзывы.\n\n"
            "💡 Отправьте первый отзыв и выиграйте вращение!\n"
            "/submit"
        ),
        "en": (
            "📭 You haven't submitted any reviews yet.\n\n"
            "💡 Submit your first review to earn a spin!\n"
            "/submit"
        ),
    },
    "status.summary": {
        "uz": (
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "📊 <b>Umumiy natijalar:</b>\n\n"
            "📁 Jami: <b>{total}</b> ta sharh\n"
            "✅ Tasdiqlangan: <b>{approved}</b>\n"
            "⏳ Kutilayotgan: <b>{pending}</b>\n"
            "❌ Rad etilgan: <b>{rejected}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        ),
        "ru": (
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "📊 <b>Общие результаты:</b>\n\n"
            "📁 Всего: <b>{total}</b> отзывов\n"
            "✅ Одобрено: <b>{approved}</b>\n"
            "⏳ На проверке: <b>{pending}</b>\n"
            "❌ Отклонено: <b>{rejected}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        ),
        "en": (
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "📊 <b>Summary:</b>\n\n"
            "📁 Total: <b>{total}</b> reviews\n"
            "✅ Approved: <b>{approved}</b>\n"
            "⏳ Pending: <b>{pending}</b>\n"
            "❌ Rejected: <b>{rejected}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
        ),
    },
    "status.item": {
        "uz": (
            "{status_emoji} <b>{status_label}</b> · {created}\n"
            "   ID: <code>{short_id}</code>"
        ),
        "ru": (
            "{status_emoji} <b>{status_label}</b> · {created}\n"
            "   ID: <code>{short_id}</code>"
        ),
        "en": (
            "{status_emoji} <b>{status_label}</b> · {created}\n"
            "   ID: <code>{short_id}</code>"
        ),
    },
    "status.item_rejected": {
        "uz": "   ↳ <i>Sabab: {reason}</i>",
        "ru": "   ↳ <i>Причина: {reason}</i>",
        "en": "   ↳ <i>Reason: {reason}</i>",
    },
    "status.item_spin": {
        "uz": "   🎡 G'ildirak aylanishi berilgan",
        "ru": "   🎡 Вращение колеса выдано",
        "en": "   🎡 Spin granted",
    },

    # ── My Spins ─────────────────────────────────────────────────────────────
    "myspins.text": {
        "uz": (
            "╔══════════════════════╗\n"
            "  🎡 Mening aylanishlarim\n"
            "╚══════════════════════╝\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "🎡 Mavjud aylanishlar: <b>{spin_count}</b>\n"
            "🔄 Jami aylanishlar: <b>{total_spins}</b>\n"
            "✅ Tasdiqlangan sharhlar: <b>{approved}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "{spin_note}"
        ),
        "ru": (
            "╔══════════════════════╗\n"
            "  🎡 Мои вращения\n"
            "╚══════════════════════╝\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "🎡 Доступно вращений: <b>{spin_count}</b>\n"
            "🔄 Всего вращений: <b>{total_spins}</b>\n"
            "✅ Одобренных отзывов: <b>{approved}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "{spin_note}"
        ),
        "en": (
            "╔══════════════════════╗\n"
            "  🎡 My Spins\n"
            "╚══════════════════════╝\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "🎡 Available spins: <b>{spin_count}</b>\n"
            "🔄 Total spins: <b>{total_spins}</b>\n"
            "✅ Approved reviews: <b>{approved}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "{spin_note}"
        ),
    },
    "myspins.has_spins": {
        "uz": "🔥 Sizda <b>{spin_count} ta aylanish</b> kutmoqda!\nHoziroq Mini Ilovani oching va aylantiring! 👇",
        "ru": "🔥 У вас <b>{spin_count} вращений</b> ждут!\nОткройте мини-приложение прямо сейчас! 👇",
        "en": "🔥 You have <b>{spin_count} spin(s)</b> waiting!\nOpen the Mini App right now! 👇",
    },
    "myspins.no_spins": {
        "uz": "💡 Hozircha aylanish yo'q.\nSharh yuboring va tasdiqlashni kuting — keyin g'ildirak sizniki! 🎡",
        "ru": "💡 Пока вращений нет.\nОтправьте отзыв и дождитесь одобрения — колесо ваше! 🎡",
        "en": "💡 No spins yet.\nSubmit a review and wait for approval — the wheel awaits! 🎡",
    },

    # ── Referral ─────────────────────────────────────────────────────────────
    "referral.text": {
        "uz": (
            "╔══════════════════════╗\n"
            "  🔗 Taklif tizimi\n"
            "╚══════════════════════╝\n\n"
            "📌 Taklif kodingiz: <code>{code}</code>\n"
            "🔗 Havola:\n<code>https://t.me/{bot_username}?start={code}</code>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "👥 Takliflar: <b>{count}</b> ta do'st\n"
            "🎡 Bonus aylanishlar: <b>{bonus}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🎁 Har bir do'stingiz ro'yxatdan o'tsa,\n"
            "siz <b>+1 ta qo'shimcha aylanish</b> olasiz!\n\n"
            "👇 <b>Ulashish tugmasini bosing!</b>\n\n"
            "<i>Halol bonus tizimi — hech qanday to'lov talab qilinmaydi.</i>"
        ),
        "ru": (
            "╔══════════════════════╗\n"
            "  🔗 Реферальная система\n"
            "╚══════════════════════╝\n\n"
            "📌 Ваш код: <code>{code}</code>\n"
            "🔗 Ссылка:\n<code>https://t.me/{bot_username}?start={code}</code>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "👥 Приглашено: <b>{count}</b> друзей\n"
            "🎡 Бонусных вращений: <b>{bonus}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🎁 За каждого зарегистрировавшегося друга\n"
            "вы получаете <b>+1 вращение</b>!\n\n"
            "👇 <b>Нажмите кнопку, чтобы поделиться!</b>\n\n"
            "<i>Честная бонусная система — никаких платежей.</i>"
        ),
        "en": (
            "╔══════════════════════╗\n"
            "  🔗 Referral System\n"
            "╚══════════════════════╝\n\n"
            "📌 Your code: <code>{code}</code>\n"
            "🔗 Link:\n<code>https://t.me/{bot_username}?start={code}</code>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "👥 Invited: <b>{count}</b> friends\n"
            "🎡 Bonus spins earned: <b>{bonus}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🎁 For every friend who signs up\n"
            "you earn <b>+1 bonus spin</b>!\n\n"
            "👇 <b>Press the button to share!</b>\n\n"
            "<i>Halal bonus system — no payments required.</i>"
        ),
    },

    # ── Wallet ───────────────────────────────────────────────────────────────
    "wallet.header": {
        "uz": "💼 <b>Mening mukofotlarim:</b>",
        "ru": "💼 <b>Мои награды:</b>",
        "en": "💼 <b>My rewards:</b>",
    },
    "wallet.empty": {
        "uz": (
            "📭 Hali mukofot yo'q.\n\n"
            "💡 Sharh yuborib, g'ildirakni aylantiring\n"
            "va ajoyib sovrinlar yuting! 🎡🏆"
        ),
        "ru": (
            "📭 Пока наград нет.\n\n"
            "💡 Отправляйте отзывы, крутите колесо\n"
            "и выигрывайте крутые призы! 🎡🏆"
        ),
        "en": (
            "📭 No rewards yet.\n\n"
            "💡 Submit reviews, spin the wheel\n"
            "and win amazing prizes! 🎡🏆"
        ),
    },
    "wallet.open_app": {
        "uz": "👇 Mini Ilovani ochish uchun quyidagi tugmani bosing:",
        "ru": "👇 Нажмите кнопку ниже, чтобы открыть мини-приложение:",
        "en": "👇 Press the button below to open the Mini App:",
    },
    "wallet.claimed": {
        "uz": "Olindi",
        "ru": "Получено",
        "en": "Claimed",
    },
    "wallet.expired": {
        "uz": "Muddati o'tgan",
        "ru": "Истёк срок",
        "en": "Expired",
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

    # ── Engagement / Psychological nudges ────────────────────────────────────
    "engage.spin_available": {
        "uz": (
            "🎡 <b>Sizda {spin_count} ta aylanish mavjud!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "Mini Ilovani oching va sovrin yutib oling! 🎁\n"
            "Har bir aylanish — yangi imkoniyat!\n"
            "━━━━━━━━━━━━━━━━━━━━━━"
        ),
        "ru": (
            "🎡 <b>У вас {spin_count} вращений ждут!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "Откройте мини-приложение и выиграйте приз! 🎁\n"
            "Каждое вращение — новый шанс!\n"
            "━━━━━━━━━━━━━━━━━━━━━━"
        ),
        "en": (
            "🎡 <b>You have {spin_count} spin(s) waiting!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "Open the Mini App and win a prize! 🎁\n"
            "Every spin is a new chance!\n"
            "━━━━━━━━━━━━━━━━━━━━━━"
        ),
    },
    "engage.review_approved": {
        "uz": (
            "🎉 <b>Sharhingiz tasdiqlandi!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "Tabriklaymiz! 🏆\n"
            "Mavjud aylanishlar: <b>{spin_count}</b> 🎡\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "💥 Hoziroq Mini Ilovani oching va omadingizni sinab ko'ring!"
        ),
        "ru": (
            "🎉 <b>Ваш отзыв одобрен!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "Поздравляем! 🏆\n"
            "Доступных вращений: <b>{spin_count}</b> 🎡\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "💥 Откройте мини-приложение прямо сейчас и испытайте удачу!"
        ),
        "en": (
            "🎉 <b>Your review was approved!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "Congratulations! 🏆\n"
            "Available spins: <b>{spin_count}</b> 🎡\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "💥 Open the Mini App right now and try your luck!"
        ),
    },
    "engage.streak_reminder": {
        "uz": (
            "🔥 <b>{streak} kunlik ketma-ketlik!</b>\n\n"
            "Zo'r natija! Har kuni sharh yuboring\n"
            "va bonus spinlar yuting.\n\n"
            "Bugun ham sharh yubordingizmi? /submit"
        ),
        "ru": (
            "🔥 <b>{streak}-дневная серия!</b>\n\n"
            "Отличный результат! Отправляйте отзыв каждый день\n"
            "и выигрывайте бонусные спины.\n\n"
            "Вы уже отправили отзыв сегодня? /submit"
        ),
        "en": (
            "🔥 <b>{streak}-day streak!</b>\n\n"
            "Great result! Submit a review every day\n"
            "and earn bonus spins.\n\n"
            "Have you submitted a review today? /submit"
        ),
    },


    "btn.submit_review": {"uz": "📝 Sharh yuborish", "ru": "📝 Отправить отзыв", "en": "📝 Submit review"},
    "btn.my_status": {"uz": "📋 Sharhlarim", "ru": "📋 Мои отзывы", "en": "📋 My Reviews"},
    "btn.my_spins": {"uz": "🎡 Aylanishlarim", "ru": "🎡 Мои вращения", "en": "🎡 My Spins"},
    "btn.referral": {"uz": "🔗 Taklif", "ru": "🔗 Реферал", "en": "🔗 Referral"},
    "btn.open_webapp": {"uz": "🎡 Mini Ilova", "ru": "🎡 Мини-приложение", "en": "🎡 Mini App"},
    "btn.share_referral": {"uz": "🔗 Do'stlarga ulashish", "ru": "🔗 Поделиться с друзьями", "en": "🔗 Share with friends"},
    "btn.my_rewards": {"uz": "💼 Mukofotlarim", "ru": "💼 Мои награды", "en": "💼 My rewards"},
    "btn.charity": {"uz": "🕌 Xayriya", "ru": "🕌 Благотворительность", "en": "🕌 Charity"},
    "btn.help": {"uz": "❓ Yordam", "ru": "❓ Помощь", "en": "❓ Help"},
    "btn.done": {"uz": "✅ Tayyor", "ru": "✅ Готово", "en": "✅ Done"},
    "btn.cancel": {"uz": "❌ Bekor qilish", "ru": "❌ Отмена", "en": "❌ Cancel"},
    "btn.lang_uz": {"uz": "🇺🇿 O'zbek", "ru": "🇺🇿 O'zbek", "en": "🇺🇿 O'zbek"},
    "btn.lang_ru": {"uz": "🇷🇺 Русский", "ru": "🇷🇺 Русский", "en": "🇷🇺 Русский"},
    "btn.lang_en": {"uz": "🇬🇧 English", "ru": "🇬🇧 English", "en": "🇬🇧 English"},
    "btn.copy_referral": {"uz": "🔗 Havolani ko'chirish", "ru": "🔗 Скопировать ссылку", "en": "🔗 Copy link"},

    # ── Smart Review Tips (Feature 1) ────────────────────────────────────────
    "tip.1": {
        "uz": "💡 <b>Maslahat:</b> Mahsulotning aniq, yorug' rasmlarini oling.",
        "ru": "💡 <b>Совет:</b> Делайте чёткие, хорошо освещённые фото товара.",
        "en": "💡 <b>Tip:</b> Take clear, well-lit photos of the product.",
    },
    "tip.2": {
        "uz": "💡 <b>Maslahat:</b> Kamida bitta rasmda mahsulot qadoqlanishini ko'rsating.",
        "ru": "💡 <b>Совет:</b> Покажите упаковку товара хотя бы на одном фото.",
        "en": "💡 <b>Tip:</b> Include the product packaging in at least one photo.",
    },
    "tip.3": {
        "uz": "💡 <b>Maslahat:</b> Uzum buyurtma raqami ko'rinishiga ishonch hosil qiling.",
        "ru": "💡 <b>Совет:</b> Убедитесь, что номер заказа Uzum виден на фото.",
        "en": "💡 <b>Tip:</b> Make sure the Uzum order number is visible.",
    },
    "tip.4": {
        "uz": "💡 <b>Maslahat:</b> Yetkazilgandan keyin 24 soat ichida yuboring — tezroq tasdiqlanadi.",
        "ru": "💡 <b>Совет:</b> Отправьте в течение 24 часов после доставки — одобрят быстрее.",
        "en": "💡 <b>Tip:</b> Submit within 24 hours of delivery for faster approval.",
    },
    "tip.5": {
        "uz": "💡 <b>Maslahat:</b> Har bir mahsulot uchun bitta sharh — takroriy sharhlar rad etiladi.",
        "ru": "💡 <b>Совет:</b> Один отзыв на товар — дубликаты будут отклонены.",
        "en": "💡 <b>Tip:</b> One review per product — duplicates will be rejected.",
    },

    # ── Mini Stats Footer (Feature 2) ────────────────────────────────────────
    "footer_stats": {
        "uz": "\n📊 Sizning statistika: {reviews} ta sharh • {spins} ta aylanish • {referrals} ta taklif",
        "ru": "\n📊 Ваша статистика: {reviews} отзывов • {spins} вращений • {referrals} рефералов",
        "en": "\n📊 Your stats: {reviews} reviews • {spins} spins • {referrals} referrals",
    },

    # ── Referral Milestone Messages (Feature 3) ──────────────────────────────
    "milestone_1": {
        "uz": "🎉 <b>Birinchi taklifingiz!</b>\nTabriklaymiz — siz bonus aylanish yutdingiz! 🎡",
        "ru": "🎉 <b>Ваш первый реферал!</b>\nПоздравляем — вы заработали бонусное вращение! 🎡",
        "en": "🎉 <b>Your first referral!</b>\nCongratulations — you earned a bonus spin! 🎡",
    },
    "milestone_5": {
        "uz": "🌟 <b>5 ta taklif!</b>\nSiz yulduz tashviqotchi bo'lyapsiz — davom eting! 💪",
        "ru": "🌟 <b>5 рефералов!</b>\nВы становитесь звёздным рекрутером — продолжайте! 💪",
        "en": "🌟 <b>5 referrals!</b>\nYou're becoming a star recruiter — keep going! 💪",
    },
    "milestone_10": {
        "uz": "🏆 <b>10 ta taklif!</b>\nAjoyib elchi maqomi! Siz zo'rsiz! 🔥",
        "ru": "🏆 <b>10 рефералов!</b>\nПотрясающий статус посла! Вы невероятны! 🔥",
        "en": "🏆 <b>10 referrals!</b>\nAmazing ambassador status! You're incredible! 🔥",
    },
    "milestone_25": {
        "uz": "💎 <b>25 ta taklif!</b>\nOlmos darajadagi tashviqotchi! 👑",
        "ru": "💎 <b>25 рефералов!</b>\nАлмазный уровень рекрутера! 👑",
        "en": "💎 <b>25 referrals!</b>\nDiamond level recruiter! 👑",
    },
    "milestone_50": {
        "uz": "👑 <b>50 ta taklif!</b>\nAfsonaviy maqom ochildi! Siz efsona! 🏅",
        "ru": "👑 <b>50 рефералов!</b>\nЛегендарный статус разблокирован! Вы легенда! 🏅",
        "en": "👑 <b>50 referrals!</b>\nLegendary status unlocked! You're a legend! 🏅",
    },

    # ── Engagement Nudges (Feature 4) ────────────────────────────────────────
    "nudge_has_spins": {
        "uz": "🎡 Sizda <b>{n} ta aylanish</b> kutmoqda!\n👇 Ilovani oching va aylantiring — sovrin yutishingiz mumkin!",
        "ru": "🎡 У вас <b>{n} вращений</b> ждут!\n👇 Откройте приложение и крутите — вы можете выиграть приз!",
        "en": "🎡 You have <b>{n} spin(s)</b> waiting!\n👇 Open the app to spin — you could win a prize!",
    },
    "nudge_check_spins": {
        "uz": "✅ Sharhlaringiz tasdiqlangan!\nYangi aylanishlar bormi — tekshiring! /myspins",
        "ru": "✅ Ваши отзывы одобрены!\nПроверьте, есть ли новые вращения! /myspins",
        "en": "✅ Your reviews are approved!\nCheck if you have new spins! /myspins",
    },
    "nudge_first_review": {
        "uz": "📝 Birinchi sharhingizni yuboring va aylanish yuting!\n👉 /submit",
        "ru": "📝 Отправьте свой первый отзыв и получите вращение!\n👉 /submit",
        "en": "📝 Submit your first review to earn a spin!\n👉 /submit",
    },

    # ── Onboarding wizard ────────────────────────────────────────────────────
    "onboarding.step1": {
        "uz": (
            "🌐 <b>Tilni tanlang:</b>\n\n"
            "Davom etish uchun o'zingizga qulay tilni tanlang."
        ),
        "ru": (
            "🌐 <b>Выберите язык:</b>\n\n"
            "Выберите удобный язык для продолжения."
        ),
        "en": (
            "🌐 <b>Choose your language:</b>\n\n"
            "Select your preferred language to continue."
        ),
    },
    "onboarding.step2": {
        "uz": (
            "📖 <b>Qanday ishlaydi?</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "1️⃣ Uzum Market'dan <b>xarid qiling</b>\n"
            "2️⃣ Mahsulot sahifasida <b>sharh yozing</b>\n"
            "3️⃣ Sharh skrinshotini <b>yuboring</b> 📸\n"
            "4️⃣ Admin tasdiqlasa — <b>aylanish yuting</b> 🎡\n"
            "5️⃣ G'ildirakni aylantirib <b>sovrin oling</b> 🏆\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Tayyor bo'lgach «Davom etish» tugmasini bosing!"
        ),
        "ru": (
            "📖 <b>Как это работает?</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "1️⃣ <b>Купите</b> что-нибудь на Uzum Market\n"
            "2️⃣ <b>Оставьте отзыв</b> на странице товара\n"
            "3️⃣ <b>Отправьте скриншот</b> отзыва 📸\n"
            "4️⃣ После одобрения — <b>вращение выдано</b> 🎡\n"
            "5️⃣ Крутите колесо и <b>выигрывайте призы</b> 🏆\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Когда будете готовы, нажмите «Продолжить»!"
        ),
        "en": (
            "📖 <b>How it works?</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "1️⃣ <b>Purchase</b> something on Uzum Market\n"
            "2️⃣ <b>Leave a review</b> on the product page\n"
            "3️⃣ <b>Send a screenshot</b> of your review 📸\n"
            "4️⃣ After approval — <b>spin earned</b> 🎡\n"
            "5️⃣ Spin the wheel and <b>win prizes</b> 🏆\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "When ready, press «Continue»!"
        ),
    },
    "onboarding.step2_btn": {
        "uz": "▶️ Davom etish",
        "ru": "▶️ Продолжить",
        "en": "▶️ Continue",
    },
    "onboarding.step3": {
        "uz": "🛍 <b>Birinchi sharhingiz uchun mahsulotni tanlang:</b>",
        "ru": "🛍 <b>Выберите товар для вашего первого отзыва:</b>",
        "en": "🛍 <b>Choose a product for your first review:</b>",
    },
    "onboarding.step4": {
        "uz": (
            "🔢 <b>Buyurtma raqamingizni kiriting:</b>\n\n"
            "Uzum Market buyurtma tarixidan raqamni toping.\n"
            "<i>Masalan: 123456789</i>\n\n"
            "Agar raqam yo'q bo'lsa «O'tkazib yuborish» tugmasini bosing."
        ),
        "ru": (
            "🔢 <b>Введите номер заказа:</b>\n\n"
            "Найдите номер в истории заказов Uzum Market.\n"
            "<i>Например: 123456789</i>\n\n"
            "Если номера нет — нажмите «Пропустить»."
        ),
        "en": (
            "🔢 <b>Enter your order number:</b>\n\n"
            "Find the number in your Uzum Market order history.\n"
            "<i>Example: 123456789</i>\n\n"
            "If you don't have one — press «Skip»."
        ),
    },
    "onboarding.step5": {
        "uz": (
            "🎉 <b>Onboarding tugallandi!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "Siz tayyor! Endi sharh yuborishni boshlang\n"
            "va birinchi sovringizni yuting! 🏆\n"
            "━━━━━━━━━━━━━━━━━━━━━━"
        ),
        "ru": (
            "🎉 <b>Знакомство завершено!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "Вы готовы! Начните отправлять отзывы\n"
            "и выиграйте свой первый приз! 🏆\n"
            "━━━━━━━━━━━━━━━━━━━━━━"
        ),
        "en": (
            "🎉 <b>Onboarding complete!</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "You're all set! Start submitting reviews\n"
            "and win your first prize! 🏆\n"
            "━━━━━━━━━━━━━━━━━━━━━━"
        ),
    },

    # ── Submit order number ──────────────────────────────────────────────────
    "submit.ask_order_number": {
        "uz": (
            "🔢 <b>Buyurtma raqami (ixtiyoriy):</b>\n\n"
            "Uzum Market buyurtma tarixidagi raqamni kiriting.\n"
            "<i>Masalan: 123456789</i>\n\n"
            "Raqam yo'q bo'lsa «O'tkazib yuborish» tugmasini bosing."
        ),
        "ru": (
            "🔢 <b>Номер заказа (необязательно):</b>\n\n"
            "Введите номер из истории заказов Uzum Market.\n"
            "<i>Например: 123456789</i>\n\n"
            "Если нет — нажмите «Пропустить»."
        ),
        "en": (
            "🔢 <b>Order number (optional):</b>\n\n"
            "Enter the number from your Uzum Market order history.\n"
            "<i>Example: 123456789</i>\n\n"
            "If you don't have one — press «Skip»."
        ),
    },
    "submit.order_saved": {
        "uz": "✅ Buyurtma raqami: <code>{order}</code>\n\nEndi skrinshotlarni yuboring:",
        "ru": "✅ Номер заказа: <code>{order}</code>\n\nТеперь отправьте скриншоты:",
        "en": "✅ Order number: <code>{order}</code>\n\nNow send your screenshots:",
    },
    "submit.confirm_header": {
        "uz": (
            "📋 <b>Yuborishdan oldin tekshiring:</b>\n\n"
            "📦 Mahsulot: <b>{product}</b>\n"
            "🔢 Buyurtma: <code>{order}</code>\n"
            "📷 Rasmlar: <b>{count}</b> ta\n\n"
            "Tasdiqlaysizmi?"
        ),
        "ru": (
            "📋 <b>Проверьте перед отправкой:</b>\n\n"
            "📦 Товар: <b>{product}</b>\n"
            "🔢 Заказ: <code>{order}</code>\n"
            "📷 Фото: <b>{count}</b>\n\n"
            "Подтверждаете?"
        ),
        "en": (
            "📋 <b>Review before submitting:</b>\n\n"
            "📦 Product: <b>{product}</b>\n"
            "🔢 Order: <code>{order}</code>\n"
            "📷 Photos: <b>{count}</b>\n\n"
            "Confirm?"
        ),
    },
    "submit.btn_confirm": {
        "uz": "✅ Tasdiqlash",
        "ru": "✅ Подтвердить",
        "en": "✅ Confirm",
    },
    "submit.btn_skip": {
        "uz": "⏭ O'tkazib yuborish",
        "ru": "⏭ Пропустить",
        "en": "⏭ Skip",
    },
    "submit.btn_edit": {
        "uz": "✏️ Tahrirlash",
        "ru": "✏️ Изменить",
        "en": "✏️ Edit",
    },
    "submit.draft_saved": {
        "uz": "💾 Qoralama saqlandi. Davom etish uchun /submit bosing.",
        "ru": "💾 Черновик сохранён. Нажмите /submit для продолжения.",
        "en": "💾 Draft saved. Press /submit to continue.",
    },
    "submit.draft_resume": {
        "uz": (
            "💾 <b>Saqlangan qoralama topildi:</b>\n\n"
            "📦 Mahsulot: <b>{product}</b>\n"
            "📷 Rasmlar: <b>{count}</b> ta\n\n"
            "Davom etasizmi?"
        ),
        "ru": (
            "💾 <b>Найден сохранённый черновик:</b>\n\n"
            "📦 Товар: <b>{product}</b>\n"
            "📷 Фото: <b>{count}</b>\n\n"
            "Продолжить?"
        ),
        "en": (
            "💾 <b>Saved draft found:</b>\n\n"
            "📦 Product: <b>{product}</b>\n"
            "📷 Photos: <b>{count}</b>\n\n"
            "Continue?"
        ),
    },
    "submit.btn_resume": {
        "uz": "▶️ Davom etish",
        "ru": "▶️ Продолжить",
        "en": "▶️ Continue",
    },
    "submit.btn_new": {
        "uz": "🆕 Yangi boshlash",
        "ru": "🆕 Начать заново",
        "en": "🆕 Start fresh",
    },
}

FALLBACK_LANG = "uz"

STATUS_LABELS = {
    "pending": {"uz": "Kutilmoqda", "ru": "На проверке", "en": "Pending"},
    "approved": {"uz": "Tasdiqlandi", "ru": "Одобрен", "en": "Approved"},
    "rejected": {"uz": "Rad etildi", "ru": "Отклонён", "en": "Rejected"},
    "duplicate": {"uz": "Takror", "ru": "Дубликат", "en": "Duplicate"},
}

STATUS_EMOJI = {
    "pending": "⏳",
    "approved": "✅",
    "rejected": "❌",
    "duplicate": "♻️",
}


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


def status_label(status: str, lang: str) -> str:
    return STATUS_LABELS.get(status, {}).get(lang, status)


def status_emoji(status: str) -> str:
    return STATUS_EMOJI.get(status, "❓")
