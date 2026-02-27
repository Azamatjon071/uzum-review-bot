#!/usr/bin/env python3
"""
CLI script to create the first superadmin user.

Usage:
    docker compose exec backend python -m app.utils.create_superadmin
  or
    python -m app.utils.create_superadmin --email admin@example.com --name "Admin Name"
"""
import argparse
import asyncio
import getpass
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models import AdminUser, AdminRole
from app.services.auth import hash_password

settings = get_settings()


async def create_superadmin(email: str, full_name: str, password: str) -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if email already taken
        existing = await session.scalar(
            select(AdminUser).where(AdminUser.email == email)
        )
        if existing:
            print(f"[ERROR] Admin with email '{email}' already exists.")
            await engine.dispose()
            sys.exit(1)

        # Create or get superadmin role
        role = await session.scalar(
            select(AdminRole).where(AdminRole.name == "superadmin")
        )
        if not role:
            role = AdminRole(
                name="superadmin",
                permissions=[
                    "submissions.read", "submissions.write",
                    "users.read", "users.write",
                    "prizes.read", "prizes.write",
                    "charity.read", "charity.write",
                    "analytics.read",
                    "audit.read",
                    "admins.read", "admins.write",
                    "settings.read", "settings.write",
                    "broadcast.write",
                    "reports.read",
                ],
            )
            session.add(role)
            await session.flush()

        hashed = hash_password(password)
        admin = AdminUser(
            email=email,
            full_name=full_name,
            password_hash=hashed,
            role_id=role.id,
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        await session.refresh(admin)

    await engine.dispose()
    print(f"[OK] Superadmin '{email}' ({full_name}) created (id={admin.id}).")
    print("     Log in at the admin panel with your email and password.")
    print("     You will be prompted to set up TOTP 2FA on first login.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a superadmin user")
    parser.add_argument("--email", default=None, help="Admin email")
    parser.add_argument("--name", default=None, help="Full name")
    args = parser.parse_args()

    email = args.email or input("Email: ").strip()
    full_name = args.name or input("Full name: ").strip()
    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")

    if password != confirm:
        print("[ERROR] Passwords do not match.")
        sys.exit(1)

    if len(password) < 12:
        print("[ERROR] Password must be at least 12 characters.")
        sys.exit(1)

    asyncio.run(create_superadmin(email, full_name, password))


if __name__ == "__main__":
    main()

