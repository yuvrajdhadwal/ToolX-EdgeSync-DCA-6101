from typing import Optional

import bcrypt
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import (BusinessManager, Developer, DeveloperManager,
					FieldShopProfessional, User)


def get_user_by_username(db: Session, username: str):
	return db.query(User).filter(User.username == username).first()


def create_user(
	db: Session,
	role: str,
	username: str,
	password: str,
	developer_manager_id: Optional[int] = None,
):
	hashed_password = bcrypt.hashpw(
		password.encode("utf-8"), bcrypt.gensalt()
	).decode("utf-8")

	if role == "developer":
		if not developer_manager_id:
			raise HTTPException(
				status_code=400, detail="Developer must have a developer manager ID"
			)
		developer_manager = (
			db.query(DeveloperManager)
			.filter(DeveloperManager.id == developer_manager_id)
			.first()
		)
		if not developer_manager:
			raise HTTPException(status_code=404, detail="Developer manager not found")
		db_user = Developer(
			username=username,
			hashed_password=hashed_password,
			manager_id=developer_manager.id,
		)
	elif role == "developer_manager":
		db_user = DeveloperManager(username=username, hashed_password=hashed_password)
	elif role == "business_manager":
		db_user = BusinessManager(username=username, hashed_password=hashed_password)
	elif role == "field_shop_professional":
		db_user = FieldShopProfessional(username=username, hashed_password=hashed_password)
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
