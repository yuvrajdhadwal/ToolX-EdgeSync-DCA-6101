from database import engine, Base
import models

def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    print("DB initialized")
