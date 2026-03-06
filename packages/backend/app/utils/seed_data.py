import asyncio
import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import (
    User, Product, Submission, SubmissionStatus, SubmissionImage, Prize, PrizeType,
    Language, AchievementRarity
)

# -----------------------------------------------------------------------------
# Data Constants
# -----------------------------------------------------------------------------

PRODUCT_NAMES = [
    ("iPhone 15 Pro", "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=600&auto=format&fit=crop"),
    ("Samsung Galaxy S24", "https://images.unsplash.com/photo-1707227167623-1c32b53f65cc?q=80&w=600&auto=format&fit=crop"),
    ("MacBook Air M2", "https://images.unsplash.com/photo-1662947036237-c1d0f5077427?q=80&w=600&auto=format&fit=crop"),
    ("Sony WH-1000XM5", "https://images.unsplash.com/photo-1662650074697-3f3032890656?q=80&w=600&auto=format&fit=crop"),
    ("Dyson Airwrap", "https://images.unsplash.com/photo-1628122368305-649065f4229a?q=80&w=600&auto=format&fit=crop"),
    ("PlayStation 5", "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=600&auto=format&fit=crop"),
    ("AirPods Pro 2", "https://images.unsplash.com/photo-1665487739556-912b7f0067c2?q=80&w=600&auto=format&fit=crop"),
    ("Xiaomi Robot Vacuum", "https://images.unsplash.com/photo-1594917544078-43e493393f93?q=80&w=600&auto=format&fit=crop"),
    ("Nespresso Coffee Machine", "https://images.unsplash.com/photo-1594266100147-3a1529d443db?q=80&w=600&auto=format&fit=crop"),
    ("JBL Flip 6", "https://images.unsplash.com/photo-1631281895648-5c4794215707?q=80&w=600&auto=format&fit=crop"),
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

REVIEW_IMAGES = [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511556820780-d912e42b4980?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?q=80&w=600&auto=format&fit=crop",
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
            await session.flush()  # Get ID

            # Add 1-3 images for 80% of submissions
            if random.random() < 0.8:
                # Pick 1-3 unique images
                sub_imgs = random.sample(REVIEW_IMAGES, k=random.randint(1, min(3, len(REVIEW_IMAGES))))
                for img_url in sub_imgs:
                    img = SubmissionImage(
                        submission_id=sub.id,
                        file_key=img_url,
                        original_filename=f"photo_{random.randint(1,100)}.jpg",
                        file_size=random.randint(500000, 2000000),
                    )
                    session.add(img)

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
