from backend.devices import acceptance_status
from backend.database.models import Deploy


def test_rejection_comment_saved_after_rejection_marker(factory, db_session, monkeypatch):
    manager = factory.business_manager()
    firmware = factory.firmware(approved_by=factory.developer_manager())
    device = factory.device(firmware=firmware)
    deploy = factory.deploy(
        manager=manager,
        firmware=firmware,
        device=device,
        isAccepted=None,
        isActive=False,
    )

    monkeypatch.setattr(acceptance_status, "SessionLocal", lambda: db_session)
    monkeypatch.setattr(acceptance_status, "_pending_rejection_comments", set())

    acceptance_status.update_acceptance_status(
        device.serial_number, "Firmware Deployment Rejection"
    )

    db_session.expire_all()
    unchanged_deploy = db_session.query(Deploy).filter(Deploy.id == deploy.id).first()
    assert unchanged_deploy is not None
    assert unchanged_deploy.isAccepted is None
    assert unchanged_deploy.rejection_comment is None

    acceptance_status.update_acceptance_status(device.serial_number, "bad_installation")

    db_session.expire_all()
    updated_deploy = db_session.query(Deploy).filter(Deploy.id == deploy.id).first()
    assert updated_deploy is not None
    assert updated_deploy.isAccepted is False
    assert updated_deploy.rejection_comment == "bad_installation"
