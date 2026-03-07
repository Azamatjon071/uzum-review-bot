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
        # Define granular permissions for roles other than superadmin
        # superadmin bypasses checks in deps.py so list can be empty or symbolic
        all_perms = [
            "submissions.read", "submissions.write",
            "users.read", "users.write",
            "reports.read",
            "view_settings", "manage_settings",
            "analytics.read",
            "prizes.read", "prizes.write",
            "charity.read", "charity.write",
            "view_audit_log",
            "admins.write",
            "broadcast.write",
        ]

        roles = {
            "superadmin": all_perms,  # role name must be "superadmin" to bypass checks
            "moderator": [
                "submissions.read", "submissions.write",
                "users.read",
                "reports.read",
                "analytics.read",
                "prizes.read",
                "charity.read"
            ],
            "support": [
                "users.read", "users.write",
                "submissions.read",
                "reports.read",
                "view_audit_log"
            ]
        }
        
        role_map = {}
        
        for name, perms in roles.items():
            # Upsert role
            stmt = select(AdminRole).where(AdminRole.name == name)
            role = await session.scalar(stmt)
            if not role:
                role = AdminRole(name=name, permissions=perms)
                session.add(role)
                await session.flush()
                print(f"Created role: {name}")
            else:
                # Update permissions if role exists
                role.permissions = perms
                session.add(role)
                print(f"Updated permissions for role: {name}")
            
            role_map[name] = role.id
        
        await session.commit()

        # 2. Create Admins
        admins = [
            ("admin@uzum.com", "admin", "Super Admin", "superadmin"),
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
