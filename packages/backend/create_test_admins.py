import asyncio
import sys
import os

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import AdminUser, AdminRole
from app.services.auth import hash_password

async def create_admins():
    print("Starting admin creation...")
    async with AsyncSessionLocal() as session:
        # 1. Ensure Roles
        roles_definitions = [
            ("SUPER_ADMIN", {"all": True}),
            ("REVIEWER", {"submissions.read": True, "submissions.review": True}),
            ("VIEWER", {"submissions.read": True})
        ]
        
        roles_map = {}

        for r_name, r_perms in roles_definitions:
            stmt = select(AdminRole).where(AdminRole.name == r_name)
            result = await session.execute(stmt)
            role = result.scalar_one_or_none()
            
            if not role:
                print(f"Creating role: {r_name}")
                role = AdminRole(name=r_name, permissions=r_perms)
                session.add(role)
                await session.flush() # flush to get ID
            else:
                print(f"Role exists: {r_name}")
            
            roles_map[r_name] = role

        # 2. Create Users
        users_data = [
            {
                "email": "admin@uzum.com",
                "full_name": "Super Admin",
                "role_name": "SUPER_ADMIN",
                "password": "password"
            },
            {
                "email": "reviewer@uzum.com",
                "full_name": "Reviewer User",
                "role_name": "REVIEWER",
                "password": "password"
            },
            {
                "email": "viewer@uzum.com",
                "full_name": "Viewer User",
                "role_name": "VIEWER",
                "password": "password"
            }
        ]

        for u_data in users_data:
            stmt = select(AdminUser).where(AdminUser.email == u_data["email"])
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()

            role = roles_map[u_data["role_name"]]
            hashed = hash_password(u_data["password"])

            if not user:
                print(f"Creating user: {u_data['email']}")
                user = AdminUser(
                    email=u_data["email"],
                    full_name=u_data["full_name"],
                    password_hash=hashed,
                    role_id=role.id,
                    is_active=True
                )
                session.add(user)
            else:
                print(f"Updating user password: {u_data['email']}")
                user.password_hash = hashed
                # Ensure role is correct too
                user.role_id = role.id
                session.add(user)

        await session.commit()
        print("Done creating test admins.")

if __name__ == "__main__":
    asyncio.run(create_admins())
