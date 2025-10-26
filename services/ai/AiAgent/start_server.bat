@echo off
echo Starting AI Agent HTTP Server...
echo.

REM Check if .env file exists
if not exist ".env" (
    echo ERROR: .env file not found!
    echo Please create .env file with your OpenRouter API key:
    echo OPENROUTER_API_KEY=your_api_key_here
    echo.
    echo Get your API key from: https://openrouter.ai/keys
    pause
    exit /b 1
)

REM Install dependencies if needed
echo Installing dependencies...
py -m pip install -r requirements.txt

REM Start the server
echo.
echo Starting server...
py api_server.py

pause
