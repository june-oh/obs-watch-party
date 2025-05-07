@echo off
echo Cleaning up old build files and node_modules...

REM Remove node_modules directory
IF EXIST node_modules (
    echo Removing node_modules...
    rmdir /S /Q node_modules
)

REM Remove package-lock.json
IF EXIST package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json
)

REM Remove dist directory (contains old build artifacts)
IF EXIST dist (
    echo Removing dist directory...
    rmdir /S /Q dist
)

echo Cleanup complete.

echo Installing dependencies...
call npm install
IF ERRORLEVEL 1 (
    echo npm install failed. Exiting.
    exit /B 1
)
echo Dependencies installed.

echo Building the application...
call npm run build
IF ERRORLEVEL 1 (
    echo npm run build failed. Exiting.
    exit /B 1
)

echo Build complete. Output is in the 'dist' folder.
pause 