import os

from dotenv import load_dotenv
from fastapi.security import OAuth2PasswordBearer

load_dotenv()

OAUTH2_SCHEME = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30
IOTHUB_CONNECTION_STRING = os.getenv("IOT_CONNECTION", "NO_IOT_CONNECTION_STRING_SET")
EVENTHUB_CONNECTION_STRING = os.getenv(
    "EVENTHUB_CONNECTION", "NO_EVENT_HUB_CONNECTION_STRING_SET"
)
ACTIVE_DEVICE_ONLINE_MESSAGE = os.getenv(
    "ACTIVE_DEVICE_ONLINE_MESSAGE", "Device is Online"
)
ONLINE_DEVICE_TTL_SECONDS = int(os.getenv("ONLINE_DEVICE_TTL_SECONDS", "60"))
ACTIVE_DEVICE_RETRY_SECONDS = int(os.getenv("ACTIVE_DEVICE_RETRY_SECONDS", "5"))

