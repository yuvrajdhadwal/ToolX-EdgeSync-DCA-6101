from datetime import timedelta
from enum import Enum
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.security import create_access_token, verify_token
from database import SessionLocal
from models import (BusinessManager, Developer, DeveloperManager,
					FieldShopProfessional, User)

router = APIRouter()
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


class UserRole(str, Enum):
	developer = "developer"
	developer_manager = "developer_manager"
	business_manager = "business_manager"
	field_shop_professional = "field_shop_professional"


class UserCreate(BaseModel):
	role: UserRole
	username: str
	password: str
	developer_manager_id: Optional[int] = None


def get_user_by_username(db: Session, username: str):
	return db.query(User).filter(User.username == username).first()


def create_user(db: Session, user: UserCreate):
	hashed_password = bcrypt.hashpw(
		user.password.encode("utf-8"), bcrypt.gensalt()
	).decode("utf-8")

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
	else:
		raise HTTPException(status_code=400, detail="Invalid role type")

	db.add(db_user)
	db.commit()
	db.refresh(db_user)

	return "complete"


def authenticate_user(username: str, password: str, db: Session):
	user = db.query(User).filter(User.username == username).first()
	if not user:
		return False
	if not bcrypt.checkpw(
		password.encode("utf-8"), user.hashed_password.encode("utf-8")
	):
		return False
	return user


@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
	db_user = get_user_by_username(db, username=user.username)
	if db_user:
		raise HTTPException(status_code=400, detail="Username already registered")
	return create_user(db=db, user=user)


@router.post("/token")
def login_for_access_token(
	form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
	user = authenticate_user(form_data.username, form_data.password, db)
	if not user:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Incorrect username or password",
			headers={"WWW-Authenticate": "Bearer"},
		)
	access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
	access_token = create_access_token(
		data={"sub": user.username, "role": user.type},
		expires_delta=access_token_expires,
	)
	return {"access_token": access_token, "token_type": "bearer"}


@router.get("/verify-token/{token}")
async def verify_user_token(token: str):
	payload = verify_token(token=token)
	return {
		"message": "Token is valid",
		"user": payload.get("sub"),
		"role": payload.get("role"),
	}
