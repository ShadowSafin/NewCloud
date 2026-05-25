[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepositoryUrl = if ($env:NEWCLOUD_REPOSITORY_URL) { $env:NEWCLOUD_REPOSITORY_URL } else { "https://github.com/ShadowSafin/NewCloud.git" }
$RepositoryRef = if ($env:NEWCLOUD_REPOSITORY_REF) { $env:NEWCLOUD_REPOSITORY_REF } else { "main" }
$InstallDir = if ($env:NEWCLOUD_INSTALL_DIR) { $env:NEWCLOUD_INSTALL_DIR } else { "NewCloud" }

function Write-NewCloudInfo([string] $Message) {
    Write-Host "[NewCloud] $Message" -ForegroundColor Cyan
}

function Throw-NewCloudError([string] $Message) {
    throw "[NewCloud] $Message"
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Throw-NewCloudError "Git is required to install NewCloud from GitHub."
}

$target = [IO.Path]::GetFullPath((Join-Path (Get-Location) $InstallDir))
$setupScript = Join-Path $target "setup.ps1"
$composeFile = Join-Path $target "docker-compose.yml"
$gitDirectory = Join-Path $target ".git"

if ((Test-Path -LiteralPath $gitDirectory) -and
    (Test-Path -LiteralPath $setupScript) -and
    (Test-Path -LiteralPath $composeFile)) {
    Write-NewCloudInfo "Existing installation found in $target; launching it without changing its checked-out source."
    & $setupScript
    exit $LASTEXITCODE
}

if (Test-Path -LiteralPath $target) {
    Throw-NewCloudError "$target exists but is not a NewCloud checkout. Set NEWCLOUD_INSTALL_DIR to another location."
}

Write-NewCloudInfo "Cloning $RepositoryUrl ($RepositoryRef) into $target"
git clone --branch $RepositoryRef --single-branch $RepositoryUrl $target
if ($LASTEXITCODE -ne 0) {
    Throw-NewCloudError "Git clone failed."
}

& $setupScript
exit $LASTEXITCODE
