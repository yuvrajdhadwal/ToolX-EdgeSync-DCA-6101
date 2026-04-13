from database.database import engine, Base

def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    print("DB initialized")