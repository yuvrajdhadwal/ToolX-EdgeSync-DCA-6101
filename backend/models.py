from sqlalchemy import Column, Integer, String, Enum
from database import Base
import enum

class UserRole(str, enum.Enum):
    developer = "developer"
    developer_manager = "developer_manager"
    business_manager = "business_manageer"
    field_shop_professional = "field_shop_professional"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)