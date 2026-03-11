# API Testing Guide

This guide provides examples for testing the Financial GenAI Chatbot API.

## Prerequisites

- Running instance at `http://localhost:8000`
- `curl` or Postman installed
- Environment file (`.env`) configured

## Quick Test Commands

### 1. Health Check
```bash
curl -X GET http://localhost:8000/health -H "Content-Type: application/json"
```

### 2. Get API Info
```bash
curl -X GET http://localhost:8000/ -H "Content-Type: application/json"
```

### 3. Get RBAC Info
```bash
curl -X GET http://localhost:8000/info/roles -H "Content-Type: application/json"
```

---

## Authentication Tests

### Login as Risk Analyst
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "analyst_john",
    "password": "SecurePass123!"
  }' | jq .
```

**Save the token:**
```bash
export ANALYST_TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"analyst_john","password":"SecurePass123!"}' | jq -r '.access_token')

echo "Token: $ANALYST_TOKEN"
```

### Login as Compliance Officer
```bash
export OFFICER_TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"officer_sarah","password":"CompliancePass123!"}' | jq -r '.access_token')
```

### Login as Admin
```bash
export ADMIN_TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_root","password":"AdminPass123!"}' | jq -r '.access_token')
```

---

## Chat Endpoint Tests

### Test 1: Transactional Query (Transaction Analysis)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "query": "Show me the high-risk transactions from the last 30 days"
  }' | jq .
```

### Test 2: Policy Query (RAG - Requires PDF in /data folder)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "query": "What is our fraud prevention policy?"
  }' | jq .
```

### Test 3: Risk Analysis Query
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "query": "Calculate the average risk score for my transactions"
  }' | jq .
```

### Test 4: Query with Context
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_002",
    "query": "What transactions require compliance review?",
    "context": {
      "time_period": "30d",
      "risk_threshold": 70.0
    }
  }' | jq .
```

---

## Authorization Tests

### Test: Valid Token (Should Work)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "query": "Show recent transactions"
  }' | jq .
```

### Test: Invalid Token (Should Fail - 401)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer invalid_token_xyz" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "query": "Show recent transactions"
  }' | jq .
```

### Test: Missing Token (Should Fail - 403)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "query": "Show recent transactions"
  }' | jq .
```

---

## Error Handling Tests

### Test 1: Invalid Query (Too Short)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "query": "Hi"
  }' | jq .
```

### Test 2: Query Too Long (>1000 chars)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "query": "'"$(printf 'a%.0s' {1..1001})"'"
  }' | jq .
```

### Test 3: Missing User ID
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show recent transactions"
  }' | jq .
```

---

## Advanced Testing

### Batch Requests (Multiple Queries)
```bash
for i in {1..5}; do
  echo "Request $i..."
  curl -s -X POST http://localhost:8000/chat \
    -H "Authorization: Bearer $ANALYST_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"user_001\",
      \"query\": \"Query number $i - Show transactions\"
    }" | jq '.trace_id'
  sleep 1
done
```

### Performance Test (Simple Load)
```bash
# Run 10 concurrent requests
for i in {1..10}; do
  curl -s -X POST http://localhost:8000/chat \
    -H "Authorization: Bearer $ANALYST_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "user_id": "user_001",
      "query": "Show high-risk transactions"
    }' > /dev/null &
done
wait
echo "Completed 10 concurrent requests"
```

---

## Using Postman

### 1. Import Collection
Create a new collection in Postman with these requests:

#### Login
- **Method**: POST
- **URL**: `{{base_url}}/auth/login`
- **Body** (raw JSON):
```json
{
  "username": "analyst_john",
  "password": "SecurePass123!"
}
```
- **Tests** (to save token):
```javascript
var jsonData = pm.response.json();
pm.environment.set("access_token", jsonData.access_token);
```

#### Chat Query
- **Method**: POST
- **URL**: `{{base_url}}/chat`
- **Headers**:
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "user_id": "user_001",
  "query": "Show me high-risk transactions",
  "context": {}
}
```

### 2. Set Environment Variables
```json
{
  "base_url": "http://localhost:8000",
  "access_token": ""
}
```

---

## Database Verification

### Check Audit Logs
```bash
# Using psql
psql -U financial_user -d financial_db -c "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;"

# Or using Docker
docker exec financial_genai_postgres psql -U financial_user -d financial_db -c "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;"
```

### Check Transactions
```bash
docker exec financial_genai_postgres psql -U financial_user -d financial_db -c "SELECT id, amount, merchant, risk_score, timestamp FROM transactions ORDER BY timestamp DESC LIMIT 10;"
```

---

## Troubleshooting

### Issue: Connection Refused
```bash
# Check if service is running
curl -v http://localhost:8000/health

# Check logs
docker logs financial_genai_app
```

### Issue: 401 Unauthorized
- Verify token is not expired
- Check token is included in Authorization header as `Bearer <token>`
- Try logging in again to get a fresh token

### Issue: 422 Unprocessable Entity
- Validate JSON payload is correct
- Check required fields are present
- Use `jq` to validate JSON: `echo '{"test":"data"}' | jq .`

### Issue: Database Connection Error
```bash
# Verify database is running
docker exec financial_genai_postgres pg_isready

# Check database URL in .env
cat .env | grep DATABASE_URL
```

---

## Performance Benchmarking

### Simple Benchmark
```bash
# Measure response time
time curl -s -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user_001","query":"Show transactions"}' > /dev/null
```

### Apache Bench (ab)
```bash
# Install ab (included with Apache)
# Run load test
ab -n 100 -c 10 -H "Authorization: Bearer $ANALYST_TOKEN" http://localhost:8000/health
```

---

## API Response Examples

### Successful Chat Response (TRANSACTIONAL)
```json
{
  "query": "Show me the high-risk transactions",
  "response": "Found 8 transactions matching your criteria.",
  "query_type": "TRANSACTIONAL",
  "data": [
    {
      "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
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
    "last_updated": "2026-03-05T10:31:42.123456"
  },
  "trace_id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2026-03-05T10:31:42.123456"
}
```

### Error Response
```json
{
  "error": "Invalid authentication credentials",
  "detail": "Invalid authentication credentials",
  "trace_id": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2026-03-05T10:31:42.123456"
}
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v2
      - name: Run API tests
        run: |
          python -m pytest tests/ -v
```

---

**Last Updated**: March 5, 2026
**Version**: 1.0.0
