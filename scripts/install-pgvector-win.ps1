# Run this script in an Administrator PowerShell window to install pgvector (v0.8.7 for PostgreSQL 18)
param(
  [string]$PostgresRoot = "C:\Users\Gowtham L\Downloads\PostgresSQL",
  [string]$PgServiceName = "postgresql-x64-18"
)

$ErrorActionPreference = "Stop"

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Administrator privileges are required to write to PostgreSQL directories and restart the Windows service. Please right-click PowerShell and choose 'Run as Administrator'."
  exit 1
}

if (-not (Test-Path "$PostgresRoot\bin\psql.exe")) {
  Write-Error "Could not find psql.exe under '$PostgresRoot\bin'. Pass -PostgresRoot '<your-install-path>' if PostgreSQL is installed elsewhere."
  exit 1
}

$zipUrl = "https://github.com/andreiramani/pgvector_pgsql_windows/releases/download/0.8.7/vector.v0.8.7-pg18.zip"
$tempDir = Join-Path $env:TEMP "clubmatch_pgvector_0_8_7"
$zipPath = Join-Path $tempDir "vector.v0.8.7-pg18.zip"
$extractDir = Join-Path $tempDir "extracted"

if (Test-Path $tempDir) {
  Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $extractDir | Out-Null

Write-Host "Downloading pgvector 0.8.7 for PostgreSQL 18..."
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

Write-Host "Extracting archive..."
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

$libSrc = Get-ChildItem -Path $extractDir -Recurse -Filter "vector.dll" | Select-Object -First 1
if (-not $libSrc) {
  Write-Error "vector.dll was not found inside the extracted archive."
  exit 1
}

Copy-Item -Path $libSrc.FullName -Destination (Join-Path $PostgresRoot "lib\vector.dll") -Force

$extFiles = Get-ChildItem -Path $extractDir -Recurse -Include "vector.control", "vector--*.sql"
if ($extFiles.Count -eq 0) {
  Write-Error "pgvector extension SQL/control files were not found inside the extracted archive."
  exit 1
}

$extDest = Join-Path $PostgresRoot "share\extension"
foreach ($file in $extFiles) {
  Copy-Item -Path $file.FullName -Destination (Join-Path $extDest $file.Name) -Force
}

$service = Get-Service -Name $PgServiceName -ErrorAction SilentlyContinue
if ($service) {
  Write-Host "Restarting PostgreSQL service '$PgServiceName'..."
  Restart-Service -Name $PgServiceName -Force
}

Write-Host "pgvector files installed cleanly into '$PostgresRoot'."
Write-Host "Next steps:"
Write-Host "  1. Create database 'clubmatch' and run: CREATE EXTENSION IF NOT EXISTS vector;"
Write-Host "  2. Update DATABASE_URL password in .env"
Write-Host "  3. Run: npx prisma db push; npm run db:setup-sql; npm run db:seed"
