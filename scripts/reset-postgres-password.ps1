# Automated one-step repair script for PostgreSQL + pgvector + ClubMatch database
# Run this in your Administrator PowerShell window:
#   powershell -ExecutionPolicy Bypass -File .\scripts\reset-postgres-password.ps1

param(
  [string]$PostgresRoot = "",
  [string]$PgServiceName = "postgresql-x64-18",
  [string]$NewPassword = "postgres"
)

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Please right-click PowerShell and choose 'Run as Administrator', then re-run this script."
  exit 1
}

# 1. Resolve PostgreSQL Root Directory
if (-not $PostgresRoot) {
  $candidateRoots = @(
    "C:\Users\Gowtham L\Downloads\PostgreSQL",
    "C:\Users\Gowtham L\Downloads\PostgresSQL",
    "C:\Program Files\PostgreSQL\18",
    "C:\Program Files\PostgreSQL\17",
    "C:\Program Files\PostgreSQL\16"
  )
  foreach ($c in $candidateRoots) {
    if (Test-Path "$c\bin\psql.exe") {
      $PostgresRoot = $c
      break
    }
  }

  if (-not $PostgresRoot) {
    try {
      $svc = Get-CimInstance Win32_Service -Filter "Name like '%postgres%'" -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($svc -and $svc.PathName) {
        $binDir = Split-Path ($svc.PathName -replace '"', '' -replace ' -.*$', '') -Parent
        $detectedRoot = Split-Path $binDir -Parent
        if (Test-Path "$detectedRoot\bin\psql.exe") {
          $PostgresRoot = $detectedRoot
        }
      }
    } catch {}
  }
}

if (-not $PostgresRoot -or -not (Test-Path "$PostgresRoot\bin\psql.exe")) {
  Write-Error "Could not locate PostgreSQL installation directory. Please run: .\scripts\reset-postgres-password.ps1 -PostgresRoot '<path-to-postgresql>'"
  exit 1
}

Write-Host "Found PostgreSQL at: $PostgresRoot"

$hbaFile = Join-Path $PostgresRoot "data\pg_hba.conf"
$psqlExe = Join-Path $PostgresRoot "bin\psql.exe"

if (-not (Test-Path $hbaFile)) {
  Write-Error "Could not find pg_hba.conf at '$hbaFile'."
  exit 1
}

# 2. Back up pg_hba.conf and temporarily enable trust authentication
Write-Host "1/6. Backing up pg_hba.conf and enabling temporary local trust authentication..."
if (-not (Test-Path "$hbaFile.bak")) {
  Copy-Item $hbaFile "$hbaFile.bak" -Force
}
$content = Get-Content $hbaFile -Raw
$newContent = $content -replace "scram-sha-256", "trust" -replace "md5", "trust"
Set-Content -Path $hbaFile -Value $newContent -NoNewline

# 3. Restart PostgreSQL service
Write-Host "2/6. Restarting PostgreSQL service '$PgServiceName'..."
Restart-Service -Name $PgServiceName -Force
Start-Sleep -Seconds 3

# 4. Reset postgres password and enable pgvector extension in clubmatch
Write-Host "3/6. Setting postgres password to '$NewPassword'..."
$sqlAlter = "ALTER USER postgres WITH PASSWORD '$NewPassword';"
& $psqlExe -U postgres -h localhost -c $sqlAlter

Write-Host "4/6. Ensuring 'clubmatch' database exists and enabling 'vector' extension..."
$dbExists = & $psqlExe -U postgres -h localhost -t -A -c "SELECT 1 FROM pg_database WHERE datname='clubmatch';"
if ($dbExists -notmatch "1") {
  Write-Host "Creating 'clubmatch' database..."
  & $psqlExe -U postgres -h localhost -c "CREATE DATABASE clubmatch;"
} else {
  Write-Host "Database 'clubmatch' already exists."
}

& $psqlExe -U postgres -h localhost -d clubmatch -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 5. Restore pg_hba.conf security and restart service
Write-Host "5/6. Restoring original pg_hba.conf and restarting PostgreSQL service..."
if (Test-Path "$hbaFile.bak") {
  Copy-Item "$hbaFile.bak" $hbaFile -Force
  Remove-Item "$hbaFile.bak" -Force
}
Restart-Service -Name $PgServiceName -Force
Start-Sleep -Seconds 2

# 6. Verify connection with new password
Write-Host "6/6. Verifying connection and pgvector extension..."
$env:PGPASSWORD = $NewPassword
& $psqlExe -U postgres -h localhost -d clubmatch -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
$env:PGPASSWORD = $null

# 7. Update .env file
$projectDir = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $projectDir ".env"
if (Test-Path $envFile) {
  $envContent = Get-Content $envFile -Raw
  $updatedEnv = $envContent -replace 'DATABASE_URL="postgresql://postgres:[^@]*@', "DATABASE_URL=`"postgresql://postgres:$NewPassword@"
  Set-Content -Path $envFile -Value $updatedEnv -NoNewline
  Write-Host "Updated DATABASE_URL in .env."
}

Write-Host ""
Write-Host "================================================================="
Write-Host " POSTGRESQL & PGVECTOR READY: Password is '$NewPassword'"
Write-Host " Now pushing Prisma schema, creating DBMS objects & seeding..."
Write-Host "================================================================="
Write-Host ""

Push-Location $projectDir
try {
  Write-Host ">> npx prisma db push..."
  & npx.cmd prisma db push

  Write-Host ">> Applying SQL views, triggers, indexes, and constraints..."
  & npm.cmd run db:setup-sql

  Write-Host ">> Seeding database with PES University clubs, events & users..."
  & npm.cmd run db:seed

  Write-Host ""
  Write-Host "================================================================="
  Write-Host " SUCCESS! Database is fully initialized and seeded!"
  Write-Host " Run 'npm run dev' to start the application."
  Write-Host "================================================================="
} finally {
  Pop-Location
}
