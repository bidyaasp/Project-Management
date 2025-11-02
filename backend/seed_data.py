# seed_data.py

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db import models
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_initial_data():
    db: Session = SessionLocal()

    # --- Create default roles ---
    roles = ["admin", "manager", "developer"]
    for role_name in roles:
        existing = db.query(models.Role).filter_by(name=role_name).first()
        if not existing:
            new_role = models.Role(name=role_name)
            db.add(new_role)
            print(f"✅ Created role: {role_name}")

    db.commit()

    # --- Create admin user ---
    admin_email = "admin@gmail.com"
    existing_admin = db.query(models.User).filter_by(email=admin_email).first()
    admin_role = db.query(models.Role).filter_by(name="admin").first()

    if not existing_admin:
        admin_user = models.User(
            name="Admin",
            email=admin_email,
            hashed_password=pwd_context.hash("admin123"),
            role_id=admin_role.id,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print(f"✅ Created admin user: {admin_email}")
    else:
        print("⚠️ Admin user already exists.")

    db.close()


if __name__ == "__main__":
    seed_initial_data()
    print("🎉 Initial data seeded successfully!")
