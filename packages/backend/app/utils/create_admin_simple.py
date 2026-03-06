import asyncio
from app.database import AsyncSessionLocal
from app.models import AdminUser, AdminRole
from passlib.context import CryptContext
from sqlalchemy import select

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def main():
    async with AsyncSessionLocal() as session:
        # 1. Ensure Superadmin Role
        role_name = "superadmin"
        stmt = select(AdminRole).where(AdminRole.name == role_name)
        role = await session.scalar(stmt)
        if not role:
            role = AdminRole(name=role_name, permissions={"all": True})
            session.add(role)
            await session.commit()
            await session.refresh(role)
            print(f"Created role: {role.name}")
        
        # 2. Create/Update Admin User "admin@a.com"
        target_username = "admin@a.com" 
        stmt = select(AdminUser).where(AdminUser.email == target_username)
        admin = await session.scalar(stmt)
        
        password = "admin"
        hashed = get_password_hash(password)
        
        if not admin:
            print(f"Creating new admin user '{target_username}'...")
            admin = AdminUser(
                email=target_username, # Using "admin" as email
                password_hash=hashed,
                full_name="Super Admin",
                role_id=role.id,
                is_active=True,
                is_totp_enabled=False # Disable 2FA for ease of use as requested
            )
            session.add(admin)
        else:
            print(f"Updating existing admin user '{target_username}'...")
            admin.password_hash = hashed
            admin.is_active = True
            admin.role_id = role.id
            admin.is_totp_enabled = False
            
        await session.commit()
        print(f"Admin ready: Username (Email field)='{target_username}', Password='{password}'")

if __name__ == "__main__":
    asyncio.run(main())
