[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $RootDir ".env"

function Write-NewCloudInfo([string] $Message) {
    Write-Host "[NewCloud] $Message" -ForegroundColor Cyan
}

function Throw-NewCloudError([string] $Message) {
    throw "[NewCloud] $Message"
}

function Get-EnvValue([string] $Key) {
    if (-not (Test-Path $EnvFile)) {
        return ""
    }
    $line = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match "^$([Regex]::Escape($Key))=" } | Select-Object -Last 1
    if (-not $line) {
        return ""
    }
    return $line.Substring($line.IndexOf("=") + 1)
}

function Set-EnvValue([string] $Key, [string] $Value) {
    $lines = [System.Collections.Generic.List[string]]::new()
    if (Test-Path $EnvFile) {
        foreach ($line in Get-Content -LiteralPath $EnvFile) {
            [void]$lines.Add($line)
        }
    }

    $matched = $false
    for ($index = 0; $index -lt $lines.Count; $index++) {
        if ($lines[$index] -match "^$([Regex]::Escape($Key))=") {
            $lines[$index] = "$Key=$Value"
            $matched = $true
            break
        }
    }
    if (-not $matched) {
        [void]$lines.Add("$Key=$Value")
    }
    [IO.File]::WriteAllLines($EnvFile, $lines, [Text.UTF8Encoding]::new($false))
}

function Assert-StrongSecret([string] $Key) {
    $value = Get-EnvValue $Key
    if ([string]::IsNullOrWhiteSpace($value) -or
        $value -eq "GENERATE_WITH_SETUP" -or
        $value.StartsWith("replace-with-") -or
        $value -eq "changeme" -or
        $value -eq "cloudpass" -or
        $value.Length -lt 32) {
        Throw-NewCloudError "$Key is missing or unsafe. Run setup.bat to generate secure production configuration."
    }
}

function Find-LanIp {
    try {
        $preferred = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                -not $_.IPAddress.StartsWith("127.") -and
                -not $_.IPAddress.StartsWith("169.254.") -and
                -not $_.IPAddress.StartsWith("172.17.")
            } |
            Sort-Object { if ($_.IPAddress.StartsWith("192.168.") -or $_.IPAddress.StartsWith("10.")) { 0 } else { 1 } } |
            Select-Object -First 1
        if ($preferred) {
            return $preferred.IPAddress
        }
    } catch {}
    return ""
}

function Wait-Endpoint([string] $Label, [string] $Url) {
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                Write-NewCloudInfo "$Label is healthy: $Url"
                return
            }
        } catch {}
        Start-Sleep -Seconds 2
    }
    Throw-NewCloudError "$Label did not become healthy. Inspect logs with: docker compose logs $Label"
}

function Wait-ServiceHealth([string] $Service) {
    Push-Location $RootDir
    try {
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            $containerId = docker compose --env-file $EnvFile ps -q $Service 2>$null | Select-Object -First 1
            if ($containerId) {
                $status = (docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" $containerId 2>$null).Trim()
                if ($status -eq "healthy") {
                    Write-NewCloudInfo "$Service is healthy."
                    return
                }
                if ($status -eq "unhealthy" -or $status -eq "exited" -or $status -eq "dead") {
                    Throw-NewCloudError "$Service entered state '$status'. Inspect logs with: docker compose logs $Service"
                }
            }
            Start-Sleep -Seconds 2
        }
    } finally {
        Pop-Location
    }
    Throw-NewCloudError "$Service did not become healthy. Inspect logs with: docker compose logs $Service"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Throw-NewCloudError "Docker is not installed."
}
docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
    Throw-NewCloudError "Docker Compose v2 is required."
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Throw-NewCloudError "Docker is installed but the Docker engine is not running."
}
if (-not (Test-Path $EnvFile)) {
    Throw-NewCloudError "No .env configuration found. Run setup.bat first."
}

if ((Get-EnvValue "NODE_ENV") -eq "production") {
    Assert-StrongSecret "DB_PASSWORD"
    Assert-StrongSecret "JWT_SECRET"
    Assert-StrongSecret "JWT_REFRESH_SECRET"
    Assert-StrongSecret "MEDIA_TOKEN_SECRET"
    Assert-StrongSecret "BULL_BOARD_PASSWORD"
}

$lanIp = Find-LanIp
if ($lanIp) {
    Set-EnvValue "HOST_LAN_IP" $lanIp
}
Set-EnvValue "HOST_HOSTNAME" $env:COMPUTERNAME

$dataDir = Get-EnvValue "NEWCLOUD_DATA_DIR"
if ([string]::IsNullOrWhiteSpace($dataDir)) {
    $dataDir = ".\data"
}
if (-not [IO.Path]::IsPathRooted($dataDir)) {
    $dataDir = Join-Path $RootDir $dataDir
}
[void](New-Item -Path (Join-Path $dataDir "storage") -ItemType Directory -Force)

Push-Location $RootDir
try {
    docker compose --env-file $EnvFile config --quiet
    if ($LASTEXITCODE -ne 0) {
        Throw-NewCloudError "Docker Compose configuration validation failed."
    }

    Write-NewCloudInfo "Building and starting the NewCloud stack."
    docker compose --env-file $EnvFile up -d --build --remove-orphans
    if ($LASTEXITCODE -ne 0) {
        Throw-NewCloudError "Docker Compose failed to start NewCloud."
    }
} finally {
    Pop-Location
}

$frontendPort = Get-EnvValue "FRONTEND_PORT"
$backendPort = Get-EnvValue "BACKEND_PORT"
if (-not $frontendPort) { $frontendPort = "3000" }
if (-not $backendPort) { $backendPort = "4000" }

Wait-Endpoint "backend" "http://127.0.0.1:$backendPort/health/ready"
Wait-Endpoint "frontend" "http://127.0.0.1:$frontendPort/health"
Wait-ServiceHealth "worker"

Write-NewCloudInfo "NewCloud is ready at http://localhost:$frontendPort"
if ($lanIp) {
    Write-NewCloudInfo "LAN access: http://${lanIp}:$frontendPort"
}
