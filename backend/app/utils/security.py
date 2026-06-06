from cryptography.fernet import Fernet
from app.config import get_settings
import base64
import hashlib

_fernet = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = get_settings().secret_key.encode()
        derived = hashlib.sha256(key).digest()
        _fernet = Fernet(base64.urlsafe_b64encode(derived))
    return _fernet


def encrypt_password(password: str) -> str:
    return _get_fernet().encrypt(password.encode()).decode()


def decrypt_password(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()
