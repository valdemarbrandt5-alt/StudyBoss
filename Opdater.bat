@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
 echo Koer Install.bat foerst.
 pause
 exit /b 1
)
echo Luk StudyBoss foer opdatering.
.venv\Scripts\python.exe update.py
pause
