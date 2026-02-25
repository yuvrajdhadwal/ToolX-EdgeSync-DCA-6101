from database import SessionLocal
from models import User
from init_db import init_db

def main():
    init_db()

    db = SessionLocal()
    try:
        # 1) insert a user
        u = User(role="Developer", username="user1", hashed_password="not_really_hashed")
        db.add(u)
        db.commit()
        db.refresh(u)
        print("Inserted user:", u.id, u.username)

        # 2) query users
        users = db.query(User).all()
        print("All users:", [(x.id, x.role, x.username) for x in users])


        # 3) query one user
        one = db.query(User).filter(User.username == "user1").first()
        print("Found:", one.id, one.username if one else None)

    finally:
        db.close()

if __name__ == "__main__":
    main()
