$ErrorActionPreference = "Stop"

Write-Host "=========================================="
Write-Host " Phase 9: Verification Gates "
Write-Host "=========================================="

Write-Host "`n1. Running Typecheck..."
$env:DATABASE_URL="postgresql://dogfood:dogfoodpassword@127.0.0.1:5432/dogfood_db?schema=public"
$env:BETTER_AUTH_SECRET="test-secret-123"
$env:BETTER_AUTH_URL="http://127.0.0.1:3000"

cmd /c "npm run typecheck"
cmd /c "npm run typecheck:scripts"

Write-Host "`n2. Running Vitest Suite..."
cmd /c "npm run test -- --run"

Write-Host "`n3. Running Production Build..."
cmd /c "npm run build"

Write-Host "`n4. Provisioning Integration Environment (Docker Offline)..."
# Tear down any existing test environment
docker compose down -v
# Ensure isolated testing database
docker compose up -d db

Write-Host "`n5. Migrating and Seeding Fresh Database..."
cmd /c "npm run db:generate"
cmd /c "npm run db:deploy"
cmd /c "npm run db:seed"

Write-Host "`n6. Running Acceptance Config Setup..."
$env:DOGFOOD_BASE_URL="http://127.0.0.1:3000"
$env:DOGFOOD_CLAIMED_TIERS="T1,T2"

# Start the built app in background
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm start -- -H 127.0.0.1" -NoNewWindow -PassThru -RedirectStandardOutput "logfile"

# Wait for it to become ready
Write-Host "Waiting for Next.js to start..."
$retries = 30
$serverReady = $false
while ($retries -gt 0) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/events/evt_01" -UseBasicParsing
        if ($response.StatusCode -eq 200) { 
            $serverReady = $true
            break 
        }
    } catch {
        # ignore
    }
    Start-Sleep -Seconds 1
    $retries--
}

if (-not $serverReady) {
    Write-Error "Next.js server failed to start on 127.0.0.1:3000 within 30 seconds."
    exit 1
}

cmd /c "npm run assessment:config"

Write-Host "`n7. Running Official Checker Wrapper..."
python scripts/verify-acceptance.py .dogfood.toml --output acceptance-report.txt

Write-Host "`n8. Running Playwright E2E Matrix..."
cmd /c "npm run test:e2e:install"
cmd /c "npm run test:e2e"

Write-Host "`nVerification complete. Cleaning up..."
docker compose down -v
Write-Host "ALL GATES PASSED SUCCESSFULLY."
