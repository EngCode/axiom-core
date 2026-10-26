@echo off
setlocal
set "AXIOM_DATA_DIR=%~dp0data"
set "AXIOM_WEBVIEW_DATA_DIR=%~dp0webview-data"
start "" "%~dp0Axiom Core.exe"
endlocal
