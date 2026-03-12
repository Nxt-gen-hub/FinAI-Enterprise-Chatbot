# 🤖 Financial GenAI Chatbot - Enterprise Edition

A scalable, enterprise-grade intelligent chatbot for financial analysis with LLM-powered query classification, role-based access control (RBAC), and comprehensive audit logging.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
  - [Local Development](#local-development)
  - [Docker Deployment](#docker-deployment)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Default Credentials](#-default-credentials)
- [Project Structure](#-project-structure)
- [Development Guide](#-development-guide)
- [Production Deployment](#-production-deployment)

---

## ✨ Features

### 🔐 Security & Authentication
- **JWT-based Authentication**: Secure token-based authentication
- **Role-Based Access Control (RBAC)**: Three roles with granular permissions
  - Risk Analyst
  - Compliance Officer
  - Admin
- **Audit Logging**: Complete tracking of all user interactions

### 🧠 Intelligent Query Classification
- **LLM-powered Router**: Uses OpenAI GPT to classify queries
- **Dual Data Source**: Automatic routing to SQL or RAG
- **Fallback Classifier**: Works without LLM using rule-based logic

### 📊 Data Processing
- **SQL Database**: PostgreSQL for transactional financial data
- **RAG Pipeline**: FAISS-based semantic search for policy documents
- **Risk Analysis**: Automatic calculation of risk scores and summaries

### 📝 Enterprise Features
- **Asynchronous Processing**: Full async/await support
- **Structured Logging**: Enterprise-grade logging with trace IDs
- **Error Handling**: Comprehensive error handling and reporting
- **Health Checks**: Built-in health check endpoints
- **Docker Support**: Complete containerization with docker-compose

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Application                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Authentication & Authorization (auth.py)     │  │
│  │  - JWT Token Generation & Validation                │  │
│  │  - Role-Based Access Control (RBAC)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▲                                  │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Chat Endpoint (main.py)                    │  │
│  │  - Validates JWT & Role                             │  │
│  │  - Routes to Classifier                             │  │
│  │  - Logs Interactions                                │  │
│  └──────────────────────────────────────────────────────┘  │
│           ▲                             ▲                   │
│           │                             │                   │
│  ┌────────────────────┐      ┌─────────────────────┐       │
│  │ Router (router.py) │      │ Vector Engine       │       │
│  │ Query Classifier   │      │ (vector_engine.py)  │       │
│  │ - LLM-based        │      │ - FAISS Indexing    │       │
│  │ - Rule-based       │      │ - Semantic Search   │       │
│  └────────────────────┘      │ - PDF Loading       │       │
│           │                  │ - RAG Pipeline      │       │
│           │                  └─────────────────────┘       │
│           ▼                             ▼                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     Database Layer (database.py)                    │  │
│  │  - Transaction Model                               │  │
│  │  - Audit Log Model                                 │  │
│  │  - Risk Calculations                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          PostgreSQL Container                        │  │
│  │  - Transaction Data                                 │  │
│  │  - Audit Logs                                       │  │
│  │  - User Metadata                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          /data Folder                               │  │
│  │  - PDF Policy Documents                             │  │
│  │  - FAISS Index Files                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Prerequisites

### Required
- **Python 3.11+** (or Docker)
- **PostgreSQL 13+**
- **OpenAI API Key** (for LLM features - optional)
- **pip or Poetry** (for dependency management)

### Optional
- **Docker & Docker Compose**
- **Git**
- **curl or Postman** (for API testing)

---

## 🚀 Quick Start

### Local Development

#### 1. Clone and Setup
```bash
# Create project directory
mkdir financial-genai-bot
cd financial-genai-bot

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 2. Configure Environment
```bash
# Copy example configuration
cp .env.example .env

# Edit .env with your values
# Minimum required:
# - DATABASE_URL
# - OPENAI_API_KEY (optional, uses fallback classifier if not set)
# - SECRET_KEY
```

#### 3. Setup PostgreSQL Database
```bash
# Create database (using psql or your PostgreSQL client)
psql -U postgres -c "CREATE DATABASE financial_db;"
psql -U financial_db < init.sql

# Or use docker for PostgreSQL only
docker run --name postgres_financial \
  -e POSTGRES_USER=financial_user \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=financial_db \
  -p 5432:5432 \
  -d postgres:16-alpine
```

#### 4. Run Application
```bash
# Start the application
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Application will be available at http://localhost:8000
```

#### 5. Test the Application
```bash
# Health check
curl http://localhost:8000/health

# Get API info
curl http://localhost:8000/

# Interactive API docs
# Open browser: http://localhost:8000/docs
```

---

### Docker Deployment

#### 1. Prerequisites
- Docker and Docker Compose installed
- `.env` file created with required values

#### 2. Build and Run
```bash
# Build images and start services
docker-compose up --build

# Services will start:
# - FastAPI app: http://localhost:8000
# - PostgreSQL: localhost:5432
# - pgAdmin: http://localhost:5050
```

#### 3. Verify Services
```bash
# Check services status
docker-compose ps

# View logs
docker-compose logs -f app

# Health check
curl http://localhost:8000/health
```

#### 4. Cleanup
```bash
# Stop services
docker-compose down

# Remove volumes (careful - deletes data!)
docker-compose down -v
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://...` | ✅ Yes |
| `OPENAI_API_KEY` | OpenAI API key for LLM | - | ❌ No* |
| `SECRET_KEY` | JWT signing key | - | ✅ Yes |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiration time | `60` | ❌ No |
| `LLM_MODEL` | LLM model to use | `gpt-3.5-turbo` | ❌ No |
| `DATA_FOLDER` | Policy documents folder | `data` | ❌ No |
| `CHUNK_SIZE` | PDF chunk size | `1000` | ❌ No |
| `TOP_K_RESULTS` | RAG search results | `5` | ❌ No |

*If `OPENAI_API_KEY` is not set, the app uses rule-based query classification.

---

## 📚 API Documentation

### Authentication

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "username": "analyst_john",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user_id": "user_001",
  "role": "Risk Analyst"
}
```

### Chat Endpoint

#### Query
```bash
POST /chat
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "query": "Show me high-risk transactions from the last 30 days",
  "context": {}
}
```

**Response:**
```json
{
  "query": "Show me high-risk transactions from the last 30 days",
  "response": "Found 8 transactions matching your criteria.",
  "query_type": "TRANSACTIONAL",
  "data": [
    {
      "transaction_id": "uuid...",
      "amount": 5000.0,
      "merchant": "OFFSHORE_ACCOUNT_E",
      "category": "Finance",
      "risk_score": 88.7,
      "timestamp": "2026-03-04T10:30:00"
    }
  ],
  "risk_summary": {
    "average_risk_score": 72.5,
    "total_transactions": 8,
    "high_risk_flags": 4,
    "risk_percentage": 50.0,
    "period": "last_30_days",
    "last_updated": "2026-03-05T10:30:00"
  },
  "trace_id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2026-03-05T10:30:00"
}
```

#### Health Check
```bash
GET /health
```

---

## 👥 Default Credentials

The system comes with three pre-configured users (for demo/testing):

| Username | Password | Role |
|----------|----------|------|
| `analyst_john` | `SecurePass123!` | Risk Analyst |
| `officer_sarah` | `CompliancePass123!` | Compliance Officer |
| `admin_root` | `AdminPass123!` | Admin |

**⚠️ IMPORTANT**: Replace these credentials in `app/auth.py` with a real user database in production!

---

## 📂 Project Structure

```
financial-genai-bot/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entry point & endpoints
│   ├── schemas.py           # Pydantic models
│   ├── auth.py              # JWT & RBAC logic
│   ├── router.py            # Query classifier (LLM/rule-based)
│   ├── database.py          # SQLAlchemy & ORM models
│   └── vector_engine.py     # RAG pipeline with FAISS
├── data/                    # Policy documents & FAISS index
│   └── faiss_index/         # FAISS vector store
├── logs/                    # Application logs
├── requirements.txt         # Python dependencies
├── docker-compose.yml       # Docker orchestration
├── Dockerfile              # Container image
├── init.sql                # Database initialization
├── .env.example            # Environment configuration template
└── README.md               # This file
```

---

## 🔧 Development Guide

### Adding a New Endpoint

1. **Define Schema** in `app/schemas.py`:
```python
class MyRequest(BaseModel):
    field: str
```

2. **Create Handler** in `app/main.py`:
```python
@app.post("/my-endpoint", response_model=MyResponse)
async def my_endpoint(
    request: MyRequest,
    current_user: dict = Depends(get_current_user)
):
    # Implementation
    pass
```

3. **Add RBAC** (optional):
```python
async def my_endpoint(
    request: MyRequest,
    current_user: dict = Depends(check_role([UserRole.RISK_ANALYST]))
):
    # Only Risk Analysts can access
    pass
```

### Adding a Database Model

1. **Define in `database.py`**:
```python
class MyModel(Base):
    __tablename__ = "my_table"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # ... columns
```

2. **Initialize** when app starts (handled automatically by `init_db()`)

### Custom Query Classification

Extend `app/router.py`:
```python
async def classify(self, query: str) -> QueryClassification:
    # Add custom logic
    pass
```

---

## 🚀 Production Deployment

### Security Checklist

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Replace mock users in `app/auth.py` with real database
- [ ] Set `ENVIRONMENT=production` in `.env`
- [ ] Set `DEBUG=False` in `.env`
- [ ] Configure HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure monitoring and alerting
- [ ] Review and adjust CORS settings
- [ ] Set strong PostgreSQL password
- [ ] Configure log rotation
- [ ] Enable request rate limiting
- [ ] Set up API key rotation policy

### Scaling Considerations

- **Horizontal Scaling**: Use load balancer (nginx/HAProxy) with multiple app instances
- **Database**: Consider connection pooling with PgBouncer
- **Caching**: Add Redis for session/response caching
- **Search**: Use managed Elasticsearch for large-scale audit log queries
- **Vector Store**: Move FAISS to managed cloud service (e.g., Pinecone, Weaviate)
- **LLM Calls**: Implement request queuing and rate limiting

### Monitoring

- **Application**: Use Prometheus + Grafana
- **Database**: PostgreSQL monitoring tools
- **Logs**: ELK Stack or Cloud-native logging
- **APM**: New Relic, DataDog, or Jaeger for distributed tracing

---

## 📖 API Examples

### Example 1: Query Transaction Data
```bash
# 1. Login
export TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"analyst_john","password":"SecurePass123!"}' \
  | jq -r '.access_token')

# 2. Query
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "query": "What are the high-risk transactions this month?"
  }'
```

### Example 2: Policy Query (RAG)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "query": "What is our fraud prevention policy?"
  }'
```

---

## 🐛 Troubleshooting

### Issue: "Database connection refused"
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check DATABASE_URL in .env
echo $DATABASE_URL
```

### Issue: "OPENAI_API_KEY not found"
- The app will use fallback rule-based classifier
- Set `OPENAI_API_KEY` in `.env` to enable LLM

### Issue: "No module named fastapi"
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: "Port 8000 already in use"
```bash
# Use different port
python -m uvicorn app.main:app --port 8001
```

---

## 📞 Support & Contributing

For issues or contributions:
1. Check existing documentation
2. Review logs: `tail -f logs/app.log`
3. Enable debug logging: Set `LOG_LEVEL=DEBUG`
4. Contact your architect/senior engineer

---

## 📄 License

This project is intended for educational and enterprise use.

---

## 🎓 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [LangChain Documentation](https://docs.langchain.com/)
- [JWT Authentication](https://python-jose.readthedocs.io/)
- [FAISS Vector Search](https://github.com/facebookresearch/faiss)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Last Updated**: March 5, 2026
**Version**: 1.0.0
**Status**: Production Ready
