$ErrorActionPreference = "Continue"
Write-Host "--- RUNNING INFRASTRUCTURE HEALTH PROBES ---" -ForegroundColor Cyan

$db = docker exec postgres-db psql -U postgres -d web3_automation -t -c "SELECT count(*) FROM information_schema.schemata WHERE schema_name IN ('secops', 'subsync', 'agentic_guard');" 2>$null
if ($db -and $db.Trim() -eq "3") { 
    Write-Host " [PASS] PostgreSQL Schemas Initialized" -ForegroundColor Green 
} else { 
    Write-Host " [FAIL] PostgreSQL Unhealthy" -ForegroundColor Red 
}

try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 3
    if ($res.result) { Write-Host " [PASS] Local Anvil Node (Block: $($res.result))" -ForegroundColor Green }
} catch { 
    Write-Host " [FAIL] Anvil Unreachable" -ForegroundColor Red 
}

try {
    $p = Invoke-RestMethod -Uri "http://127.0.0.1:3000/health" -Method Get -TimeoutSec 3
    if ($p.status -eq "OK") { Write-Host " [PASS] Signing Proxy Active" -ForegroundColor Green }
} catch { 
    Write-Host " [FAIL] Signing Proxy Unreachable" -ForegroundColor Red 
}

try {
    $s = Invoke-RestMethod -Uri "http://127.0.0.1:8080/health" -Method Get -TimeoutSec 3
    if ($s.status -eq "OK") { Write-Host " [PASS] Mock Webhook Sink Active" -ForegroundColor Green }
} catch { 
    Write-Host " [FAIL] Webhook Sink Unreachable" -ForegroundColor Red 
}
