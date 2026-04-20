from sqlalchemy import (Column, Integer, String, Boolean, Float, LargeBinary,
    ForeignKey, DateTime, Table, ForeignKeyConstraint, UniqueConstraint)
from sqlalchemy.orm import relationship, backref
from database.database import Base
from datetime import datetime

# ==============================
#       Relationships
# ==============================

# Views Relationship N:M
views_table = Table(
    "views",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("firmware_id", Integer, ForeignKey("firmware_updates.id"), primary_key=True),
)

# Downloads Table M:N
downloads_table = Table(
    "downloads",
    Base.metadata,
    Column("professional_id", Integer, ForeignKey("field_shop_professionals.id"), primary_key=True),
    Column("firmware_id", Integer, ForeignKey("firmware_updates.id"), primary_key=True),
)

# Shop Access Relationship N:M
shop_access_table = Table(
    "shop_access",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("shop_id", Integer, ForeignKey("shops.id", ondelete="CASCADE"), primary_key=True),
)

# Shop Devices Relationship 1:N through association table
shop_devices_table = Table(
    "shop_devices",
    Base.metadata,
    Column("device_serial", String(100), ForeignKey("devices.serial_number", ondelete="CASCADE"), primary_key=True),
    Column("shop_id", Integer, ForeignKey("shops.id", ondelete="CASCADE"), nullable=False),
)

# ======================
#       User Tables
# ======================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)

    # Disjoint Relationship based on Tutorial
    type = Column(String(50))
    __mapper_args__ = {
        "polymorphic_on": "type",
        "polymorphic_identity": "user"
    }

    # View Firmware Relationship M:N Table
    viewable_firmware = relationship("FirmwareUpdate", secondary=views_table)

    # Shop Access Relationship M:N Table
    accessible_shops = relationship("Shop", secondary=shop_access_table, back_populates="access_users")


class Developer(User):
    __tablename__ = "developers"
    id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    # 1:N Relationship - Manages
    manager_id = Column(Integer, ForeignKey("developer_managers.id", ondelete="SET NULL"))
    manager = relationship(
        "DeveloperManager",
        backref="developers",
        foreign_keys=[manager_id]
    )
    __mapper_args__ = {"polymorphic_identity": "developer"}


class DeveloperManager(User):
    __tablename__ = "developer_managers"
    id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    __mapper_args__ = {"polymorphic_identity": "developer_manager"}


class BusinessManager(User):
    __tablename__ = "business_managers"
    id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    __mapper_args__ = {"polymorphic_identity": "business_manager"}


class FieldShopProfessional(User):
    __tablename__ = "field_shop_professionals"
    id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    __mapper_args__ = {"polymorphic_identity": "field_shop_professional"}

    # Firmware Downloading Relationship M:N
    download_firmware = relationship("FirmwareUpdate", secondary=downloads_table)


# ==========================
#       Other Entities
# ==========================

class FirmwareUpdate(Base):
    __tablename__ = "firmware_updates"
    id = Column(Integer, primary_key=True)
    objectBinary = Column(LargeBinary, nullable=False)
    version_number = Column(String(20), nullable=False)
    device_type = Column(String(50), nullable=False)
    description = Column(String(255))
    isEmergency = Column(Boolean, default=False)

    # Uploads Relationship 1:N
    uploaded_by = Column(Integer, ForeignKey("developers.id", ondelete="SET NULL"))
    uploaded_timestamp = Column(DateTime, default=datetime.utcnow)

    # Approves/Declines Relationships 1:N
    approved_by = Column(Integer, ForeignKey("developer_managers.id", ondelete="SET NULL"))
    declined_by = Column(Integer, ForeignKey("developer_managers.id", ondelete="SET NULL"))
    declined_comment = Column(String(255))

    __table_args__ = (
        UniqueConstraint('version_number', 'device_type'),
    )


class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True)
    location = Column(String(255), nullable=False, unique=True)
    latitude = Column(Float)
    longitude = Column(Float)

    devices = relationship("Device", secondary=shop_devices_table, back_populates="shop")
    access_users = relationship("User", secondary=shop_access_table, back_populates="accessible_shops")

class Device(Base):
    __tablename__ = "devices"
    __table_args__ = (
        UniqueConstraint("serial_number", "firmware_id"),
    )

    serial_number = Column(String(100), primary_key=True)
    firmware_id = Column(Integer, ForeignKey("firmware_updates.id", ondelete="SET NULL"), nullable=True, default=None)

    device_type = Column(String(50))
    location = Column(String(255))
    developer_manager = Column(String(100))
    description = Column(String(255))
    last_update = Column(DateTime)
    last_online = Column(DateTime)
    latitude = Column(Float)
    longitude = Column(Float)

    firmware = relationship(
        "FirmwareUpdate",
        backref=backref("installed_devices", passive_deletes=True)
    )
    shop = relationship("Shop", secondary=shop_devices_table, uselist=False, back_populates="devices")

    # M:N relationship w/ Field Shop Professional
    field_shop_professionals = relationship(
        "FieldShopProfessional",
        secondary=field2device_table,
        backref="assigned_devices",
    )

# ===================================
#         Complex Relationships
# ===================================

class Deploy(Base):
    __tablename__ = "deploys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    manager_id = Column(Integer, ForeignKey("business_managers.id"), nullable=False)
    target_firmware_id = Column(Integer, ForeignKey("firmware_updates.id"), nullable=False)
    device_serial = Column(String(100), nullable=False)
    device_firmware_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    isActive = Column(Boolean, default=False)
    isEmergency = Column(Boolean, default=False)
    isAccepted = Column(Boolean)


class Install(Base):
    __tablename__ = "installs"

    professional_id = Column(Integer, ForeignKey("field_shop_professionals.id"), primary_key=True)
    target_firmware_id = Column(Integer, ForeignKey("firmware_updates.id"), primary_key=True)

    device_serial = Column(String(100), primary_key=True)
    device_firmware_id = Column(Integer, primary_key=True)

    timestamp = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        ForeignKeyConstraint(
            ["device_serial", "device_firmware_id"],
            ["devices.serial_number", "devices.firmware_id"]
        ),
    )

class Rejection(Base):
    __tablename__ = "rejections"

    professional_id = Column(Integer, ForeignKey("field_shop_professionals.id"), primary_key=True)
    target_firmware_id = Column(Integer, ForeignKey("firmware_updates.id"), primary_key=True)

    device_serial = Column(String(100), primary_key=True)
    device_firmware_id = Column(Integer, primary_key=True)

    timestamp = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        ForeignKeyConstraint(
            ["device_serial", "device_firmware_id"],
            ["devices.serial_number", "devices.firmware_id"]
        ),
    )
