# PowerShell script to kill process using port 5000
Write-Host "Checking for processes using port 5000..."

$port = 5000
$connections = netstat -ano | findstr ":$port"

if ($connections) {
    Write-Host "Found process(es) using port $port:"
    Write-Host $connections
    
    # Extract PID from netstat output
    $pids = $connections | ForEach-Object {
        if ($_ -match '\s+(\d+)$') {
            $matches[1]
        }
    } | Select-Object -Unique
    
    foreach ($pid in $pids) {
        Write-Host "Killing process $pid..."
        taskkill /PID $pid /F
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully killed process $pid"
        } else {
            Write-Host "Failed to kill process $pid (may require admin privileges)"
        }
    }
} else {
    Write-Host "No process found using port $port"
}

Write-Host "Done!"
