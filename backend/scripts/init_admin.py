#!/usr/bin/env python
"""One-time Super Administrator Initialization Script.
Creates the initial single super administrator account if not present.
Never overwrites or resets an existing administrator password.
"""
import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.admin_user import AdminUser


def init_admin() -> int:
    username = settings.ADMIN_USERNAME
    initial_password = settings.ADMIN_INITIAL_PASSWORD

    if not username or not initial_password:
        print("[ERROR] ADMIN_USERNAME and ADMIN_INITIAL_PASSWORD must be configured in environment or backend/.env.")
        return 1

    db = SessionLocal()
    try:
        existing_admin = db.query(AdminUser).filter(AdminUser.username == username).first()
        if existing_admin:
            print(f"[INFO] Administrator account '{username}' already exists (ID: {existing_admin.id}).")
            print("[INFO] Existing administrator password and credentials were NOT modified.")
            return 0

        # Check if any admin exists (enforce single super admin rule)
        any_admin = db.query(AdminUser).first()
        if any_admin:
            print(f"[INFO] An administrator account ('{any_admin.username}') already exists.")
            print("[INFO] This system enforces a Single Super Admin account. No changes made.")
            return 0

        # Create the initial single super admin
        hashed_pw = hash_password(initial_password)
        new_admin = AdminUser(
            username=username,
            hashed_password=hashed_pw,
            is_active=True,
            token_version=1,
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

        print("======================================================================")
        print(" BENGALURU STARTUP JOBS MAP - SINGLE SUPER ADMIN INITIALIZATION")
        print("======================================================================")
        print(f" [SUCCESS] Created initial Super Administrator account '{username}' (ID: {new_admin.id}).")
        print(" [SECURITY] Password has been securely hashed with bcrypt.")
        print(" [ACTION] Please log in to /admin/login and change your password in Settings.")
        print("======================================================================")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Failed to initialize administrator: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(init_admin())
