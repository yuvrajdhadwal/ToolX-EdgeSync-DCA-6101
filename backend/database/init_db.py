from backend.database.database import engine, Base
import backend.database.models as models

def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    print("DB initialized")
