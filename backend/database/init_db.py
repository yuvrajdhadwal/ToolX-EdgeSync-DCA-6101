import os

import bcrypt

from database.database import SessionLocal, engine, Base
from database.models import SuperUser


INITIAL_SUPER_USER_USERNAME = os.getenv("INITIAL_SUPER_USER_USERNAME", "root")
INITIAL_SUPER_USER_PASSWORD = os.getenv(
    "INITIAL_SUPER_USER_PASSWORD", "admin"
)


def super_user() -> None:
    db = SessionLocal()
    try:
        existing_super_user = db.query(SuperUser).first()
        if existing_super_user:
            return

        hashed_password = bcrypt.hashpw(
            INITIAL_SUPER_USER_PASSWORD.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        super_user = SuperUser(
            username=INITIAL_SUPER_USER_USERNAME,
            hashed_password=hashed_password,
        )
        db.add(super_user)
        db.commit()
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    super_user()
    print("DB initialized")
