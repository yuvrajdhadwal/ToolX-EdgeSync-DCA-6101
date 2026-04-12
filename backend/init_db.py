"""
Expected functionality:
- Database initialization helper.

Expected functions to be added:
- None

Expected functions to be removed:
- None
"""

from database import engine, Base
import models

def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    print("DB initialized")
