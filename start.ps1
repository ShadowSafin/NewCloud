# start.ps1 - Startup script for NewCloud with dynamic LAN IP detection

# 1. Detect Host LAN IP
$ip = (Get-NetIPAddress -InterfaceAlias "Wi-Fi", "Ethernet" -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
if (-not $ip) {
    # Fallback to any non-loopback, non-docker IPv4 address
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "172.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
}
if (-not $ip) {
    $ip = "127.0.0.1"
}

# 2. Get Windows Hostname
$hostname = $env:COMPUTERNAME
if (-not $hostname) {
    $hostname = hostname
}

Write-Host "Detected Host LAN IP: $ip" -ForegroundColor Cyan
Write-Host "Detected Host Name: $hostname" -ForegroundColor Cyan

# 3. Update or Insert into .env file
$envFilePath = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFilePath) {
    $content = Get-Content $envFilePath
    
    # Check if HOST_LAN_IP exists, if so replace, else append
    if ($content -match "HOST_LAN_IP=") {
        $content = $content -replace "HOST_LAN_IP=.*", "HOST_LAN_IP=$ip"
    } else {
        $content += "HOST_LAN_IP=$ip"
    }

    # Check if HOST_HOSTNAME exists, if so replace, else append
    if ($content -match "HOST_HOSTNAME=") {
        $content = $content -replace "HOST_HOSTNAME=.*", "HOST_HOSTNAME=$hostname"
    } else {
        $content += "HOST_HOSTNAME=$hostname"
    }

    Set-Content $envFilePath $content
    Write-Host "Updated .env file with current Host LAN IP and Hostname." -ForegroundColor Green
} else {
    # If no .env file, create one from scratch
    $defaultContent = @(
        "# Database",
        "DB_USER=clouduser",
        "DB_PASSWORD=cloudpass",
        "DB_NAME=cloudstorage",
        "",
        "# Backend",
        "NODE_ENV=development",
        "BACKEND_PORT=4000",
        "JWT_SECRET=dev-jwt-secret-please-change-in-production-0123456789",
        "JWT_REFRESH_SECRET=dev-refresh-secret-please-change-in-production-0123456789",
        "JWT_EXPIRATION=15m",
        "JWT_REFRESH_EXPIRATION=7d",
        "MAX_FILE_SIZE=1099511627776",
        "HOST_LAN_IP=$ip",
        "HOST_HOSTNAME=$hostname",
        "",
        "# Frontend",
        "FRONTEND_URL=http://localhost:3000",
        "NEXT_PUBLIC_API_URL=http://localhost:4000"
    )
    Set-Content $envFilePath $defaultContent
    Write-Host "Created new .env file with detected Host LAN IP and Hostname." -ForegroundColor Green
}

# 4. Bring up docker containers
Write-Host "Starting Docker containers..." -ForegroundColor Yellow
docker compose up -d --build
