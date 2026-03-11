from pydantic import BaseModel
from enum import Enum
from typing import Optional, List, Any
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class RoleEnum(str, Enum):
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"
    AUDITOR = "AUDITOR"
    VIEWER = "VIEWER"


class UserInfo(BaseModel):
    id: str = ""
    username: str
    role: RoleEnum

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None   # if None → create new session


class ChatResponse(BaseModel):
    response_type: str                  # "text" | "table" | "risk" | "rag" | "blocked"
    message: Optional[str] = None
    data: Optional[Any] = None
    session_id: int                     # always return the session id


# ── Transactions ──────────────────────────────────────────────────────────────

class TransactionOut(BaseModel):
    id: str
    amount: float
    risk_level: str
    description: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    response_type: str = "table"
    transactions: List[TransactionOut]
    total: int
    session_id: Optional[int] = None


# ── Risk ──────────────────────────────────────────────────────────────────────

class RiskMetric(BaseModel):
    label: str
    value: str
    trend: str      # "up" | "down" | "stable"
    severity: str   # "critical" | "high" | "medium" | "low"


class RiskResponse(BaseModel):
    response_type: str = "risk"
    metrics: List[RiskMetric]
    summary: str
    session_id: Optional[int] = None


# ── RAG ───────────────────────────────────────────────────────────────────────

class RagResponse(BaseModel):
    response_type: str = "rag"
    answer: str
    sources: List[str] = []
    session_id: Optional[int] = None


# ── Blocked ───────────────────────────────────────────────────────────────────

class BlockedResponse(BaseModel):
    response_type: str = "blocked"
    reason: str
    rule: str
    session_id: Optional[int] = None


# ── Chat History ──────────────────────────────────────────────────────────────

class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    response_type: str
    timestamp: datetime

    class Config:
        from_attributes = True


class ChatSessionOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ChatSessionDetail(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageOut]

    class Config:
        from_attributes = True


class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Conversation"
