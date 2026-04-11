from datetime import timedelta
from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.security import create_access_token, verify_token
from database import SessionLocal
from services.auth_service import (authenticate_user, create_user,
								 get_user_by_username)

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


@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
	db_user = get_user_by_username(db, username=user.username)
	if db_user:
		raise HTTPException(status_code=400, detail="Username already registered")
	return create_user(
		db=db,
		role=user.role.value,
		username=user.username,
		password=user.password,
		developer_manager_id=user.developer_manager_id,
	)


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
