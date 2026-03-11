-- PostgreSQL initialization script for Financial GenAI Chatbot

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create financial_user if not exists
-- (Note: PostgreSQL handles this during container setup)

-- Create tables
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount FLOAT NOT NULL,
    merchant VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    risk_score FLOAT DEFAULT 0.0 NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    query VARCHAR(2000) NOT NULL,
    response VARCHAR(5000) NOT NULL,
    query_type VARCHAR(50) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    trace_id VARCHAR(100) NOT NULL UNIQUE,
    status_code INTEGER DEFAULT 200,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_risk_score ON transactions(risk_score);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_trace_id ON audit_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_query_type ON audit_logs(query_type);

-- Sample data for transactions
INSERT INTO transactions (amount, merchant, category, risk_score, user_id, timestamp, description)
VALUES
    (1500.00, 'SUSPICIOUS_MERCHANT_A', 'Electronics', 85.5, 'user_001', CURRENT_TIMESTAMP - INTERVAL '5 days', 'High value electronics purchase'),
    (250.00, 'NORMAL_RETAIL_B', 'Retail', 15.2, 'user_001', CURRENT_TIMESTAMP - INTERVAL '3 days', 'Regular retail purchase'),
    (5000.00, 'INTERNATIONAL_VENDOR_C', 'Services', 92.1, 'user_001', CURRENT_TIMESTAMP - INTERVAL '1 day', 'International wire transfer'),
    (75.50, 'LOCAL_COFFEE_D', 'Food', 5.0, 'user_001', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Coffee shop transaction'),
    (2300.00, 'OFFSHORE_ACCOUNT_E', 'Finance', 88.7, 'user_001', CURRENT_TIMESTAMP - INTERVAL '6 days', 'Offshore account deposit'),
    (450.00, 'RETAIL_STORE_F', 'Retail', 22.5, 'user_002', CURRENT_TIMESTAMP - INTERVAL '4 days', 'Shopping mall purchase'),
    (100.00, 'SUBSCRIPTION_G', 'Services', 10.0, 'user_002', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Monthly subscription'),
    (3500.00, 'UNKNOWN_SOURCE_H', 'Finance', 79.5, 'user_002', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Unknown source transfer');

-- Sample audit log entry
INSERT INTO audit_logs (user_id, query, response, query_type, user_role, trace_id, status_code)
VALUES
    ('user_001', 'Show me high-risk transactions', 'Found 3 transactions matching your criteria.', 'TRANSACTIONAL', 'Risk Analyst', 'trace_001_sample', 200);

-- Grant properly
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO financial_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO financial_user;
GRANT USAGE ON SCHEMA public TO financial_user;
