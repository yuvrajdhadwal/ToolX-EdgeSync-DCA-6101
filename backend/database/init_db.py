from sqlalchemy import inspect, text

from database.database import engine, Base


def _ensure_deploy_rejection_comment_column() -> None:
    inspector = inspect(engine)
    if "deploys" not in inspector.get_table_names():
        return

    deploy_columns = {column["name"] for column in inspector.get_columns("deploys")}
    if "rejection_comment" in deploy_columns:
        return

    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE deploys ADD COLUMN rejection_comment VARCHAR(255)")
        )

def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_deploy_rejection_comment_column()
    print("DB initialized")
