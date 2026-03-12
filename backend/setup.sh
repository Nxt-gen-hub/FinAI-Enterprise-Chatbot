#!/bin/bash

# Financial GenAI Chatbot - Quick Start Script
# This script simplifies the local development setup

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Financial GenAI Chatbot - Quick Start Setup                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Python version
echo -e "${YELLOW}Checking Python version...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✓ Found Python ${PYTHON_VERSION}${NC}"

# Create virtual environment
echo -e "${YELLOW}Creating virtual environment...${NC}"
if [ -d "venv" ]; then
    echo -e "${YELLOW}Virtual environment already exists, skipping creation${NC}"
else
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate || . venv\Scripts\activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"

# Upgrade pip
echo -e "${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip setuptools wheel > /dev/null 2>&1
echo -e "${GREEN}✓ pip upgraded${NC}"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -r requirements.txt
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Check for .env file
echo -e "${YELLOW}Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit .env with your configuration (especially OPENAI_API_KEY)${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Create data directories
echo -e "${YELLOW}Creating data directories...${NC}"
mkdir -p data
mkdir -p logs
echo -e "${GREEN}✓ Data directories created${NC}"

# Information
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Setup complete! Next steps:                               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "1. ${YELLOW}Configure database${NC}"
echo "   • Ensure PostgreSQL is running"
echo "   • Update DATABASE_URL in .env"
echo "   • Initialize database: psql -U financial_user -d financial_db < init.sql"
echo ""
echo -e "2. ${YELLOW}Configure OpenAI API (optional)${NC}"
echo "   • Set OPENAI_API_KEY in .env"
echo "   • Without it, the app will use fallback rule-based classifier"
echo ""
echo -e "3. ${YELLOW}Add policy documents${NC}"
echo "   • Place PDF files in: ./data/"
echo "   • They will be automatically indexed on startup"
echo ""
echo -e "4. ${YELLOW}Start the application${NC}"
echo "   • Run: python -m uvicorn app.main:app --reload"
echo "   • API will be available at: http://localhost:8000"
echo "   • Interactive docs at: http://localhost:8000/docs"
echo ""
echo -e "5. ${YELLOW}Test the API${NC}"
echo "   • See API_TESTING.md for testing examples"
echo ""
echo -e "6. ${YELLOW}For Docker deployment${NC}"
echo "   • Run: docker-compose up --build"
echo ""
echo -e "📖 ${YELLOW}Documentation:${NC}"
echo "   • Main README: README.md"
echo "   • API Testing: API_TESTING.md"
echo "   • Deployment: DEPLOYMENT.md"
echo ""
