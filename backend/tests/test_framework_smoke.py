import pytest


@pytest.mark.integrity
def test_factory_can_build_basic_database_graph(db_session, factory):
    developer = factory.developer()
    firmware = factory.firmware(uploaded_by=developer)
    device = factory.device(firmware=firmware)
    factory.commit()

    assert developer.id is not None
    assert firmware.uploaded_by == developer.id
    assert device.firmware_id == firmware.id
    assert db_session.get(type(firmware), firmware.id) is not None
