<#
.SYNOPSIS
    Kill the process(es) listening on a given TCP port (default: 5000).

.EXAMPLE
    ./scripts/kill-port-5000.ps1
    ./scripts/kill-port-5000.ps1 -Port 5000
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateRange(1, 65535)]
    [int]$Port = 5000
)

Write-Host "Checking for processes using port ${Port}..."

$procIds = @()
$lines = @()

try {
    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($conns) {
            $procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
            $lines = $conns | ForEach-Object {
                "{0} {1}:{2} -> {3}:{4} {5} PID={6}" -f $_.State, $_.LocalAddress, $_.LocalPort, $_.RemoteAddress, $_.RemotePort, $_.AppliedSetting, $_.OwningProcess
            }
        }
    } else {
        # Fallback for older Windows / environments without Get-NetTCPConnection
        $netstatLines = netstat -ano -p TCP | Out-String -Stream
        # Match ':5000' followed by whitespace to avoid matching ':50000'
        $lines = $netstatLines | Where-Object { $_ -match ":$($Port)\s" }
        $procIds = $lines | ForEach-Object {
            if ($_ -match '\s+(\d+)\s*$') { [int]$matches[1] }
        } | Where-Object { $_ } | Select-Object -Unique
    }
} catch {
    Write-Host "Failed to detect connections for port ${Port}: $($_.Exception.Message)"
    $procIds = @()
}

if (-not $lines -or $lines.Count -eq 0) {
    Write-Host "No process found using port ${Port}"
    Write-Host "Done!"
    exit 0
}

Write-Host "Found process(es) using port ${Port}:"
$lines | ForEach-Object { Write-Host $_ }

if (-not $procIds -or $procIds.Count -eq 0) {
    Write-Host "Could not extract PID(s) from connection data."
    Write-Host "Done!"
    exit 1
}

foreach ($procId in $procIds) {
    $procName = $null
    try { $procName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName } catch {}
    $label = if ($procName) { "${procId} (${procName})" } else { "${procId}" }

    Write-Host "Killing process ${label}..."
    try {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Host "Successfully killed process ${label}"
    } catch {
        # Fallback to taskkill for cases where Stop-Process doesn't have permission details
        taskkill /PID $procId /F | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully killed process ${label}"
        } else {
            Write-Host "Failed to kill process ${label} (may require admin privileges)"
        }
    }
}

Write-Host "Done!"
