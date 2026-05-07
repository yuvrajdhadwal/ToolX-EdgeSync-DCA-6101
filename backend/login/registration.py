import bcrypt
from database.database_helpers import get_user_by_username
from database.database_types import UserRole, UserType
from database.models import (
    BusinessManager,
    Developer,
    DeveloperManager,
    FieldShopProfessional,
    SuperUser,
)
from fastapi import HTTPException
from login.authentication import get_authenticated_user
from sqlalchemy.orm import Session


def create_user(db: Session, user: UserType):
    hashed_password = bcrypt.hashpw(
        user.password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    if user.role == UserRole.super_user:
        existing_super_user = db.query(SuperUser).first()
        if existing_super_user:
            raise HTTPException(
                status_code=403,
                detail="Only one super user can exist",
            )

    if user.role == UserRole.developer:
        if not user.developer_manager_id:
            raise HTTPException(
                status_code=400, detail="Developer must have a developer manager ID"
            )
        developer_manager = (
            db.query(DeveloperManager)
            .filter(DeveloperManager.id == user.developer_manager_id)
            .first()
        )
        if not developer_manager:
            raise HTTPException(status_code=404, detail="Developer manager not found")
        db_user = Developer(
            username=user.username,
            hashed_password=hashed_password,
            manager_id=developer_manager.id,
        )
    elif user.role == UserRole.developer_manager:
        db_user = DeveloperManager(
            username=user.username, hashed_password=hashed_password
        )
    elif user.role == UserRole.business_manager:
        db_user = BusinessManager(
            username=user.username, hashed_password=hashed_password
        )
    elif user.role == UserRole.field_shop_professional:
        db_user = FieldShopProfessional(
            username=user.username, hashed_password=hashed_password
        )
    elif user.role == UserRole.super_user:
        db_user = SuperUser(username=user.username, hashed_password=hashed_password)
    else:
        raise HTTPException(status_code=400, detail="Invalid role type")

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return "complete"


def register_user(user: UserType, db: Session, authorization: str | None = None):
    db_user = get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Only a super user can register a user",
        )

    requesting_user = get_authenticated_user(authorization, db)
    if requesting_user.type != UserRole.super_user.value:
        raise HTTPException(
            status_code=403,
            detail="Only a super user can register a user",
        )

    if user.role == UserRole.super_user:
        raise HTTPException(
            status_code=403,
            detail="Only one super user can exist",
        )

    return create_user(db=db, user=user)

