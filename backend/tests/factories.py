from __future__ import annotations

from dataclasses import dataclass, field
from itertools import count
from typing import Any

from sqlalchemy.orm import Session

from backend.database.models import (
    BusinessManager,
    Deploy,
    Developer,
    DeveloperManager,
    Device,
    FieldShopProfessional,
    FirmwareUpdate,
    Install,
    Rejection,
    Shop,
    SuperUser,
)


@dataclass
class ModelFactory:
    session: Session
    _sequence: count = field(default_factory=lambda: count(1))

    def _next_value(self, prefix: str) -> str:
        return f"{prefix}_{next(self._sequence)}"

    def flush(self):
        self.session.flush()
        return self

    def commit(self):
        self.session.commit()
        return self

    def developer_manager(self, **overrides: Any) -> DeveloperManager:
        manager = DeveloperManager(
            username=overrides.pop("username", self._next_value("dev_manager")),
            hashed_password=overrides.pop("hashed_password", "pwd"),
            **overrides,
        )
        self.session.add(manager)
        self.session.flush()
        return manager

    def developer(self, manager: DeveloperManager | None = None, **overrides: Any) -> Developer:
        if manager is None and "manager_id" not in overrides:
            manager = self.developer_manager()

        developer = Developer(
            username=overrides.pop("username", self._next_value("developer")),
            hashed_password=overrides.pop("hashed_password", "pwd"),
            manager_id=overrides.pop("manager_id", manager.id if manager else None),
            **overrides,
        )
        self.session.add(developer)
        self.session.flush()
        return developer

    def business_manager(self, **overrides: Any) -> BusinessManager:
        manager = BusinessManager(
            username=overrides.pop("username", self._next_value("business_manager")),
            hashed_password=overrides.pop("hashed_password", "pwd"),
            **overrides,
        )
        self.session.add(manager)
        self.session.flush()
        return manager

    def field_shop_professional(self, **overrides: Any) -> FieldShopProfessional:
        professional = FieldShopProfessional(
            username=overrides.pop("username", self._next_value("field_pro")),
            hashed_password=overrides.pop("hashed_password", "pwd"),
            **overrides,
        )
        self.session.add(professional)
        self.session.flush()
        return professional

    def firmware(
        self,
        uploaded_by: Developer | None = None,
        approved_by: DeveloperManager | None = None,
        declined_by: DeveloperManager | None = None,
        **overrides: Any,
    ) -> FirmwareUpdate:
        if uploaded_by is None and "uploaded_by" not in overrides:
            uploaded_by = self.developer()

        firmware = FirmwareUpdate(
            objectBinary=overrides.pop("objectBinary", b"firmware-bytes"),
            version_number=overrides.pop("version_number", self._next_value("v")),
            device_type=overrides.pop("device_type", "edge-device"),
            description=overrides.pop("description", "Test firmware"),
            isEmergency=overrides.pop("isEmergency", False),
            uploaded_by=overrides.pop("uploaded_by", uploaded_by.id if uploaded_by else None),
            approved_by=overrides.pop("approved_by", approved_by.id if approved_by else None),
            declined_by=overrides.pop("declined_by", declined_by.id if declined_by else None),
            declined_comment=overrides.pop("declined_comment", None),
            **overrides,
        )
        self.session.add(firmware)
        self.session.flush()
        return firmware

    def shop(self, **overrides: Any) -> Shop:
        shop = Shop(
            id=overrides.pop("id", next(self._sequence)),
            location=overrides.pop("location", self._next_value("shop_location")),
            latitude=overrides.pop("latitude", 0.0),
            longitude=overrides.pop("longitude", 0.0),
            **overrides,
        )
        self.session.add(shop)
        self.session.flush()
        return shop

    def device(self, firmware: FirmwareUpdate | None = None, **overrides: Any) -> Device:
        if firmware is None and "firmware_id" not in overrides:
            firmware = self.firmware()

        shop = overrides.pop("shop", None)
        if shop is None:
            shop = self.shop(location=overrides.pop("location", "Test Lab"))

        device = Device(
            serial_number=overrides.pop("serial_number", self._next_value("SN")),
            firmware_id=overrides.pop("firmware_id", firmware.id if firmware else None),
            device_type=overrides.pop("device_type", firmware.device_type if firmware else "edge-device"),
            location=overrides.pop("device_location", shop.location),
            developer_manager=overrides.pop("developer_manager", "unassigned"),
            description=overrides.pop("description", "Test device"),
            latitude=overrides.pop("latitude", shop.latitude),
            longitude=overrides.pop("longitude", shop.longitude),
            **overrides,
        )
        self.session.add(device)
        device.shop = shop
        self.session.flush()
        return device

    def deploy(
        self,
        manager: BusinessManager | None = None,
        firmware: FirmwareUpdate | None = None,
        device: Device | None = None,
        **overrides: Any,
    ) -> Deploy:
        manager = manager or self.business_manager()
        firmware = firmware or self.firmware()
        device = device or self.device(firmware=firmware)

        deploy = Deploy(
            manager_id=overrides.pop("manager_id", manager.id),
            target_firmware_id=overrides.pop("target_firmware_id", firmware.id),
            device_serial=overrides.pop("device_serial", device.serial_number),
            device_firmware_id=overrides.pop("device_firmware_id", device.firmware_id),
            **overrides,
        )
        self.session.add(deploy)
        self.session.flush()
        return deploy

    def install(
        self,
        professional: FieldShopProfessional | None = None,
        firmware: FirmwareUpdate | None = None,
        device: Device | None = None,
        **overrides: Any,
    ) -> Install:
        professional = professional or self.field_shop_professional()
        firmware = firmware or self.firmware()
        device = device or self.device(firmware=firmware)

        install = Install(
            professional_id=overrides.pop("professional_id", professional.id),
            target_firmware_id=overrides.pop("target_firmware_id", firmware.id),
            device_serial=overrides.pop("device_serial", device.serial_number),
            device_firmware_id=overrides.pop("device_firmware_id", device.firmware_id),
            **overrides,
        )
        self.session.add(install)
        self.session.flush()
        return install

    def rejection(
        self,
        professional: FieldShopProfessional | None = None,
        firmware: FirmwareUpdate | None = None,
        device: Device | None = None,
        **overrides: Any,
    ) -> Rejection:
        professional = professional or self.field_shop_professional()
        firmware = firmware or self.firmware()
        device = device or self.device(firmware=firmware)

        rejection = Rejection(
            professional_id=overrides.pop("professional_id", professional.id),
            target_firmware_id=overrides.pop("target_firmware_id", firmware.id),
            device_serial=overrides.pop("device_serial", device.serial_number),
            device_firmware_id=overrides.pop("device_firmware_id", device.firmware_id),
            **overrides,
        )
        self.session.add(rejection)
        self.session.flush()
        return rejection

    def link_viewable(self, user: Developer | DeveloperManager | BusinessManager, firmware: FirmwareUpdate):
        user.viewable_firmware.append(firmware)
        self.session.flush()
        return firmware

    def link_downloadable(self, professional: FieldShopProfessional, firmware: FirmwareUpdate):
        professional.download_firmware.append(firmware)
        self.session.flush()
        return firmware
