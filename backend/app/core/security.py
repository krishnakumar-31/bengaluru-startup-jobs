import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Tuple
import bcrypt
import jwt
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.models.admin_user import AdminUser

# In-memory rate limiting store: key -> (failure_count, lockout_until_timestamp)
_FAILED_LOGIN_ATTEMPTS: Dict[str, Tuple[int, float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 300  # 5 minutes


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with cost factor 12."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def generate_csrf_token() -> str:
    """Generate a secure cryptographic CSRF token."""
    return secrets.token_urlsafe(32)


def create_access_token(
    subject: str,
    token_version: int,
    csrf_token: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT access token containing subject, token version, and CSRF claim."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ADMIN_JWT_EXPIRE_MINUTES)

    payload = {
        "sub": subject,
        "token_version": token_version,
        "csrf": csrf_token or generate_csrf_token(),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.ADMIN_JWT_SECRET, algorithm=settings.ADMIN_JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        return jwt.decode(
            token,
            settings.ADMIN_JWT_SECRET,
            algorithms=[settings.ADMIN_JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )


def check_login_rate_limit(key: str) -> None:
    """Check if an IP or username has exceeded maximum failed login attempts."""
    now = time.time()
    if key in _FAILED_LOGIN_ATTEMPTS:
        failures, lockout_until = _FAILED_LOGIN_ATTEMPTS[key]
        if now < lockout_until:
            remaining = int(lockout_until - now)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Please try again in {remaining} seconds.",
            )
        elif now >= lockout_until and failures >= MAX_FAILED_ATTEMPTS:
            # Lockout expired, reset counter
            del _FAILED_LOGIN_ATTEMPTS[key]


def record_login_failure(key: str) -> None:
    """Increment failed login attempts and apply lockout if threshold reached."""
    now = time.time()
    failures, _ = _FAILED_LOGIN_ATTEMPTS.get(key, (0, 0.0))
    failures += 1
    lockout_until = 0.0
    if failures >= MAX_FAILED_ATTEMPTS:
        lockout_until = now + LOCKOUT_DURATION_SECONDS
    _FAILED_LOGIN_ATTEMPTS[key] = (failures, lockout_until)


def clear_login_failures(key: str) -> None:
    """Clear recorded failed login attempts upon successful authentication."""
    if key in _FAILED_LOGIN_ATTEMPTS:
        del _FAILED_LOGIN_ATTEMPTS[key]


def get_current_admin(
    request: Request,
    db: Session = Depends(get_db),
) -> AdminUser:
    """
    FastAPI dependency that enforces authentication on admin endpoints.
    Reads token from HttpOnly cookie (primary) or Authorization Bearer header (testing).
    Enforces token_version check to invalidate sessions after password changes.
    Enforces CSRF validation for state-changing requests when authenticating via cookie.
    """
    token: Optional[str] = None
    using_cookie = False

    # Check HttpOnly cookie first
    cookie_token = request.cookies.get(settings.ADMIN_COOKIE_NAME)
    if cookie_token:
        token = cookie_token
        using_cookie = True
    else:
        # Fallback to Authorization: Bearer <token>
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in as administrator.",
        )

    payload = decode_access_token(token)
    username = payload.get("sub")
    token_version = payload.get("token_version")

    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token.",
        )

    # CSRF Check: For state-changing operations (POST, PUT, PATCH, DELETE) when using cookies
    if using_cookie and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        header_csrf = request.headers.get("X-CSRF-Token")
        cookie_csrf = request.cookies.get(settings.ADMIN_CSRF_COOKIE_NAME)
        expected_csrf = payload.get("csrf")

        # Either header matches payload claim or header matches CSRF cookie
        if not header_csrf or (header_csrf != expected_csrf and header_csrf != cookie_csrf):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF validation failed. Missing or invalid X-CSRF-Token header.",
            )

    admin_user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if not admin_user or not admin_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Administrator account not found or disabled.",
        )

    # Invalidate session if password was changed (token_version mismatch)
    if admin_user.token_version != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked due to a password change. Please log in again.",
        )

    return admin_user
