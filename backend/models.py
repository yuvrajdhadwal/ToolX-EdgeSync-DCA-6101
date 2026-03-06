from sqlalchemy import (Column, Integer, String, Boolean, Float, LargeBinary,
    ForeignKey, DateTime, Table, ForeignKeyConstraint)
from sqlalchemy.orm import relationship, backref
from database import Base
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


class Device(Base):
    __tablename__ = "devices"
    serial_number = Column(String(100), primary_key=True)
    device_type = Column(String(50), nullable=False)
    firmware_id = Column(Integer, ForeignKey("firmware_updates.id", ondelete="RESTRICT"), primary_key=True, autoincrement=False)

    description = Column(String(255))
    last_update = Column(DateTime)
    last_online = Column(DateTime)
    latitude = Column(Float)
    longitude = Column(Float)

    firmware = relationship(
        "FirmwareUpdate",
        backref=backref("installed_devices", passive_deletes=True)
    )

# ===================================
#         Complex Relationships
# ===================================

class Deploy(Base):
    __tablename__ = "deploys"

    manager_id = Column(Integer, ForeignKey("business_managers.id"), primary_key=True)
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
