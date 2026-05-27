param(
  [int]$IntervalSeconds = 30
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $root ".env"
$logPath = Join-Path $root "connection-monitor.log"
$pidPath = Join-Path $root "connection-monitor.pid"
$stopPath = Join-Path $root "connection-monitor.stop"

function Read-EnvValue {
  param([string]$Name)

  if (-not (Test-Path $envPath)) {
    return $null
  }

  $line = Get-Content $envPath | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  return ($line -split "=", 2)[1].Trim()
}

if (Test-Path $stopPath) {
  Remove-Item $stopPath -Force
}

Set-Content -Path $pidPath -Value $PID

try {
  while ($true) {
    if (Test-Path $stopPath) {
      break
    }

    $entry = [ordered]@{
      ts = (Get-Date).ToString("o")
    }

    try {
      $token = Read-EnvValue -Name "BOT_TOKEN"
      if ($token) {
        $webhook = (Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo" -Method Get -TimeoutSec 15).result
        $entry.telegram_pending = $webhook.pending_update_count
        $entry.telegram_last_error = $webhook.last_error_message
        $entry.telegram_ip = $webhook.ip_address
        $entry.telegram_error_time_utc = if ($webhook.last_error_date) {
          [DateTimeOffset]::FromUnixTimeSeconds([int64]$webhook.last_error_date).ToUniversalTime().ToString("o")
        } else {
          $null
        }
      } else {
        $entry.telegram_error = "BOT_TOKEN missing in .env"
      }
    } catch {
      $entry.telegram_error = $_.Exception.Message
    }

    try {
      $localHealth = Invoke-WebRequest -Uri "http://127.0.0.1:8081/health" -UseBasicParsing -TimeoutSec 8
      $entry.local_health_status = $localHealth.StatusCode
      $entry.local_health_body = $localHealth.Content
    } catch {
      $entry.local_health_error = $_.Exception.Message
    }

    try {
      $publicHealth = Invoke-WebRequest -Uri "https://webhook.xseries.site/health" -UseBasicParsing -TimeoutSec 8
      $entry.public_health_status = $publicHealth.StatusCode
      $entry.public_health_body = $publicHealth.Content
    } catch {
      $entry.public_health_error = $_.Exception.Message
    }

    Add-Content -Path $logPath -Value ($entry | ConvertTo-Json -Compress)
    Start-Sleep -Seconds $IntervalSeconds
  }
} finally {
  Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
}

