import asyncio
from app.database import AsyncSessionLocal
from app.models import AdminUser, AdminRole
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def create_admin():
    async with AsyncSessionLocal() as session:
        try:
            # Check if admin exists
            # We skip the check and rely on unique constraint or manual verification if needed
            # For simplicity in this environment, just try to create.
            
            admin = AdminUser(
                username="admin",
                email="admin@example.com",
                hashed_password=get_password_hash("adminpassword123"),
                role_id=AdminRole.SUPERADMIN_ID, # Assuming ID or we need to fetch role first
                full_name="Super Admin",
                is_active=True
            )
            # This will fail because role_id expects a UUID and we need to fetch/create a role first.
            # Let's fix this properly.
        except Exception:
            pass

async def main():
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        from app.models import AdminRole, AdminUser
        import uuid
        
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
        else:
            print(f"Found role: {role.name}")

        # 2. Create Admin User
        email = "admin@example.com"
        stmt = select(AdminUser).where(AdminUser.email == email)
        admin = await session.scalar(stmt)
        if not admin:
            admin = AdminUser(
                email=email,
                password_hash=get_password_hash("adminpassword123"),
                full_name="Super Admin",
                role_id=role.id,
                is_active=True
            )
            session.add(admin)
            await session.commit()
            print("Admin created: admin@example.com / adminpassword123")
        else:
            print("Admin already exists")

if __name__ == "__main__":
    asyncio.run(main())
