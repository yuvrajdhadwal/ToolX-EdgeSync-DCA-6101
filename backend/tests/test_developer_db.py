import pytest

from backend.database.models import Developer


pytestmark = pytest.mark.developer


class TestDeveloperDatabaseBehavior:
    def test_developer_can_be_assigned_to_manager(self, db_session, factory):
        manager = factory.developer_manager(username="manager_alpha")
        developer = factory.developer(manager=manager, username="developer_alpha")
        factory.commit()

        saved_developer = db_session.query(Developer).filter_by(username="developer_alpha").one()
        assert saved_developer.manager_id == manager.id

    def test_developer_uploaded_firmware_tracks_owner(self, factory):
        developer = factory.developer()
        firmware = factory.firmware(uploaded_by=developer)

        assert firmware.uploaded_by == developer.id
