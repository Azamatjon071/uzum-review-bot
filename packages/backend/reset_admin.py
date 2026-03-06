#!/usr/bin/env python3
"""Script to reset the admin password."""

import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import AdminUser
from app.services.auth import hash_password


async def reset_admin_password():
    """Reset the password for admin@a.com to 'password'."""
    email = "admin@a.com"
    new_password = "password"
    
    async with AsyncSessionLocal() as session:
        # Find the admin user
        stmt = select(AdminUser).where(AdminUser.email == email)
        admin = await session.scalar(stmt)
        
        if not admin:
            print(f"❌ Admin user with email '{email}' not found.")
            return False
        
        # Hash and update the password
        admin.password_hash = hash_password(new_password)
        await session.commit()
        
        print(f"✅ Successfully reset password for '{email}'")
        return True


if __name__ == "__main__":
    success = asyncio.run(reset_admin_password())
    exit(0 if success else 1)
