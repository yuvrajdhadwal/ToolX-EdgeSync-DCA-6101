from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from core.security import get_authenticated_user
from database import get_db
from models import DeveloperManager, User

router = APIRouter()


@router.get("/devmng")
def get_devmng(db: Session = Depends(get_db)):
	managers = db.query(DeveloperManager).all()
	return [{"id": mng.id, "username": mng.username} for mng in managers]


@router.get("/users/{user_id}/username")
def get_username_by_id(
	user_id: int,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	get_authenticated_user(authorization, db)

	user = db.query(User).filter(User.id == user_id).first()
	if not user:
		raise HTTPException(status_code=404, detail="User not found")

	return {"id": user.id, "username": user.username}
