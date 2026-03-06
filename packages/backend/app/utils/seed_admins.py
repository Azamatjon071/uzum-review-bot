import asyncio
import sys
import os

# Add parent directory to path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import select
from passlib.context import CryptContext
from app.database import AsyncSessionLocal
from app.models import AdminUser, AdminRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def seed_admins():
    async with AsyncSessionLocal() as session:
        # 1. Create Roles
        roles = {
            "super_admin": {"all": True},
            "moderator": {"reviews": True, "users": False},
            "support": {"users": True, "reviews": False}
        }
        
        role_map = {}
        
        for name, perms in roles.items():
            stmt = select(AdminRole).where(AdminRole.name == name)
            role = await session.scalar(stmt)
            if not role:
                role = AdminRole(name=name, permissions=perms)
                session.add(role)
                await session.flush()
                print(f"Created role: {name}")
            role_map[name] = role.id
        
        await session.commit()

        # 2. Create Admins
        admins = [
            ("admin@uzum.com", "admin", "Super Admin", "super_admin"),
            ("mod@uzum.com", "mod", "Moderator User", "moderator"),
            ("support@uzum.com", "support", "Support User", "support")
        ]

        for email, password, name, role_key in admins:
            stmt = select(AdminUser).where(AdminUser.email == email)
            existing = await session.scalar(stmt)
            if not existing:
                admin = AdminUser(
                    email=email,
                    password_hash=get_password_hash(password),
                    full_name=name,
                    role_id=role_map[role_key],
                    is_active=True,
                    force_2fa_setup=False 
                )
                session.add(admin)
                print(f"Created admin: {email} / {password}")
            else:
                print(f"Admin exists: {email}")
                # Update password just in case
                existing.password_hash = get_password_hash(password)
                existing.role_id = role_map[role_key]
                session.add(existing)
                print(f"Updated admin password: {email}")

        await session.commit()

if __name__ == "__main__":
    asyncio.run(seed_admins())
