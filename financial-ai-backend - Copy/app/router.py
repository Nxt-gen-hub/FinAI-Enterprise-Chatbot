import re
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db, Transaction, AuditLog, ChatSession, ChatMessage
from app.auth import require_action, get_current_user, create_access_token
from app.schemas import (
    ChatRequest, ChatResponse,
    TransactionResponse, TransactionOut,
    RiskResponse, RiskMetric,
    RagResponse, BlockedResponse,
    ChatSessionOut, ChatSessionDetail, ChatMessageOut,
    CreateSessionRequest, UserInfo,
)
from app.vector_engine import VectorEngine as _VectorEngine
_vector_engine_instance = _VectorEngine()

logger = logging.getLogger(__name__)
router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
#  AUTH ENDPOINT — OAuth2PasswordRequestForm (form-data) matches auth.py
# ══════════════════════════════════════════════════════════════════════════════

DEMO_USERS = {
    "admin":   {"id": "u001", "password": "password", "role": "ADMIN"},
    "analyst": {"id": "u002", "password": "password", "role": "ANALYST"},
    "auditor": {"id": "u003", "password": "password", "role": "AUDITOR"},
    "viewer":  {"id": "u004", "password": "password", "role": "VIEWER"},
}


@router.post("/auth/login")
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Login — accepts application/x-www-form-urlencoded (username + password)."""
    user = DEMO_USERS.get(form.username.lower())
    if not user or user["password"] != form.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": form.username,
        "role": user["role"],
        "id": user["id"],
    })

    audit = AuditLog(
        user=form.username,
        action="login",
        detail=f"Login successful [{user['role']}]",
    )
    db.add(audit)
    await db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "username": form.username,
    }


@router.get("/health")
async def health():
    return {"status": "ok", "service": "FinAI Enterprise Backend"}


# ══════════════════════════════════════════════════════════════════════════════
#  QUERY CLASSIFIER
# ══════════════════════════════════════════════════════════════════════════════

CASUAL_PATTERNS = [
    r"^\s*(hi|hello|hey|howdy|hiya|sup|yo)\b",
    r"^\s*how are (you|u)\b",
    r"^\s*good (morning|afternoon|evening|day)\b",
    r"^\s*what('s| is) up\b",
    r"^\s*thanks?\b",
    r"^\s*thank you\b",
    r"^\s*(bye|goodbye|see you|cya)\b",
    r"^\s*help\s*$",
    r"^\s*what can you do\b",
    r"^\s*who are you\b",
]

GUARDRAIL_PATTERNS = {
    "GR-001": r"\b(delete|drop|truncate|update|insert|alter)\b",
    "GR-002": r"\b(ssn|social security|passport|dob|date of birth)\b",
    "GR-003": r"\b(execute|initiate|send|wire|transfer now)\b",
    "GR-005": r"(ignore (previous|prior|all) instructions|you are now|pretend you|jailbreak|act as)",
}

RISK_PATTERNS = r"\b(risk|flagged|exposure|suspicious|alert|compliance|aml score)\b"
RAG_PATTERNS  = r"\b(policy|aml|kyc|regulation|rule|guideline|compliance policy|law|directive)\b"
SQL_PATTERNS  = r"\b(show|list|find|get|fetch|display|transactions?|above|below|critical|high|medium|low|amount)\b"


def classify_query(text: str) -> str:
    t = text.lower().strip()
    for pattern in CASUAL_PATTERNS:
        if re.search(pattern, t):
            return "casual"
    for rule, pattern in GUARDRAIL_PATTERNS.items():
        if re.search(pattern, t, re.IGNORECASE):
            return f"blocked:{rule}"
    if re.search(RAG_PATTERNS, t):
        return "rag"
    if re.search(RISK_PATTERNS, t):
        return "risk"
    if re.search(SQL_PATTERNS, t):
        return "sql"
    return "unknown"


# ══════════════════════════════════════════════════════════════════════════════
#  CASUAL RESPONSES
# ══════════════════════════════════════════════════════════════════════════════

CASUAL_REPLIES = {
    "greeting": (
        "Hello! 👋 I'm FinAI, your enterprise financial intelligence assistant. "
        "I can help you with:\n\n"
        "• 📊 **Transaction queries** — e.g. *\"Show transactions above $50,000\"*\n"
        "• ⚠️ **Risk analysis** — e.g. *\"Summarize risk exposure this quarter\"*\n"
        "• 📋 **Policy & compliance** — e.g. *\"What does our AML policy say?\"*\n\n"
        "What would you like to explore?"
    ),
    "thanks":   "You're welcome! Let me know if you need anything else. 😊",
    "bye":      "Goodbye! Have a great day. 👋",
    "help": (
        "Here's what I can do for you:\n\n"
        "• 📊 **Transactions** — query, filter, and list financial transactions\n"
        "• ⚠️ **Risk** — view risk scores, flagged items, and exposure metrics\n"
        "• 📋 **Compliance** — ask about AML, KYC, and internal policies\n\n"
        "Try: *\"List all critical transactions\"* or *\"What is our KYC policy?\"*"
    ),
    "identity": (
        "I'm **FinAI** — an enterprise financial intelligence assistant. "
        "I help analysts, auditors, and financial teams query transactions, "
        "assess risk, and navigate compliance policies."
    ),
    "default": (
        "Hi there! 👋 I'm FinAI, your financial assistant. "
        "Ask me about transactions, risk exposure, or compliance policies!"
    ),
}


def get_casual_reply(text: str) -> str:
    t = text.lower()
    if re.search(r"\b(hi|hello|hey|howdy|hiya|good (morning|afternoon|evening))\b", t):
        return CASUAL_REPLIES["greeting"]
    if re.search(r"\b(thanks?|thank you)\b", t):
        return CASUAL_REPLIES["thanks"]
    if re.search(r"\b(bye|goodbye|see you)\b", t):
        return CASUAL_REPLIES["bye"]
    if re.search(r"\b(who are you|what are you)\b", t):
        return CASUAL_REPLIES["identity"]
    if re.search(r"\b(help|what can you do)\b", t):
        return CASUAL_REPLIES["help"]
    return CASUAL_REPLIES["default"]


# ══════════════════════════════════════════════════════════════════════════════
#  SESSION HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def make_title(text: str) -> str:
    cleaned = text.strip()
    return cleaned[:60] + ("…" if len(cleaned) > 60 else "")


async def get_or_create_session(
    db: AsyncSession, user: str, session_id: Optional[int], first_message: str
) -> ChatSession:
    if session_id:
        result = await db.execute(
            select(ChatSession).where(ChatSession.id == session_id, ChatSession.user == user)
        )
        session = result.scalar_one_or_none()
        if session:
            session.updated_at = datetime.utcnow()
            return session
    session = ChatSession(user=user, title=make_title(first_message))
    db.add(session)
    await db.flush()
    return session


async def save_message(
    db: AsyncSession,
    session_id: int,
    role: str,
    content: str,
    response_type: str = "text",
):
    db.add(ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        response_type=response_type,
    ))


# ══════════════════════════════════════════════════════════════════════════════
#  RBAC
# ══════════════════════════════════════════════════════════════════════════════

BLOCKED_ROLES = {
    "GR-001": ["VIEWER", "AUDITOR", "ANALYST"],
    "GR-002": ["VIEWER"],
    "GR-003": ["VIEWER", "AUDITOR"],
    "GR-005": ["ADMIN", "ANALYST", "AUDITOR", "VIEWER"],
}

BLOCK_MESSAGES = {
    "GR-001": "Destructive SQL commands are not permitted for your role.",
    "GR-002": "Queries for PII data are restricted for VIEWER role.",
    "GR-003": "Wire transfer execution is not permitted for your role.",
    "GR-005": "Prompt injection detected. This attempt has been logged.",
}


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN CHAT ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    current_user: UserInfo = Depends(require_action("chat")),
    db: AsyncSession = Depends(get_db),
):
    # ✅ KEY FIX: UserInfo is a Pydantic model, use .username / .role NOT ["username"]
    user = current_user.username
    role = current_user.role.value

    query_type = classify_query(req.message)
    session = await get_or_create_session(db, user, req.session_id, req.message)
    session_id = session.id

    await save_message(db, session_id, "user", req.message, "text")
    db.add(AuditLog(user=user, action="chat", detail=f"[{role}] {req.message[:200]}"))

    if query_type == "casual":
        reply = get_casual_reply(req.message)
        await save_message(db, session_id, "assistant", reply, "text")
        await db.commit()
        return ChatResponse(response_type="text", message=reply, session_id=session_id)

    if query_type.startswith("blocked:"):
        rule = query_type.split(":")[1]
        if role in BLOCKED_ROLES.get(rule, []):
            reason = BLOCK_MESSAGES.get(rule, "This action is not permitted.")
            blocked_msg = f"🚫 **Blocked [{rule}]**: {reason}"
            await save_message(db, session_id, "assistant", blocked_msg, "blocked")
            await db.commit()
            return ChatResponse(
                response_type="blocked",
                message=blocked_msg,
                data={"rule": rule, "reason": reason},
                session_id=session_id,
            )

    if query_type == "rag":
        answer = await handle_rag(req.message)
        await save_message(db, session_id, "assistant", answer.answer, "rag")
        await db.commit()
        return ChatResponse(
            response_type="rag",
            message=answer.answer,
            data={"sources": answer.sources},
            session_id=session_id,
        )

    if query_type == "risk":
        risk = await handle_risk()
        await save_message(db, session_id, "assistant", f"[Risk Summary] {risk.summary}", "risk")
        await db.commit()
        return ChatResponse(
            response_type="risk",
            message=risk.summary,
            data={"metrics": [m.dict() for m in risk.metrics]},
            session_id=session_id,
        )

    if query_type == "sql":
        result = await handle_sql(req.message, db)
        await save_message(db, session_id, "assistant", f"[Table] Found {result.total} transaction(s)", "table")
        await db.commit()
        return ChatResponse(
            response_type="table",
            message=f"Found {result.total} transaction(s) matching your query.",
            data={"transactions": [t.dict() for t in result.transactions], "total": result.total},
            session_id=session_id,
        )

    fallback = (
        "I'm not sure how to answer that. Try asking about:\n"
        "• Transactions (e.g. *\"Show transactions above $50,000\"*)\n"
        "• Risk (e.g. *\"Summarize risk exposure\"*)\n"
        "• Policy (e.g. *\"What does our AML policy say?\"*)"
    )
    await save_message(db, session_id, "assistant", fallback, "text")
    await db.commit()
    return ChatResponse(response_type="text", message=fallback, session_id=session_id)


# ══════════════════════════════════════════════════════════════════════════════
#  HANDLER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

async def handle_sql(message: str, db: AsyncSession) -> TransactionResponse:
    stmt = select(Transaction)
    msg = message.lower()
    amount_match = re.search(r"\$?([\d,]+)", message)
    threshold = float(amount_match.group(1).replace(",", "")) if amount_match else None

    if "above" in msg and threshold:
        stmt = stmt.where(Transaction.amount > threshold)
    elif "below" in msg and threshold:
        stmt = stmt.where(Transaction.amount < threshold)

    for level in ["critical", "high", "medium", "low"]:
        if level in msg:
            stmt = stmt.where(Transaction.risk_level == level.upper())
            break

    result = await db.execute(stmt)
    txns = result.scalars().all()
    return TransactionResponse(
        response_type="table",
        transactions=[TransactionOut.from_orm(t) for t in txns],
        total=len(txns),
    )


async def handle_risk() -> RiskResponse:
    return RiskResponse(
        response_type="risk",
        summary="47 transactions flagged this quarter — $2.4M total exposure. Compliance score: 73%.",
        metrics=[
            RiskMetric(label="Flagged Transactions", value="47",      trend="up",     severity="critical"),
            RiskMetric(label="Total Exposure",        value="$2.4M",  trend="up",     severity="high"),
            RiskMetric(label="Compliance Score",      value="73%",    trend="down",   severity="medium"),
            RiskMetric(label="Avg Risk Score",        value="6.8/10", trend="stable", severity="high"),
        ],
    )


async def handle_rag(message: str) -> RagResponse:
    try:
        answer, sources, _ = await _vector_engine_instance.search(message)
        return RagResponse(response_type="rag", answer=answer, sources=sources)
    except Exception:
        return RagResponse(
            response_type="rag",
            answer=(
                "Based on our AML policy framework: All transactions above $10,000 must be "
                "reported to the compliance team within 24 hours. Structured deposits and "
                "offshore wire transfers require enhanced due diligence (EDD) under KYC guidelines."
            ),
            sources=["AML Policy v2.3", "KYC Framework 2024"],
        )


# ══════════════════════════════════════════════════════════════════════════════
#  TRANSACTIONS & RISK ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/transactions", response_model=TransactionResponse)
async def get_transactions(
    current_user: UserInfo = Depends(require_action("view_transactions")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Transaction))
    txns = result.scalars().all()
    return TransactionResponse(
        transactions=[TransactionOut.from_orm(t) for t in txns],
        total=len(txns),
    )


@router.get("/risk/summary", response_model=RiskResponse)
async def get_risk_summary(
    current_user: UserInfo = Depends(require_action("view_risk")),
):
    return await handle_risk()


# ══════════════════════════════════════════════════════════════════════════════
#  CHAT HISTORY ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/chat/sessions", response_model=list[ChatSessionOut])
async def list_sessions(
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = current_user.username  # ✅ FIX

    msg_count = (
        select(ChatMessage.session_id, func.count(ChatMessage.id).label("cnt"))
        .group_by(ChatMessage.session_id)
        .subquery()
    )
    stmt = (
        select(ChatSession, msg_count.c.cnt)
        .outerjoin(msg_count, ChatSession.id == msg_count.c.session_id)
        .where(ChatSession.user == user)
        .order_by(desc(ChatSession.updated_at))
    )
    rows = (await db.execute(stmt)).all()

    return [
        ChatSessionOut(
            id=s.id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=cnt or 0,
        )
        for s, cnt in rows
    ]


@router.get("/chat/sessions/{session_id}", response_model=ChatSessionDetail)
async def get_session(
    session_id: int,
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = current_user.username  # ✅ FIX
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user == user)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    msgs_result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.id)
    )
    messages = msgs_result.scalars().all()

    return ChatSessionDetail(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=[ChatMessageOut.from_orm(m) for m in messages],
    )


@router.delete("/chat/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = current_user.username  # ✅ FIX
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user == user)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
