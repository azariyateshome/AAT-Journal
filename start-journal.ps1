$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Frontend = Join-Path $Root 'frontend'
$Backend = Join-Path $Root 'backend'
$Logs = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

function Show-Error([string]$Message) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($Message, 'Trading Journal', 'OK', 'Error') | Out-Null
    exit 1
}

function Test-Port([int]$Port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect('127.0.0.1', $Port)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Require-Command([string]$Command, [string]$Message) {
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        Show-Error $Message
    }
}

Require-Command 'node' 'Node.js is required. Please install Node.js 22.12 or newer, then open Trading Journal again.'
Require-Command 'npm' 'npm is required and normally comes with Node.js. Please reinstall Node.js 22.12 or newer.'

# Vite 8 requires a recent supported Node.js release.
try {
    $nodeVersionText = (& node -p "process.versions.node").Trim()
    $nodeVersion = [version]$nodeVersionText
    if ($nodeVersion -lt [version]'22.12.0') {
        Show-Error "Node.js 22.12 or newer is required by this Journal version. Installed version: $nodeVersionText"
    }
} catch {
    Show-Error "Could not determine the Node.js version. Please install Node.js 22.12 or newer."
}

# Install dependencies only if they are missing.
if (-not (Test-Path (Join-Path $Backend 'node_modules'))) {
    $log = Join-Path $Logs 'backend-install.log'
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c',"npm ci > `"$log`" 2>&1" -WorkingDirectory $Backend -Wait -WindowStyle Hidden
    if (-not (Test-Path (Join-Path $Backend 'node_modules'))) {
        Show-Error "Backend dependencies could not be installed.`n`nCheck:`n$log"
    }
}

if (-not (Test-Path (Join-Path $Frontend 'node_modules'))) {
    $log = Join-Path $Logs 'frontend-install.log'
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c',"npm ci > `"$log`" 2>&1" -WorkingDirectory $Frontend -Wait -WindowStyle Hidden
    if (-not (Test-Path (Join-Path $Frontend 'node_modules'))) {
        Show-Error "Frontend dependencies could not be installed.`n`nCheck:`n$log"
    }
}

# Start backend silently if it is not already running.
if (-not (Test-Port 5000)) {
    $log = Join-Path $Logs 'backend.log'
    $backendCmd = "npm run dev > `"$log`" 2>&1"
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c',$backendCmd -WorkingDirectory $Backend -WindowStyle Hidden
}

# Start Vite silently if it is not already running.
if (-not (Test-Port 5173)) {
    $log = Join-Path $Logs 'frontend.log'
    $frontendCmd = "npm run dev -- --host 127.0.0.1 > `"$log`" 2>&1"
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c',$frontendCmd -WorkingDirectory $Frontend -WindowStyle Hidden
}

# Wait for the frontend to become ready.
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Port 5173) {
        $ready = $true
        break
    }
}

if (-not $ready) {
    Show-Error "Trading Journal could not start.`n`nCheck:`n$Logs\frontend.log`n$Logs\backend.log"
}

$url = 'http://localhost:5173'

# Prefer Chrome, then Edge. --app makes the browser look like a desktop application.
$chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$edge = @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList "--app=$url"
} elseif ($edge) {
    Start-Process -FilePath $edge -ArgumentList "--app=$url"
} else {
    Start-Process $url
}
