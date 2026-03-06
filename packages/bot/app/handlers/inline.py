"""
Inline query handler for searching products.
"""
from aiogram import Router
from aiogram.types import InlineQuery, InlineQueryResultArticle, InputTextMessageContent
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.services.api import get_products, APIError
from app.i18n import t

router = Router(name="inline")

@router.inline_query()
async def inline_product_search(query: InlineQuery):
    search_term = query.query.strip()
    # If empty, maybe show popular products? For now, we search if term exists or show all.
    
    try:
        data = await get_products(search=search_term, page_size=20)
        products = data.get("products", [])
    except APIError:
        return

    results = []
    for p in products:
        name_uz = p.get("name_uz") or p.get("name_ru") or "No name"
        name_ru = p.get("name_ru") or name_uz
        price = p.get("price", 0)
        
        # Determine language from user context if possible, but InlineQuery doesn't give easy lang access
        # We'll show multi-language or just UZ/RU
        
        description = f"{p.get('category_id', '')} | {price:,} UZS"
        thumb_url = p.get("image_url")

        # When user clicks, send a message with "Review this product" button
        # Deep link to start=review_{id}
        
        keyboard = InlineKeyboardBuilder()
        keyboard.button(text="📝 Review / Sharh / Отзыв", url=f"https://t.me/UzumReviewBot?start=review_{p['id']}")
        
        results.append(
            InlineQueryResultArticle(
                id=str(p["id"]),
                title=name_uz,
                description=description,
                thumbnail_url=thumb_url,
                input_message_content=InputTextMessageContent(
                    message_text=f"<b>{name_uz}</b>\n\n{name_ru}\n\nPrice: {price:,} UZS",
                    parse_mode="HTML",
                ),
                reply_markup=keyboard.as_markup()
            )
        )

    await query.answer(results, cache_time=60, is_personal=False)
