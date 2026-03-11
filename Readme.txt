🚀 Project Overview
FinAI Enterprise is a scalable, 3-tier financial chatbot designed to process natural language queries into structured financial insights. This prototype demonstrates how to bridge the gap between AI and secure enterprise data using Intelligent Routing and Role-Based Access Control (RBAC).

🏗️ Architecture Blocks
The system is built on a modular architecture to ensure scalability and security:

Presentation Layer (React + TypeScript): A dynamic UI that renders specialized components (Transaction Tables, Risk Cards) based on backend data types.

Logic Layer (FastAPI):

Query Router: Analyzes user intent to delegate tasks.

SQL Engine: Generates safe queries for structured transaction data.

RAG Engine: Uses FAISS vector search for unstructured policy retrieval.

Data Layer:

PostgreSQL: Stores 15+ core transactions and tamper-evident audit logs.

FAISS Vector Index: High-speed semantic search for compliance documents.

🔐 Security & Compliance
As the security lead, the following features have been implemented:

JWT Authentication: Stateless security tokens issued upon login.

Granular RBAC: * ADMIN: Full system access and Audit Log viewing.

ANALYST: Active chat and data export capabilities.

AUDITOR: Read-only dashboard access (Chat disabled).

VIEWER: Restricted view-only access.

Audit Logging: Every query (successful or blocked) is logged in the PostgreSQL audit_logs table for regulatory compliance.

🛠️ Tech Stack
Frontend: React 18, Tailwind CSS, Lucide Icons.

Backend: FastAPI (Python 3.10+), SQLAlchemy.

Database: PostgreSQL (pgAdmin 4), FAISS (Vector Store).

Authentication: PyJWT.