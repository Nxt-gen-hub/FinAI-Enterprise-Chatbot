@echo off
REM Financial GenAI Chatbot - Quick Start Script for Windows
REM This script simplifies the local development setup on Windows

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║  Financial GenAI Chatbot - Quick Start Setup (Windows)         ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check Python version
echo Checking Python version...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✓ Found Python %PYTHON_VERSION%
echo.

REM Create virtual environment
echo Creating virtual environment...
if exist "venv" (
    echo Virtual environment already exists, skipping creation
) else (
    python -m venv venv
    echo ✓ Virtual environment created
)
echo.

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo ✓ Virtual environment activated
echo.

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip setuptools wheel >nul 2>&1
echo ✓ pip upgraded
echo.

REM Install dependencies
echo Installing dependencies...
echo This may take a few minutes...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies installed
echo.

REM Check for .env file
echo Checking environment configuration...
if not exist ".env" (
    echo ⚠ .env file not found
    echo Creating .env from .env.example...
    copy .env.example .env
    echo ✓ .env created - Please edit it with your configuration!
) else (
    echo ✓ .env file exists
)
echo.

REM Create data directories
echo Creating data directories...
if not exist "data" mkdir data
if not exist "logs" mkdir logs
echo ✓ Data directories created
echo.

REM Display next steps
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║  ✓ Setup complete! Next steps:                               ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 1. Configure database
echo    • Ensure PostgreSQL is running
echo    • Update DATABASE_URL in .env
echo    • Run: psql -U financial_user -d financial_db ^< init.sql
echo.
echo 2. Configure OpenAI API (optional)
echo    • Set OPENAI_API_KEY in .env
echo    • Without it, the app will use fallback rule-based classifier
echo.
echo 3. Add policy documents
echo    • Place PDF files in: ./data/
echo    • They will be automatically indexed on startup
echo.
echo 4. Start the application
echo    • Run: python -m uvicorn app.main:app --reload
echo    • API will be available at: http://localhost:8000
echo    • Interactive docs at: http://localhost:8000/docs
echo.
echo 5. Test the API
echo    • See API_TESTING.md for testing examples
echo.
echo 6. For Docker deployment
echo    • Install Docker Desktop for Windows
echo    • Run: docker-compose up --build
echo.
echo 📖 Documentation:
echo    • Main README: README.md
echo    • API Testing: API_TESTING.md
echo    • Deployment: DEPLOYMENT.md
echo.
pause
