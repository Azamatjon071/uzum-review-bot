import asyncio
import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import (
    User, Product, Submission, SubmissionStatus, Prize, PrizeType,
    Language, AchievementRarity
)

# -----------------------------------------------------------------------------
# Data Constants
# -----------------------------------------------------------------------------

PRODUCT_NAMES = [
    ("iPhone 15 Pro", "https://images.uzum.uz/iphone15.jpg"),
    ("Samsung Galaxy S24", "https://images.uzum.uz/s24.jpg"),
    ("MacBook Air M2", "https://images.uzum.uz/macbook.jpg"),
    ("Sony WH-1000XM5", "https://images.uzum.uz/sony.jpg"),
    ("Dyson Airwrap", "https://images.uzum.uz/dyson.jpg"),
    ("PlayStation 5", "https://images.uzum.uz/ps5.jpg"),
    ("AirPods Pro 2", "https://images.uzum.uz/airpods.jpg"),
    ("Xiaomi Robot Vacuum", "https://images.uzum.uz/xiaomi.jpg"),
    ("Nespresso Coffee Machine", "https://images.uzum.uz/nespresso.jpg"),
    ("JBL Flip 6", "https://images.uzum.uz/jbl.jpg"),
]

PRIZES = [
    ("5% Discount", PrizeType.DISCOUNT, 5, 50),
    ("10% Discount", PrizeType.DISCOUNT, 10, 30),
    ("20.000 UZS Cashback", PrizeType.CASHBACK, 20000, 20),
    ("50.000 UZS Cashback", PrizeType.CASHBACK, 50000, 10),
    ("Free Delivery", PrizeType.GIFT, 15000, 40),
    ("Mystery Gift", PrizeType.GIFT, 0, 5),
]

USER_NAMES = [
    ("Aziz", "Rakhimov"), ("Madina", "Karimova"), ("Jamshid", "Tashpulatov"),
    ("Sevara", "Nazarova"), ("Bekzod", "Abdullaev"), ("Laylo", "Usmanova"),
    ("Farrukh", "Ismailov"), ("Nigora", "Saidova"), ("Otabek", "Mirzayev"),
    ("Dilnoza", "Yusupova"), ("Sardor", "Alimov"), ("Guli", "Khamidova"),
    ("Rustam", "Sharipov"), ("Malika", "Umarova"), ("Jasur", "Norov"),
]

REVIEWS = [
    "Great product, highly recommended!",
    "Good value for money.",
    "Fast delivery, excellent service.",
    "Quality could be better but okay for the price.",
    "Amazing! Exceeded my expectations.",
    "Not bad, but packaging was damaged.",
    "Five stars! Will buy again.",
    "Works perfectly as described.",
    "Average quality.",
    "Absolutely love it!",
]

# -----------------------------------------------------------------------------
# Seed Logic
# -----------------------------------------------------------------------------

async def seed_products(session):
    print("Seeding products...")
    products = []
    for name, img in PRODUCT_NAMES:
        # Check existing
        stmt = select(Product).where(Product.name_en == name)
        existing = await session.scalar(stmt)
        if existing:
            products.append(existing)
            continue
        
        p = Product(
            name_uz=name,
            name_ru=name,
            name_en=name,
            image_url=img,
            uzum_product_url=f"https://uzum.uz/product/{name.lower().replace(' ', '-')}"
        )
        session.add(p)
        products.append(p)
    await session.commit()
    return products

async def seed_prizes(session):
    print("Seeding prizes...")
    prizes = []
    for name, ptype, val, weight in PRIZES:
        stmt = select(Prize).where(Prize.name_en == name)
        existing = await session.scalar(stmt)
        if existing:
            prizes.append(existing)
            continue

        p = Prize(
            name_uz=name,
            name_ru=name,
            name_en=name,
            prize_type=ptype,
            value=val,
            weight=weight,
            is_active=True
        )
        session.add(p)
        prizes.append(p)
    await session.commit()
    return prizes

async def seed_users(session):
    print("Seeding users...")
    users = []
    for i, (first, last) in enumerate(USER_NAMES):
        tid = 1000000 + i
        stmt = select(User).where(User.telegram_id == tid)
        existing = await session.scalar(stmt)
        if existing:
            users.append(existing)
            continue

        u = User(
            telegram_id=tid,
            first_name=first,
            last_name=last,
            username=f"{first.lower()}{last.lower()}",
            language=Language.UZ,
            referral_code=f"REF{tid}",
            spin_count=random.randint(0, 5)
        )
        session.add(u)
        users.append(u)
    await session.commit()
    return users

async def seed_submissions(session, users, products):
    print("Seeding submissions...")
    count = 0
    for user in users:
        # Each user has 1-5 submissions
        for _ in range(random.randint(1, 5)):
            product = random.choice(products)
            status = random.choice(list(SubmissionStatus))
            
            # Simple check to avoid duplicate flooding if running multiple times
            # (In a real seed script we might check DB, but here we just rely on randomness)
            
            sub = Submission(
                user_id=user.id,
                product_id=product.id,
                order_number=f"ORD-{random.randint(10000, 99999)}",
                review_text=random.choice(REVIEWS),
                status=status,
                spin_granted=(status == SubmissionStatus.APPROVED),
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30))
            )
            session.add(sub)
            count += 1
            
            # Update user stats
            user.total_submissions += 1
            if status == SubmissionStatus.APPROVED:
                user.approved_submissions += 1
                if sub.spin_granted:
                    user.spin_count += 1
    
    await session.commit()
    print(f"Added {count} submissions.")

async def main():
    async with AsyncSessionLocal() as session:
        products = await seed_products(session)
        prizes = await seed_prizes(session)
        users = await seed_users(session)
        await seed_submissions(session, users, products)
        print("Seeding complete!")

if __name__ == "__main__":
    asyncio.run(main())
