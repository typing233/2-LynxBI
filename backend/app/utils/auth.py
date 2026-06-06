import hashlib
import hmac
import os
import json
import base64
import time
from app.config import get_settings


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return base64.b64encode(salt + key).decode()


def verify_password(password: str, stored: str) -> bool:
    decoded = base64.b64decode(stored.encode())
    salt = decoded[:16]
    stored_key = decoded[16:]
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return hmac.compare_digest(key, stored_key)


def _hmac_sign(key: bytes, msg: bytes) -> str:
    return base64.urlsafe_b64encode(
        hmac.HMAC(key, msg, hashlib.sha256).digest()
    ).decode().rstrip("=")


def create_token(user_id: int, username: str) -> str:
    settings = get_settings()
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256"}).encode()).decode().rstrip("=")
    payload_data = {
        "sub": str(user_id),
        "username": username,
        "exp": int(time.time()) + 86400 * 7,
    }
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).decode().rstrip("=")
    signing_input = f"{header}.{payload}".encode()
    sig = _hmac_sign(settings.secret_key.encode(), signing_input)
    return f"{header}.{payload}.{sig}"


def decode_token(token: str) -> dict | None:
    settings = get_settings()
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, sig = parts
        signing_input = f"{header}.{payload}".encode()
        expected_sig = _hmac_sign(settings.secret_key.encode(), signing_input)
        if not hmac.compare_digest(sig, expected_sig):
            return None
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding
        data = json.loads(base64.urlsafe_b64decode(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None
