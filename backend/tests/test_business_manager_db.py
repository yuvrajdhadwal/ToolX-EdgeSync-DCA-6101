import pytest


pytestmark = pytest.mark.business_manager


class TestBusinessManagerDatabaseBehavior:
    def test_business_manager_can_create_deploy_record(self, factory):
        manager = factory.business_manager()
        firmware = factory.firmware()
        device = factory.device(firmware=firmware)
        deploy = factory.deploy(manager=manager, firmware=firmware, device=device)

        assert deploy.manager_id == manager.id
        assert deploy.target_firmware_id == firmware.id
        assert deploy.device_serial == device.serial_number

    def test_business_manager_can_view_firmware(self, factory):
        manager = factory.business_manager()
        firmware = factory.firmware(approved_by=factory.developer_manager())

        factory.link_viewable(manager, firmware)

        assert any(item.id == firmware.id for item in manager.viewable_firmware)
