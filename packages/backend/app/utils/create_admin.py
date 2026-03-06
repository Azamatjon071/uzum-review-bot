import asyncio
import secrets
from app.database import AsyncSessionLocal
from app.models.admin import AdminUser, AdminRole
from app.core.security import get_password_hash

async def create_admin():
    async with AsyncSessionLocal() as session:
        # Check if admin exists
        # (Assuming simple check by username/email if exists, otherwise create)
        # For this task, we'll just create a 'superadmin'
        
        username = "admin"
        password = "adminpassword123" # Simple default
        
        # In a real scenario, we'd check existence. Here let's just try to create.
        # If it fails (unique constraint), we'll assume it exists.
        
        try:
            admin = AdminUser(
                username=username,
                email="admin@example.com",
                hashed_password=get_password_hash(password),
                role=AdminRole.SUPERADMIN,
                full_name="Super Admin",
                is_active=True,
                is_superuser=True
            )
            session.add(admin)
            await session.commit()
            print(f"Admin created.\nUsername: {username}\nPassword: {password}")
        except Exception as e:
            print(f"Admin creation skipped (likely exists): {e}")

if __name__ == "__main__":
    asyncio.run(create_admin())
