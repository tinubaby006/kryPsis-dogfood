$ErrorActionPreference = "Stop"

Write-Host "Tearing down existing containers and volumes..."
docker-compose -f docker-compose.yml down -v

Write-Host "Starting offline assessment harness..."
$env:ASSESSMENT_MODE = "1"
docker-compose -f docker-compose.yml up -d

Write-Host "Waiting for app container to report health..."
$appId = docker-compose ps -q app
$timeout = 60
while ($timeout -gt 0) {
    $status = docker inspect -f '{{.State.Health.Status}}' $appId 2>$null
    if ($status -eq "healthy") {
        break
    }
    Start-Sleep -Seconds 2
    $timeout -= 2
}

if ($timeout -le 0) {
    Write-Host "ERROR: Timeout waiting for app to become healthy."
    docker logs $appId
    exit 1
}

Write-Host "App is healthy. Assessment harness ready."
