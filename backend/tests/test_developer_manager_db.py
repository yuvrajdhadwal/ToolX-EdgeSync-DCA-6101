import pytest


pytestmark = pytest.mark.developer_manager


class TestDeveloperManagerDatabaseBehavior:
    def test_manager_can_have_multiple_developers(self, factory):
        manager = factory.developer_manager()
        developer_one = factory.developer(manager=manager)
        developer_two = factory.developer(manager=manager)

        assert developer_one.manager_id == manager.id
        assert developer_two.manager_id == manager.id

    def test_manager_can_view_firmware(self, factory):
        manager = factory.developer_manager()
        firmware = factory.firmware()

        factory.link_viewable(manager, firmware)

        assert any(item.id == firmware.id for item in manager.viewable_firmware)
