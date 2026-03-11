# ============================================================
# AUTH - JWT creation, verification, and RBAC dependencies
# ============================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import logging
from .config import settings
from .schemas import TokenResponse, UserInfo, RoleEnum

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ── Demo users (replace with DB lookup in production) ────────

DEMO_USERS = {
    "admin":   {"id": "u001", "password": "password", "role": RoleEnum.ADMIN},
    "analyst": {"id": "u002", "password": "password", "role": RoleEnum.ANALYST},
    "auditor": {"id": "u003", "password": "password", "role": RoleEnum.AUDITOR},
    "viewer":  {"id": "u004", "password": "password", "role": RoleEnum.VIEWER},
}

# ── RBAC Permissions ──────────────────────────────────────────

PERMISSIONS: dict[RoleEnum, list[str]] = {
    RoleEnum.ADMIN:   ["view", "chat", "export", "manage_users", "view_risk", "view_transactions"],
    RoleEnum.ANALYST: ["view", "chat", "export", "view_risk", "view_transactions"],
    RoleEnum.AUDITOR: ["view", "view_risk", "view_transactions"],
    RoleEnum.VIEWER:  ["view"],
}


def can(role: RoleEnum, action: str) -> bool:
    return action in PERMISSIONS.get(role, [])


# ── JWT helpers ───────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── FastAPI dependencies ──────────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInfo:
    payload = verify_token(token)
    username: str = payload.get("sub")
    role: str = payload.get("role")
    user_id: str = payload.get("id", username)

    if not username or not role:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return UserInfo(id=user_id, username=username, role=RoleEnum(role))


def require_action(action: str):
    """Dependency factory — raises 403 if user's role cannot perform action."""
    async def dependency(current_user: UserInfo = Depends(get_current_user)) -> UserInfo:
        if not can(current_user.role, action):
            logger.warning(f"RBAC denied: user={current_user.username} role={current_user.role} action={action}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not permitted to perform '{action}'",
            )
        return current_user
    return dependency


# ── Login handler ─────────────────────────────────────────────

async def authenticate_user(form: OAuth2PasswordRequestForm) -> TokenResponse:
    user = DEMO_USERS.get(form.username.lower())
    if not user or user["password"] != form.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        data={"sub": form.username, "role": user["role"].value, "id": user["id"]}
    )
    logger.info(f"Login success: user={form.username} role={user['role'].value}")

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user["role"].value,
        username=form.username,
    )
