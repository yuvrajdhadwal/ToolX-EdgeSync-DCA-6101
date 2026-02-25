from sqlalchemy import Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "users"

    role = Column(String, nullable = False)
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, nullable = False)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)