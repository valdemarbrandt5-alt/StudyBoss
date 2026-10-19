@echo off
cd /d "%~dp0"
where ollama >nul 2>nul
if errorlevel 1 goto missingollama
py -3 --version >nul 2>nul
if errorlevel 1 goto missingpython
py -3 -m venv .venv
if errorlevel 1 goto failed
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto failed
ollama pull qwen3:14b
if errorlevel 1 goto failed
ollama create studyboss -f Modelfile
if errorlevel 1 goto failed
echo Klar! Dobbeltklik nu paa Start.bat.
pause
exit /b 0
:missingollama
echo Installer Ollama fra https://ollama.com/download/windows og start det. Koer derefter denne fil igen.
pause
exit /b 1
:missingpython
echo Installer Python 3.11 eller 3.12 fra https://www.python.org/downloads/windows/ med Python Launcher.
pause
exit /b 1
:failed
echo Installationen fejlede. Se fejlbeskeden ovenfor. Kontroller at Ollama er startet.
pause
exit /b 1
