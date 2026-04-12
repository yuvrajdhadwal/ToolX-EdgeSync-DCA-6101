"""JWT and authorization helpers for the backend."""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from models import User

load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")


def get_token_payload_from_header(authorization: Optional[str]) -> dict:
	if not authorization or not authorization.startswith("Bearer "):
		raise HTTPException(
			status_code=401, detail="Missing or invalid authorization header"
		)
	token = authorization.split(" ", 1)[1]
	return verify_token(token=token)


def verify_token(token: str = Depends(oauth2_scheme)):
	try:
		payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
		username: str = payload.get("sub")
		if username is None:
			raise HTTPException(status_code=403, detail="Token is invalid or expired")
		return payload
	except JWTError:
		raise HTTPException(status_code=403, detail="Token is invalid or expired")


def get_authenticated_user(authorization: Optional[str], db: Session) -> User:
	token = authorization.split(" ", 1)[1]
	payload = verify_token(token=token)
	username = payload.get("sub")

	if not username:
		raise HTTPException(status_code=403, detail="Token is invalid or expired")

	user = db.query(User).filter(User.username == username).first()
	if not user:
		raise HTTPException(status_code=404, detail="User not found")

	return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
	to_encode = data.copy()
	if expires_delta:
		expire = datetime.now(timezone.utc) + expires_delta
	else:
		expire = datetime.now(timezone.utc) + timedelta(minutes=15)
	to_encode.update({"exp": expire})
	encode_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
	return encode_jwt


def require_developer_manager(authorization: Optional[str]) -> str:
	payload = get_token_payload_from_header(authorization)
	role = payload.get("role")
	username = payload.get("sub")

	if role != "developer_manager":
		raise HTTPException(
			status_code=403, detail="Only developer managers can perform this action"
		)

	if not username:
		raise HTTPException(status_code=403, detail="Token is invalid or expired")

	return username
