# Deployment Guide - Financial GenAI Chatbot

Comprehensive guide for deploying the Financial GenAI Chatbot to production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Local Deployment](#local-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Security Hardening](#security-hardening)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Application Code
- [ ] All code reviewed and tested
- [ ] No hardcoded secrets in codebase
- [ ] All dependencies pinned to specific versions
- [ ] Error handling is comprehensive
- [ ] Logging is implemented throughout
- [ ] Unit and integration tests pass

### Security
- [ ] `SECRET_KEY` changed from default
- [ ] `OPENAI_API_KEY` is managed securely
- [ ] JWT expiration time configured appropriately
- [ ] CORS origins restricted (not `*`)
- [ ] SSL/TLS certificates prepared
- [ ] Database password is strong
- [ ] API keys rotated recently

### Database
- [ ] PostgreSQL 13+ installed
- [ ] Database backups configured
- [ ] Connection pooling configured
- [ ] Indexes created for performance
- [ ] Retention policies set for audit logs

### Infrastructure
- [ ] Server resources sufficient (CPU, RAM, disk)
- [ ] Network connectivity verified
- [ ] Firewall rules configured
- [ ] Load balancer configured (if applicable)
- [ ] DNS records updated

### Documentation
- [ ] Deployment steps documented
- [ ] Rollback procedures documented
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds defined
- [ ] Runbook for common issues created

---

## Local Deployment

### Minimal Local Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd financial-genai-bot

# 2. Run setup script
bash setup.sh

# 3. Configure environment
cat .env.example > .env
# Edit .env with your values

# 4. Start PostgreSQL (if using Docker for DB only)
docker run -d --name postgres_financial \
  -e POSTGRES_USER=financial_user \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=financial_db \
  -p 5432:5432 \
  postgres:16-alpine

# 5. Initialize database
psql -U financial_user -d financial_db < init.sql

# 6. Start application
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Development Server Configuration

```bash
# For development with auto-reload and debug logging
python -m uvicorn app.main:app \
  --reload \
  --host 0.0.0.0 \
  --port 8000 \
  --log-level debug
```

---

## Docker Deployment

### Single-Command Deployment

```bash
# Build and start all services
docker-compose up -d --build

# Monitor startup
docker-compose logs -f

# Verify services
docker-compose ps
```

### Service-by-Service Deployment

```bash
# Start only database
docker-compose up -d postgres

# Wait for DB to be ready
docker-compose exec postgres pg_isready

# Start application
docker-compose up -d app

# Start optional pgAdmin
docker-compose up -d pgadmin
```

### Docker Configuration File

The `docker-compose.yml` includes:
- **postgres service**: PostgreSQL 16 Alpine
- **app service**: FastAPI application
- **pgadmin service**: Database management interface

### Post-Docker Deployment

```bash
# Check application health
curl http://localhost:8000/health

# View logs
docker-compose logs app

# Execute database query
docker-compose exec postgres psql -U financial_user -d financial_db \
  -c "SELECT COUNT(*) FROM transactions;"

# Access pgAdmin
# Visit http://localhost:5050
# Default credentials: admin@example.com / admin
```

---

## Cloud Deployment

### AWS Deployment (ECS + RDS)

#### 1. Setup RDS PostgreSQL
```bash
# Create RDS instance via AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier financial-genai-db \
  --db-instance-class db.t3.small \
  --engine postgres \
  --engine-version 16.1 \
  --master-username financial_user \
  --master-user-password $(openssl rand -base64 32) \
  --allocated-storage 50
```

#### 2. Build and Push Docker Image
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t financial-genai-bot .

# Tag image
docker tag financial-genai-bot:latest \
  <account>.dkr.ecr.us-east-1.amazonaws.com/financial-genai-bot:latest

# Push to ECR
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/financial-genai-bot:latest
```

#### 3. Deploy to ECS
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name financial-genai

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster financial-genai \
  --service-name financial-genai-service \
  --task-definition financial-genai:1 \
  --desired-count 2 \
  --load-balancers targetGroupArn=<arn>,containerName=app,containerPort=8000
```

### Google Cloud (Cloud Run + Cloud SQL)

```bash
# Enable services
gcloud services enable run.googleapis.com sqladmin.googleapis.com

# Create Cloud SQL instance
gcloud sql instances create financial-genai-db \
  --database-version POSTGRES_16 \
  --tier db-custom-2-8192

# Deploy to Cloud Run
gcloud run deploy financial-genai \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL=<cloud-sql-url> \
  --allow-unauthenticated
```

### Azure Deployment (App Service + PostgreSQL)

```bash
# Create resource group
az group create --name financial-genai --location eastus

# Create PostgreSQL server
az postgres server create \
  --resource-group financial-genai \
  --name financial-genai-db \
  --location eastus \
  --admin-user financial_user

# Deploy app
az webapp up --name financial-genai-app --resource-group financial-genai
```

---

## Security Hardening

### 1. Environment Variables
```bash
# Use secrets manager, NOT environment files in production
# AWS Secrets Manager, Azure Key Vault, HashiCorp Vault, etc.

# Example: AWS Secrets Manager
aws secretsmanager create-secret \
  --name financial/genai/SECRET_KEY \
  --secret-string "your-secure-key"
```

### 2. Network Security
```bash
# Restrict database access
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr 10.0.0.0/8  # Only from app subnet

# Use VPC endpoints for cloud services
# Disable public IP on RDS instance
# Use security groups to restrict access
```

### 3. API Security
```python
# In .env
CORS_ALLOWED_ORIGINS=https://yourdomain.com
JWT_EXPIRY=15  # Short expiration
RATE_LIMIT_ENABLED=True
RATE_LIMIT_REQUESTS=100  # per minute
```

### 4. Database Security
```sql
-- Create limited role
CREATE ROLE app_user WITH PASSWORD 'secure_password' LOGIN;

-- Grant specific permissions
GRANT CONNECT ON DATABASE financial_db TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON transactions TO app_user;
GRANT SELECT, INSERT ON audit_logs TO app_user;

-- Revoke dangerous operations
REVOKE ALL ON DATABASE financial_db FROM public;
REVOKE SUPERUSER ON ROLE app_user;
```

### 5. SSL/TLS

```bash
# Generate self-signed certificates (development only)
openssl req -x509 -newkey rsa:4096 -nodes \
  -out cert.pem -keyout key.pem -days 365

# In docker-compose.yml
environment:
  - SSL_CERT_FILE=/app/cert.pem
  - SSL_KEY_FILE=/app/key.pem
```

---

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_transactions_user_risk ON transactions(user_id, risk_score);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM transactions 
WHERE user_id = 'user_001' 
AND risk_score > 70.0 
ORDER BY timestamp DESC;

-- Configure connection pooling
-- Use PgBouncer with connection limits
```

### 2. Application Optimization

```python
# In main.py - increase workers for production
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        workers=4,  # Match CPU cores
        loop="uvloop",  # Use uvloop for better performance
        access_log=False,  # Disable if using reverse proxy
    )
