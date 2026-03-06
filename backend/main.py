from fastapi import FastAPI, Depends, HTTPException, status,Form, File, UploadFile
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import bcrypt  
from database import SessionLocal, engine, Base
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from enum import Enum
from azure.iot.hub import IoTHubRegistryManager

from models import User, Developer, DeveloperManager, BusinessManager, FieldShopProfessional, FirmwareUpdate

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from iot import deploy_helper, FirmwareOverview

app = FastAPI()
Base.metadata.create_all(bind=engine)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
load_dotenv()

origins = [ 
    os.getenv('LOCAL_ORIGIN', 'http://localhost:5173'), # Defaulted just in case env missing
]

app.add_middleware( 
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Database dependency injection function to manage the lifecycle of a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# JWT Secret and Algorithm
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')
ALGORITHM = os.getenv('ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = 30


# Define UserRole enum locally for Pydantic validation
class UserRole(str, Enum):
    developer = "developer"
    developer_manager = "developer_manager"
    business_manager = "business_manager"
    field_shop_professional = "field_shop_professional"


# Define a Pydantic Model for User Registration
class UserCreate(BaseModel):
    role: UserRole
    username: str
    password: str


class FirmwareCreate(BaseModel):
    objectBinary: str
    device_type: str
    developer: str
    version_number: str
    isEmergency: bool
    description: str


def get_user_by_username(db: Session, username: str):
    # This will search the base User table and return the correct subclass automatically
    return db.query(User).filter(User.username == username).first()


def create_user(db: Session, user: UserCreate):
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Instantiate the correct SQLAlchemy polymorphic subclass
    if user.role == UserRole.developer:
        db_user = Developer(username=user.username, hashed_password=hashed_password)
    elif user.role == UserRole.developer_manager:
        db_user = DeveloperManager(username=user.username, hashed_password=hashed_password)
    elif user.role == UserRole.business_manager:
        db_user = BusinessManager(username=user.username, hashed_password=hashed_password)
    elif user.role == UserRole.field_shop_professional:
        db_user = FieldShopProfessional(username=user.username, hashed_password=hashed_password)
    else:
        raise HTTPException(status_code=400, detail="Invalid role type")

    # SQLAlchemy handles cascading the insertion into both tables (users + subclass table)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return "complete"


#POST for firmware upload
@app.post("/upload")
async def upload_firmware(
    file: UploadFile = File(...),
    device_type: str = Form(...),
    developer: int = Form(...),
    version_number: str = Form(...),
    isEmergency: bool = Form(...),
    description: str = Form(...),
    db: Session = Depends(get_db)
):

    file_content = await file.read()
    firmware = FirmwareUpdate(
        objectBinary=file_content,
        version_number=version_number,
        device_type=device_type,
        description=description,
        uploaded_by=developer,
        isEmergency=isEmergency,
    )
    db.add(firmware)
    db.commit()
    db.refresh(firmware)
    return {'message': 'upload successful'}
  

# POST route that uses the Pydantic model to receive the request body.
@app.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user_by_username(db, username=user.username)
    if db_user: # if username is in use
        raise HTTPException(status_code=400, detail="Username already registered")
    return create_user(db=db, user=user)


# Authenticate the user
def authenticate_user(username: str, password: str, db: Session):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False
    if not bcrypt.checkpw(password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        return False
    return user

# Create access token
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encode_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encode_jwt


@app.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Store the role type in the JWT payload so the frontend knows what role the user is
    access_token = create_access_token(
        data={"sub": user.username, "role": user.type}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=403, detail="Token is invalid or expired")
        return payload
    except JWTError:
        raise HTTPException(status_code=403, detail="Token is invalid or expired")


@app.post("/deploy-to-one-device")
def cloud_to_device(device_id: str, firmware: FirmwareOverview):
    """
    @brief Sends a Deployement message to selected edge device
    """
    connection_str = os.getenv('IOT_CONNECTION')
    iot_hub = IoTHubRegistryManager.from_connection_string(connection_str)
    if not deploy_helper(device_id, iot_hub, firmware):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device not found or invalid DeviceID"
        )
    return {"status": "sent"}


@app.post("/deploy-to-many-devices")
def cloud_to_many_device(device_ids: list[str], firmware: FirmwareOverview):
    """
    @brief Sends a Deployment Message to all selected edge devices
    """
    connection_str = os.getenv('IOT_CONNECTION')
    iot_hub = IoTHubRegistryManager.from_connection_string(connection_str)

    for device_id in device_ids:
        if not deploy_helper(device_id, iot_hub, firmware):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Device not found or invalid DeviceID"
            )
    return {"status": "sent to all devices"}
   

@app.get("/verify-token/{token}")
async def verify_user_token(token: str):
    payload = verify_token(token=token)
    return {"message": "Token is valid", "user": payload.get("sub"), "role": payload.get("role")}


if os.path.exists("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")


@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return {"error": "Frontend not deployed"}
