from database import SessionLocal
from sqlalchemy.orm import Session
from models import FieldShopProfessional
from fastapi import Depends, APIRouter

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/get_field_shop_professional")
def get_devmng(db: Session = Depends(get_db)):
    professionals = db.query(FieldShopProfessional).all()
    return [{"id": pro.id, "username": pro.username} for pro in professionals]