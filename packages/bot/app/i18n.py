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
            "Assalomu alaykum, <b>{name}</b>! 👋\n\n"
            "Uzum Market'dagi xaridlaringizdan sharh yozing va ajoyib sovrinlar yuting! 🎁\n\n"
            "🔗 Do'stlaringizni taklif qiling — har bir taklif uchun qo'shimcha aylanish oling!\n"
            "Taklif havolangiz: /referral\n\n"
            "Boshlash uchun quyidagi tugmani bosing:"
        ),
        "ru": (
            "Привет, <b>{name}</b>! 👋\n\n"
            "Оставляйте отзывы о покупках на Uzum Market и выигрывайте призы! 🎁\n\n"
            "🔗 Приглашайте друзей — за каждого получайте бонусное вращение!\n"
            "Ваша ссылка: /referral\n\n"
            "Нажмите кнопку ниже, чтобы начать:"
        ),
        "en": (
            "Hello, <b>{name}</b>! 👋\n\n"
            "Share your Uzum Market purchase reviews and win amazing prizes! 🎁\n\n"
            "🔗 Invite friends — earn a bonus spin for each referral!\n"
            "Your link: /referral\n\n"
            "Press the button below to get started:"
        ),
    },
    "start.returning": {
        "uz": (
            "Xush kelibsiz qaytib, <b>{name}</b>! 👋\n\n"
            "Mavjud aylanishlar: <b>{spin_count}</b> 🎡\n"
            "Tasdiqlangan sharhlar: <b>{approved}</b> ✅\n\n"
            "Yangi sharh yuborish: /submit\n"
            "Sharhlar holati: /status"
        ),
        "ru": (
            "С возвращением, <b>{name}</b>! 👋\n\n"
            "Доступно вращений: <b>{spin_count}</b> 🎡\n"
            "Одобренных отзывов: <b>{approved}</b> ✅\n\n"
            "Отправить новый отзыв: /submit\n"
            "Статус отзывов: /status"
        ),
        "en": (
            "Welcome back, <b>{name}</b>! 👋\n\n"
            "Available spins: <b>{spin_count}</b> 🎡\n"
            "Approved reviews: <b>{approved}</b> ✅\n\n"
            "Submit a new review: /submit\n"
            "Review status: /status"
        ),
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
            "<b>📋 Yordam</b>\n\n"
            "/start — Bosh menyu\n"
            "/submit — Sharh yuborish\n"
            "/status — Mening sharhlarim va holati\n"
            "/myspins — Mavjud aylanishlarim\n"
            "/referral — Taklif havolam\n"
            "/wallet — Mening mukofotlarim\n"
            "/charity — Xayriya\n"
            "/language — Tilni o'zgartirish\n"
            "/help — Yordam\n\n"
            "<b>Qanday ishlaydi?</b>\n"
            "1️⃣ Uzum Market'dan xarid qiling\n"
            "2️⃣ Mahsulot sahifasida sharh qoldiring\n"
            "3️⃣ Sharh skrinshotini /submit orqali yuboring\n"
            "4️⃣ Tasdiqlangandan so'ng sovrin g'ildiragini aylantiring!\n\n"
            "<i>Savollar bo'lsa @{support} ga murojaat qiling.</i>"
        ),
        "ru": (
            "<b>📋 Помощь</b>\n\n"
            "/start — Главное меню\n"
            "/submit — Отправить отзыв\n"
            "/status — Мои отзывы и статус\n"
            "/myspins — Доступные вращения\n"
            "/referral — Моя реферальная ссылка\n"
            "/wallet — Мои награды\n"
            "/charity — Благотворительность\n"
            "/language — Сменить язык\n"
            "/help — Помощь\n\n"
            "<b>Как это работает?</b>\n"
            "1️⃣ Сделайте покупку на Uzum Market\n"
            "2️⃣ Оставьте отзыв на странице товара\n"
            "3️⃣ Отправьте скриншот отзыва через /submit\n"
            "4️⃣ После одобрения — крутите колесо призов!\n\n"
            "<i>По вопросам обращайтесь к @{support}.</i>"
        ),
        "en": (
            "<b>📋 Help</b>\n\n"
            "/start — Main menu\n"
            "/submit — Submit a review\n"
            "/status — My reviews and status\n"
            "/myspins — Available spins\n"
            "/referral — My referral link\n"
            "/wallet — My rewards\n"
            "/charity — Charity\n"
            "/language — Change language\n"
            "/help — Help\n\n"
            "<b>How it works?</b>\n"
            "1️⃣ Make a purchase on Uzum Market\n"
            "2️⃣ Leave a review on the product page\n"
            "3️⃣ Send a screenshot via /submit\n"
            "4️⃣ After approval — spin the prize wheel!\n\n"
            "<i>For questions contact @{support}.</i>"
        ),
    },

    # ── Submission FSM ───────────────────────────────────────────────────────
    "submit.ask_product": {
        "uz": (
            "📦 <b>Sharh yuborish</b>\n\n"
            "Qaysi mahsulot uchun sharh yozgansiz?\n"
            "Ro'yxatdan tanlang yoki qidirish uchun mahsulot nomini yozing:"
        ),
        "ru": (
            "📦 <b>Отправить отзыв</b>\n\n"
            "На какой товар вы написали отзыв?\n"
            "Выберите из списка или напишите название для поиска:"
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
            "🎉 <b>Sharh yuborildi!</b>\n\n"
            "Sharh raqami: <code>{submission_id}</code>\n"
            "Natija 24 soat ichida ma'lum qilinadi.\n\n"
            "Holat: /status"
        ),
        "ru": (
            "🎉 <b>Отзыв отправлен!</b>\n\n"
            "Номер отзыва: <code>{submission_id}</code>\n"
            "Результат будет сообщён в течение 24 часов.\n\n"
            "Статус: /status"
        ),
        "en": (
            "🎉 <b>Review submitted!</b>\n\n"
            "Review ID: <code>{submission_id}</code>\n"
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

    # ── Status / History ─────────────────────────────────────────────────────
    "status.header": {
        "uz": "📋 <b>Mening sharhlarim:</b>",
        "ru": "📋 <b>Мои отзывы:</b>",
        "en": "📋 <b>My reviews:</b>",
    },
    "status.empty": {
        "uz": "Hali sharh yubormagansiz.\n\n/submit buyrug'idan foydalaning.",
        "ru": "Вы ещё не отправляли отзывы.\n\nИспользуйте /submit.",
        "en": "You haven't submitted any reviews yet.\n\nUse /submit.",
    },
    "status.summary": {
        "uz": (
            "📊 <b>Umumiy:</b> {total} ta sharh\n"
            "✅ Tasdiqlangan: {approved}\n"
            "⏳ Kutilayotgan: {pending}\n"
            "❌ Rad etilgan: {rejected}\n\n"
        ),
        "ru": (
            "📊 <b>Итого:</b> {total} отзывов\n"
            "✅ Одобрено: {approved}\n"
            "⏳ На проверке: {pending}\n"
            "❌ Отклонено: {rejected}\n\n"
        ),
        "en": (
            "📊 <b>Total:</b> {total} reviews\n"
            "✅ Approved: {approved}\n"
            "⏳ Pending: {pending}\n"
            "❌ Rejected: {rejected}\n\n"
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
            "🎡 <b>Mening aylanishlarim</b>\n\n"
            "Mavjud aylanishlar: <b>{spin_count}</b>\n"
            "Jami aylanishlar: <b>{total_spins}</b>\n"
            "Tasdiqlangan sharhlar: <b>{approved}</b>\n\n"
            "{spin_note}"
        ),
        "ru": (
            "🎡 <b>Мои вращения</b>\n\n"
            "Доступно вращений: <b>{spin_count}</b>\n"
            "Всего вращений: <b>{total_spins}</b>\n"
            "Одобренных отзывов: <b>{approved}</b>\n\n"
            "{spin_note}"
        ),
        "en": (
            "🎡 <b>My Spins</b>\n\n"
            "Available spins: <b>{spin_count}</b>\n"
            "Total spins: <b>{total_spins}</b>\n"
            "Approved reviews: <b>{approved}</b>\n\n"
            "{spin_note}"
        ),
    },
    "myspins.has_spins": {
        "uz": "🎉 Aylanish uchun Mini Ilovani oching!",
        "ru": "🎉 Откройте мини-приложение для вращения!",
        "en": "🎉 Open the Mini App to spin!",
    },
    "myspins.no_spins": {
        "uz": "Hozircha aylanish yo'q. Sharh yuboring va tasdiqlashni kuting!",
        "ru": "Пока вращений нет. Отправьте отзыв и дождитесь одобрения!",
        "en": "No spins yet. Submit a review and wait for approval!",
    },

    # ── Referral ─────────────────────────────────────────────────────────────
    "referral.text": {
        "uz": (
            "🔗 <b>Mening taklif havolam</b>\n\n"
            "Taklif kodingiz: <code>{code}</code>\n"
            "Havola:\n<code>https://t.me/{bot_username}?start={code}</code>\n\n"
            "Takliflar: <b>{count}</b> ta do'st\n"
            "Bonus aylanishlar: <b>{bonus}</b>\n\n"
            "Do'stlaringizni taklif qiling — har bir ro'yxatdan o'tish uchun <b>1 ta qo'shimcha aylanish</b> oling! 🎡\n\n"
            "<i>Bu halol bonus tizimi — hech qanday to'lov talab qilinmaydi.</i>"
        ),
        "ru": (
            "🔗 <b>Моя реферальная ссылка</b>\n\n"
            "Ваш код: <code>{code}</code>\n"
            "Ссылка:\n<code>https://t.me/{bot_username}?start={code}</code>\n\n"
            "Приглашено: <b>{count}</b> друзей\n"
            "Бонусных вращений: <b>{bonus}</b>\n\n"
            "Приглашайте друзей — за каждую регистрацию получайте <b>1 вращение</b>! 🎡\n\n"
            "<i>Это честная бонусная система — никаких платежей не требуется.</i>"
        ),
        "en": (
            "🔗 <b>My Referral Link</b>\n\n"
            "Your code: <code>{code}</code>\n"
            "Link:\n<code>https://t.me/{bot_username}?start={code}</code>\n\n"
            "Invited: <b>{count}</b> friends\n"
            "Bonus spins earned: <b>{bonus}</b>\n\n"
            "Invite friends — earn <b>1 extra spin</b> for each sign-up! 🎡\n\n"
            "<i>This is a halal bonus system — no payments required.</i>"
        ),
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
            "Mini Ilovani oching va sovrin yutib oling 🎁\n"
            "Har bir aylanish yangi imkoniyat!"
        ),
        "ru": (
            "🎡 <b>У вас {spin_count} вращений ждут!</b>\n\n"
            "Откройте мини-приложение и выиграйте приз 🎁\n"
            "Каждое вращение — новый шанс!"
        ),
        "en": (
            "🎡 <b>You have {spin_count} spin(s) waiting!</b>\n\n"
            "Open the Mini App and win a prize 🎁\n"
            "Every spin is a new chance!"
        ),
    },
    "engage.review_approved": {
        "uz": (
            "🎉 <b>Sharhingiz tasdiqlandi!</b>\n\n"
            "Tabriklaymiz! Endi sovrin g'ildiragini aylantiring 🎡\n"
            "Mavjud aylanishlar: <b>{spin_count}</b>\n\n"
            "Mini Ilovani oching va o'z omadingizni sinab ko'ring!"
        ),
        "ru": (
            "🎉 <b>Ваш отзыв одобрен!</b>\n\n"
            "Поздравляем! Теперь крутите колесо призов 🎡\n"
            "Доступных вращений: <b>{spin_count}</b>\n\n"
            "Откройте мини-приложение и испытайте удачу!"
        ),
        "en": (
            "🎉 <b>Your review was approved!</b>\n\n"
            "Congratulations! Now spin the prize wheel 🎡\n"
            "Available spins: <b>{spin_count}</b>\n\n"
            "Open the Mini App and try your luck!"
        ),
    },
    "engage.streak_reminder": {
        "uz": (
            "🔥 <b>{streak} kunlik ketma-ketlik!</b>\n\n"
            "Zo'r! Har kuni sharh yuboring va bonus spinlar yuting.\n"
            "Bugun ham sharh yubordingizmi? /submit"
        ),
        "ru": (
            "🔥 <b>{streak}-дневная серия!</b>\n\n"
            "Отлично! Отправляйте отзыв каждый день и выигрывайте бонусные спины.\n"
            "Вы уже отправили отзыв сегодня? /submit"
        ),
        "en": (
            "🔥 <b>{streak}-day streak!</b>\n\n"
            "Great! Submit a review every day and earn bonus spins.\n"
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
        "uz": "💡 Maslahat: Mahsulotning aniq, yorug' rasmlarini oling.",
        "ru": "💡 Совет: Делайте чёткие, хорошо освещённые фото товара.",
        "en": "💡 Tip: Take clear, well-lit photos of the product.",
    },
    "tip.2": {
        "uz": "💡 Maslahat: Kamida bitta rasmda mahsulot qadoqlanishini ko'rsating.",
        "ru": "💡 Совет: Покажите упаковку товара хотя бы на одном фото.",
        "en": "💡 Tip: Include the product packaging in at least one photo.",
    },
    "tip.3": {
        "uz": "💡 Maslahat: Uzum buyurtma raqami ko'rinishiga ishonch hosil qiling.",
        "ru": "💡 Совет: Убедитесь, что номер заказа Uzum виден на фото.",
        "en": "💡 Tip: Make sure the Uzum order number is visible.",
    },
    "tip.4": {
        "uz": "💡 Maslahat: Yetkazilgandan keyin 24 soat ichida yuboring — tezroq tasdiqlanadi.",
        "ru": "💡 Совет: Отправьте в течение 24 часов после доставки — одобрят быстрее.",
        "en": "💡 Tip: Submit within 24 hours of delivery for faster approval.",
    },
    "tip.5": {
        "uz": "💡 Maslahat: Har bir mahsulot uchun bitta sharh — takroriy sharhlar rad etiladi.",
        "ru": "💡 Совет: Один отзыв на товар — дубликаты будут отклонены.",
        "en": "💡 Tip: One review per product — duplicates will be rejected.",
    },

    # ── Mini Stats Footer (Feature 2) ────────────────────────────────────────
    "footer_stats": {
        "uz": "\n📊 Sizning statistika: {reviews} ta sharh • {spins} ta aylanish • {referrals} ta taklif",
        "ru": "\n📊 Ваша статистика: {reviews} отзывов • {spins} вращений • {referrals} рефералов",
        "en": "\n📊 Your stats: {reviews} reviews • {spins} spins • {referrals} referrals",
    },

    # ── Referral Milestone Messages (Feature 3) ──────────────────────────────
    "milestone_1": {
        "uz": "🎉 Birinchi taklifingiz! Siz bonus aylanish yutdingiz!",
        "ru": "🎉 Ваш первый реферал! Вы заработали бонусное вращение!",
        "en": "🎉 Your first referral! You earned a bonus spin!",
    },
    "milestone_5": {
        "uz": "🌟 5 ta taklif! Siz yulduz tashviqotchi bo'lyapsiz!",
        "ru": "🌟 5 рефералов! Вы становитесь звёздным рекрутером!",
        "en": "🌟 5 referrals! You're becoming a star recruiter!",
    },
    "milestone_10": {
        "uz": "🏆 10 ta taklif! Ajoyib elchi maqomi!",
        "ru": "🏆 10 рефералов! Потрясающий статус посла!",
        "en": "🏆 10 referrals! Amazing ambassador status!",
    },
    "milestone_25": {
        "uz": "💎 25 ta taklif! Olmos darajadagi tashviqotchi!",
        "ru": "💎 25 рефералов! Алмазный уровень рекрутера!",
        "en": "💎 25 referrals! Diamond level recruiter!",
    },
    "milestone_50": {
        "uz": "👑 50 ta taklif! Afsonaviy maqom ochildi!",
        "ru": "👑 50 рефералов! Легендарный статус разблокирован!",
        "en": "👑 50 referrals! Legendary status unlocked!",
    },

    # ── Engagement Nudges (Feature 4) ────────────────────────────────────────
    "nudge_has_spins": {
        "uz": "🎡 Sizda {n} ta aylanish kutmoqda! Ilovani oching va aylantiring!",
        "ru": "🎡 У вас {n} вращений ждут! Откройте приложение и крутите!",
        "en": "🎡 You have {n} spins waiting! Open the app to spin!",
    },
    "nudge_check_spins": {
        "uz": "✅ Sharhlaringiz tasdiqlangan! Yangi aylanishlar bormi tekshiring.",
        "ru": "✅ Ваши отзывы одобрены! Проверьте, есть ли новые вращения.",
        "en": "✅ Your reviews are approved! Check if you have new spins.",
    },
    "nudge_first_review": {
        "uz": "📝 Birinchi sharhingizni yuboring va aylanish yuting!",
        "ru": "📝 Отправьте свой первый отзыв и получите вращение!",
        "en": "📝 Submit your first review to earn a spin!",
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