```

### 3. Caching

```python
# Add Redis caching (example)
from fastapi_cache2 import FastAPICache2
from fastapi_cache2.backends.redis import RedisBackend

# Cache FAISS index
@FastAPICache2.cached(expire=3600)
async def get_vector_results(query: str):
    return await semantic_search(query)
```

### 4. Load Balancing

```nginx
# nginx configuration
upstream financial_genai {
    least_conn;
    server app1:8000;
    server app2:8000;
    server app3:8000;
}

server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/cert.pem;
    ssl_certificate_key /etc/nginx/key.pem;
    
    location / {
        proxy_pass http://financial_genai;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Monitoring & Logging

### 1. Application Logging

```python
# Configure structured logging
import logging
from pythonjsonlogger import jsonlogger

logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)
```

### 2. Prometheus Metrics

```python
# Add monitoring endpoint
from prometheus_client import Counter, Histogram

request_count = Counter('api_requests_total', 'Total requests')
request_duration = Histogram('api_request_duration_seconds', 'Request duration')

@app.middleware("http")
async def add_metrics(request, call_next):
    request_count.inc()
    with request_duration.time():
        return await call_next(request)
```

### 3. Grafana Dashboards

```yaml
# Example dashboard metrics
- Database connection pool usage
- API request latency
- Error rate
- LLM token usage and cost
- Vector search performance
- Audit log growth
```

### 4. CloudWatch/DataDog Logs

```bash
# Forward logs to CloudWatch
aws logs create-log-group --log-group-name /financial-genai/app

# Configure in-app
import logging
import watchtower

logging.basicConfig(
    level=logging.INFO,
    handlers=[
        watchtower.CloudWatchLogHandler()
    ]
)
```

---

## Backup & Recovery

### 1. Database Backups

```bash
# Automated daily backup
0 2 * * * /usr/local/bin/backup-database.sh > /var/log/backup.log 2>&1

# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/financial_db_${DATE}.sql.gz"

pg_dump -U financial_user financial_db | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://financial-genai-backups/

# Keep only 30 days
aws s3 rm s3://financial-genai-backups/ --recursive --exclude "*" \
  --include "*" --older-than 30
```

### 2. Point-in-Time Recovery

```bash
# Enable WAL archiving in PostgreSQL
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://financial-genai-wals/'

# Restore from backup
pg_restore -U financial_user -d financial_db backup.sql
```

### 3. Application Backups

```bash
# Backup FAISS index
tar -czf faiss_backup_$(date +%Y%m%d).tar.gz data/faiss_index/

# Upload to cloud storage
aws s3 cp faiss_backup_*.tar.gz s3://financial-genai-backups/faiss/
```

---

## Troubleshooting

### Common Issues

#### 1. Application Fails to Start
```bash
# Check logs
docker logs financial_genai_app

# Verify environment
docker exec financial_genai_app env | grep DATABASE

# Test database connection
docker exec financial_genai_postgres psql -U financial_user -d financial_db -c "SELECT 1;"
```

#### 2. High Database Connection Usage
```sql
-- Check active connections
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

-- Kill idle connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state = 'idle';

-- Increase pool size if needed
```

#### 3. Memory Usage Growing
```bash
# Monitor memory
docker stats financial_genai_app

# Check for memory leaks
# Enable Python garbage collection monitoring
import gc
gc.set_debug(gc.DEBUG_SAVEALL)
```

#### 4. Slow API Responses
```bash
# Check database query performance
# Enable query logging
docker exec financial_genai_postgres psql -U financial_user financial_db \
  -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# View slow queries
docker exec financial_genai_postgres psql -U financial_user financial_db \
  -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## Post-Deployment Steps

1. **Verify Services**
   - Health check endpoint
   - API documentation
   - Database connectivity

2. **Run Integration Tests**
   - Authentication flow
   - Query classification
   - Data retrieval

3. **Configure Monitoring**
   - Set up dashboards
   - Configure alerts
   - Test alert notifications

4. **Establish Runbooks**
   - Scaling procedures
   - Failure recovery
   - Maintenance windows

5. **Document Configuration**
   - Environment variables
   - Secrets management
   - Database credentials

---

**Last Updated**: March 5, 2026
**Version**: 1.0.0
**Status**: Production Ready
