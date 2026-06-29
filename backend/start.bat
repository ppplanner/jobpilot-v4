@echo off
chcp 65001 > nul
title JobPilot v2 - Backend API

echo.
echo  ====================================
echo   JobPilot v2 - FastAPI Backend
echo   http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo  ====================================
echo.

cd /d %~dp0
python -m uvicorn main:app --reload --port 8000

pause
