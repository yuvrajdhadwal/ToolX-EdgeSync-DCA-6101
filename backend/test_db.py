from database import SessionLocal
from models import User, Developer, DeveloperManager, BusinessManager, FieldShopProfessional, UserRole
from init_db import init_db

def main():
    init_db()

    db = SessionLocal()
    try:
        # 1) insert a user
        u1 = User(role=UserRole.developer, username="user1", hashed_password="not_really_hashed")
        db.add(u1)
        db.commit()
        db.refresh(u1)
        print("Inserted user:", u1.id, u1.username)

        u2 = User(role=UserRole.developer_manager, username="user2", hashed_password="not_really_hashed")
        db.add(u2)
        db.commit()
        db.refresh(u2)
        print("Inserted user:", u2.id, u2.username)

        u3 = User(role=UserRole.business_manager, username="user3", hashed_password="not_really_hashed")
        db.add(u3)
        db.commit()
        db.refresh(u3)
        print("Inserted user:", u3.id, u3.username)

        u4 = User(role=UserRole.field_shop_professional, username="user4", hashed_password="not_really_hashed")
        db.add(u4)
        db.commit()
        db.refresh(u4)
        print("Inserted user:", u4.id, u4.username)

        # 2) query users
        users = db.query(User).all()
        print("All users:", [(x.id, x.role, x.username) for x in users])

        devs = db.query(Developer).all()
        print("All developers:", [(x.user_id) for x in devs])

        devmngs = db.query(DeveloperManager).all()
        print("All developer managers:", [(x.user_id) for x in devmngs])

        bizmngs = db.query(BusinessManager).all()
        print("All business managers:", [(x.user_id) for x in bizmngs])

        fieldpros = db.query(FieldShopProfessional).all()
        print("All field/shop professionals:", [(x.user_id) for x in fieldpros])


        # 3) query one user
        one = db.query(User).filter(User.username == "user1").first()
        print("Found:", one.id, one.username if one else None)

    finally:
        db.close()

if __name__ == "__main__":
    main()
