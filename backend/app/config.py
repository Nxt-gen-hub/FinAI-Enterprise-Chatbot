# ============================================================
# CONFIG - Environment and application settings
# ============================================================

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "FinAI Enterprise Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://finai:finai_pass@localhost:5432/finai_db"
    DATABASE_POOL_SIZE: int = 10

    # JWT
    SECRET_KEY: str = "CHANGE_THIS_SECRET_KEY_IN_PRODUCTION_32CHARS_MIN"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Vector engine / RAG
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    FAISS_INDEX_PATH: str = "data/faiss_index"
    POLICY_DOCS_PATH: str = "data/policy_documents"
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    TOP_K_RESULTS: int = 5

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
