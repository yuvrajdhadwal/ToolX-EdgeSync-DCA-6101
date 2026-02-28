from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import enum

class UserRole(str, enum.Enum):
    developer = "developer"
    developer_manager = "developer_manager"
    business_manager = "business_manager"
    field_shop_professional = "field_shop_professional"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)

    developer = relationship("Developer", back_populates="user", uselist=False)
    developer_manager = relationship("DeveloperManager", back_populates="user", uselist=False)
    business_manager = relationship("BusinessManager", back_populates="user", uselist=False)
    field_shop_professional = relationship("FieldShopProfessional", back_populates="user", uselist=False)

class Developer(Base):
    __tablename__ = "developers"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    user = relationship("User", back_populates="developer")

class DeveloperManager(Base):
    __tablename__ = "developer_managers"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    user = relationship("User", back_populates="developer_manager")

class BusinessManager(Base):
    __tablename__ = "business_managers"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    user = relationship("User", back_populates="business_manager")

class FieldShopProfessional(Base):
    __tablename__ = "field_shop_professionals"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    user = relationship("User", back_populates="field_shop_professional")