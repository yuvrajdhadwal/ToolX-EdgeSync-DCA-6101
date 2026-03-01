import pytest
from datetime import datetime
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError, SAWarning

# Make sure to import your models here! 
# Ensure Developer, DeveloperManager, etc., inherit from User.
from models import (
    Base, User, Developer, DeveloperManager, BusinessManager, 
    FieldShopProfessional, FirmwareUpdate, Device, Deploy, Install, Rejection
)

# ==============================================================================
# FIXTURE: SQLITE DATABASE WITH FOREIGN KEYS ENABLED
# ==============================================================================

@pytest.fixture(scope="function")
def db_session():
    """Sets up an in-memory database and ENFORCES foreign keys for cascade testing."""
    engine = create_engine("sqlite:///:memory:")
    
    # SQLite does not enforce Foreign Keys by default. We must turn them on.
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    yield session
    
    session.close()
    Base.metadata.drop_all(engine)


# ==============================================================================
# EDGE CASE: INTEGRITY & UNIQUE CONSTRAINTS
# ==============================================================================

def test_duplicate_username_fails(db_session):
    """Edge Case: Ensure the unique=True constraint on User.username works."""
    u1 = Developer(username="unique_name", hashed_password="pwd")
    db_session.add(u1)
    db_session.commit()

    u2 = DeveloperManager(username="unique_name", hashed_password="pwd")
    db_session.add(u2)
    
    # We EXPECT this to fail and raise an IntegrityError
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback() # Always rollback after a caught error so the session isn't poisoned

def test_weak_entity_device_requires_firmware(db_session):
    """Edge Case: Device is a weak entity and MUST have a firmware_id."""
    device = Device(serial_number="SN-NO-FIRMWARE", description="Orphan Device")
    db_session.add(device)
    
    with pytest.warns(SAWarning):
        with pytest.raises(IntegrityError):
            db_session.commit()
    db_session.rollback()

# ==============================================================================
# EDGE CASE: COMPLEX TERNARY ASSOCIATIONS (Deploy/Install/Reject)
# ==============================================================================

def test_install_composite_foreign_key_mismatch(db_session):
    """Edge Case: Try to create an Install with mismatched composite keys."""
    # Setup dependencies
    pro = FieldShopProfessional(username="pro_installer", hashed_password="pwd")
    fw = FirmwareUpdate(version_number="v1.0", device_type="Router")
    db_session.add_all([pro, fw])
    db_session.commit()
    
    device = Device(serial_number="SN-111", firmware_id=fw.id)
    db_session.add(device)
    db_session.commit()

    # Create an invalid install: The device exists, but we are assigning a fake device_firmware_id
    invalid_install = Install(
        professional_id=pro.id,
        target_firmware_id=fw.id,
        device_serial="SN-111",
        device_firmware_id=9999  # This violates the ForeignKeyConstraint!
    )
    db_session.add(invalid_install)
    
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

# ==============================================================================
# EDGE CASE: CASCADES & ON DELETE BEHAVIORS
# ==============================================================================

def test_cascade_delete_user_removes_role(db_session):
    """Test 'CASCADE': Deleting a Base User should delete the Developer record."""
    dev = Developer(username="doomed_dev", hashed_password="pwd")
    db_session.add(dev)
    db_session.commit()
    dev_id = dev.id

    # Fetch the parent User record and delete it
    user_record = db_session.query(User).filter_by(id=dev_id).first()
    db_session.delete(user_record)
    db_session.commit()

    # Verify the Developer record is ALSO gone
    assert db_session.query(Developer).filter_by(id=dev_id).first() is None

def test_set_null_on_manager_delete(db_session):
    """Test 'SET NULL': Deleting a Manager shouldn't delete the Developer, just orphan them."""
    mgr = DeveloperManager(username="doomed_mgr", hashed_password="pwd")
    db_session.add(mgr)
    db_session.commit()

    dev = Developer(username="surviving_dev", hashed_password="pwd", manager_id=mgr.id)
    db_session.add(dev)
    db_session.commit()
    
    # Delete the manager
    db_session.delete(mgr)
    db_session.commit()

    # The developer should still exist, but manager_id should now be None
    survivor = db_session.query(Developer).filter_by(username="surviving_dev").first()
    assert survivor is not None
    assert survivor.manager_id is None

def test_restrict_on_firmware_delete(db_session):
    """Test 'RESTRICT': Cannot delete a firmware if a Device is currently installed on it."""
    fw = FirmwareUpdate(version_number="vCritical", device_type="Server")
    db_session.add(fw)
    db_session.commit()

    device = Device(serial_number="SN-SECURE", firmware_id=fw.id)
    db_session.add(device)
    db_session.commit()

    # Attempt to delete the firmware. The RESTRICT constraint should block this.
    db_session.delete(fw)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

# ==============================================================================
# POLYMORPHIC ROUTING & M:N RELATIONSHIPS
# ==============================================================================

def test_polymorphic_query_routing(db_session):
    """Test that querying the parent User table returns the correct Child objects."""
    db_session.add(DeveloperManager(username="mgr1", hashed_password="pwd"))
    db_session.add(BusinessManager(username="biz1", hashed_password="pwd"))
    db_session.commit()

    users = db_session.query(User).order_by(User.username).all()
    
    # The session should automatically instantiate the correct subclasses
    assert isinstance(users[0], BusinessManager)
    assert isinstance(users[1], DeveloperManager)

def test_many_to_many_removal_does_not_delete_entity(db_session):
    """Test that removing an item from a view/download list doesn't delete the firmware."""
    pro = FieldShopProfessional(username="pro_downloader", hashed_password="pwd")
    fw = FirmwareUpdate(version_number="v2.0", device_type="Sensor")
    
    pro.download_firmware.append(fw)
    db_session.add_all([pro, fw])
    db_session.commit()
    
    # Now, the Professional "un-downloads" or forgets it
    pro.download_firmware.remove(fw)
    db_session.commit()
    
    # The firmware should still exist in the database!
    remaining_fw = db_session.query(FirmwareUpdate).first()
    assert remaining_fw is not None
    assert len(pro.download_firmware) == 0
