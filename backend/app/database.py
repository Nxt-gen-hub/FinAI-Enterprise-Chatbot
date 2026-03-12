from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker, relationship
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from datetime import datetime
from app.config import settings


engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True)
    amount = Column(Float)
    risk_level = Column(String)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user = Column(String)
    action = Column(String)
    detail = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)


# ── NEW: Chat history models ──────────────────────────────────────────────────

class ChatSession(Base):
    """One conversation thread per user, with a title derived from first message."""
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user = Column(String, nullable=False, index=True)
    title = Column(String, default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="session",
                            cascade="all, delete-orphan", order_by="ChatMessage.id")


class ChatMessage(Base):
    """Individual message inside a ChatSession."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String, nullable=False)          # "user" | "assistant"
    content = Column(Text, nullable=False)
    response_type = Column(String, default="text") # "text" | "table" | "risk" | "rag" | "blocked"
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


# ── DB helpers ────────────────────────────────────────────────────────────────

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Called on app shutdown — disposes the engine connection pool."""
    await engine.dispose()
