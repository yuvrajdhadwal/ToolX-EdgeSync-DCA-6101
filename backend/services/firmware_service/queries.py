"""
Firmware query functions for retrieving firmware by user role and status.
"""

from typing import List

from models import Developer, FirmwareUpdate, User
from sqlalchemy.orm import Session


def get_firmware_device_types(user: User, db: Session) -> List[str]:
    """Get device types based on user role and viewable firmware."""
    if user.type == "developer":
        device_types = [
            device_type
            for (device_type,) in db.query(FirmwareUpdate.device_type)
            .filter(FirmwareUpdate.uploaded_by == user.id)
            .distinct()
            .order_by(FirmwareUpdate.device_type)
            .all()
        ]
    elif user.type == "developer_manager":
        device_types = [
            device_type
            for (device_type,) in db.query(FirmwareUpdate.device_type)
            .join(Developer, FirmwareUpdate.uploaded_by == Developer.id)
            .filter(Developer.manager_id == user.id)
            .distinct()
            .order_by(FirmwareUpdate.device_type)
            .all()
        ]
    else:
        # business_manager sees all device types
        device_types = [
            device_type
            for (device_type,) in db.query(FirmwareUpdate.device_type)
            .distinct()
            .order_by(FirmwareUpdate.device_type)
            .all()
        ]

    return device_types


def get_firmware_by_status(user: User, status: str, db: Session) -> List[FirmwareUpdate]:
    """Get firmware by approval status based on user role."""
    if status == "pending":
        if user.type == "developer":
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.approved_by.is_(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )
        elif user.type == "developer_manager":
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.approved_by is None and firmware.declined_by is None
            ]
        else:
            # business_manager sees all pending firmware
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.approved_by.is_(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )

    elif status == "current":
        if user.type == "developer":
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.approved_by.isnot(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )
        elif user.type == "developer_manager":
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.approved_by is not None and firmware.declined_by is None
            ]
        else:
            # business_manager sees all approved firmware
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.approved_by.isnot(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )

    else:  # rejected
        if user.type == "developer":
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.declined_by.isnot(None),
                )
                .all()
            )
        elif user.type == "developer_manager":
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.declined_by is not None
            ]
        else:
            # business_manager sees all rejected firmware
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.declined_by.isnot(None),
                )
                .all()
            )

    return records
