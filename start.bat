@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Local AirLLM
cd /d "%~dp0"

set "APP_PYTHON="

if exist "%~dp0.venv\Scripts\python.exe" (
  set "APP_PYTHON=%~dp0.venv\Scripts\python.exe"
)

if not defined APP_PYTHON if exist "%~dp0data\launcher_python.txt" (
  set /p APP_PYTHON=<"%~dp0data\launcher_python.txt"
  if not exist "%APP_PYTHON%" set "APP_PYTHON="
)

if not defined APP_PYTHON (
  for /f "usebackq delims=" %%I in (`py -3 -c "import sys; print(sys.executable)" 2^>nul`) do set "APP_PYTHON=%%I"
)

if not defined APP_PYTHON (
  for /f "usebackq delims=" %%I in (`where python 2^>nul`) do if not defined APP_PYTHON set "APP_PYTHON=%%I"
)

if not defined APP_PYTHON (
  echo No usable Python installation was found.
  echo Install Python 3.10 or newer, then run this file again.
  pause
  exit /b 1
)

if not exist "%~dp0data" mkdir "%~dp0data"
>"%~dp0data\launcher_python.txt" echo %APP_PYTHON%

echo Starting Local AirLLM with:
echo %APP_PYTHON%
echo.
"%APP_PYTHON%" "%~dp0server.py"

if errorlevel 1 (
  echo.
  echo Local AirLLM stopped with an error.
  pause
)

