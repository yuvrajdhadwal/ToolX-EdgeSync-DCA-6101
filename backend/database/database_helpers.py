def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_developer_manager(db):
    managers = db.query(DeveloperManager).all()
    return [{"id": mng.id, "username": mng.username} for mng in managers]

def get_username_by_id(user_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),):
    get_authenticated_user(authorization, db)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": user.id, "username": user.username}
