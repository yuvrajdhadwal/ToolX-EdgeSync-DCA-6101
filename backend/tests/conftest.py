import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from backend.database.models import Base
from tests.factories import ModelFactory


@pytest.fixture(scope="function")
def db_engine():
    """Create an isolated in-memory SQLite engine with FK enforcement."""
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Provide a fresh SQLAlchemy session for each test."""
    session = sessionmaker(bind=db_engine, autocommit=False, autoflush=False)()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def factory(db_session):
    """Provide convenience builders for common user/firmware/device graphs."""
    return ModelFactory(db_session)
