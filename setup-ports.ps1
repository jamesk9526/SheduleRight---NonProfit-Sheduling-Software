# ScheduleRight - Port Configuration Setup Script
# This script helps configure all service ports during first-time setup
# Supports Windows PowerShell and PowerShell Core

param(
    [int]$ServerPort = 5710,
    [int]$WebPort = 5711,
    [int]$EmbedPort = 5712,
    [int]$CouchDbPort = 5713,
    [int]$RedisPort = 5714,
    [switch]$Interactive = $false,
    [switch]$UseDefaults = $false
)

# Color output for better readability
function Write-Header {
    param([string]$Message)
    Write-Host "`n$('=' * 60)" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Blue
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Test-Port {
    param([int]$Port)
    
    $tcpConnection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    return $tcpConnection.TcpTestSucceeded
}

function Get-InteractivePort {
    param(
        [string]$ServiceName,
        [int]$DefaultPort,
        [int]$MinPort = 5000,
        [int]$MaxPort = 65535
    )
    
    while ($true) {
        Write-Host "`nEnter port for $ServiceName (default: $DefaultPort): " -NoNewline -ForegroundColor Yellow
        $input = Read-Host
        
        if ([string]::IsNullOrWhiteSpace($input)) {
            return $DefaultPort
        }
        
        if ([int]::TryParse($input, [ref]$null)) {
            $port = [int]$input
            if ($port -ge $MinPort -and $port -le $MaxPort) {
                if (Test-Port -Port $port) {
                    Write-Error "Port $port is already in use. Please choose another port."
                    continue
                }
                return $port
            }
            else {
                Write-Error "Port must be between $MinPort and $MaxPort"
                continue
            }
        }
        else {
            Write-Error "Please enter a valid port number"
            continue
        }
    }
}

function Update-EnvFile {
    param(
        [string]$FilePath,
        [hashtable]$PortConfig
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-Error "File not found: $FilePath"
        return $false
    }
    
    try {
        $content = Get-Content $FilePath -Raw
        
        # Update SERVER_PORT
        $content = $content -replace 'SERVER_PORT=\d+', "SERVER_PORT=$($PortConfig['ServerPort'])"
        $content = $content -replace 'SERVER_URL=http://localhost:\d+', "SERVER_URL=http://localhost:$($PortConfig['ServerPort'])"
        
        # Update COUCHDB_URL
        $content = $content -replace 'COUCHDB_URL=http://localhost:\d+', "COUCHDB_URL=http://localhost:$($PortConfig['CouchDbPort'])"
        
        # Update REDIS_URL
        $content = $content -replace 'REDIS_URL=redis://localhost:\d+', "REDIS_URL=redis://localhost:$($PortConfig['RedisPort'])"
        
        # Update CORS_ORIGIN
        $corsOrigins = "http://localhost:$($PortConfig['WebPort']),http://localhost:$($PortConfig['ServerPort']),http://localhost:$($PortConfig['EmbedPort'])"
        $content = $content -replace 'CORS_ORIGIN=.*', "CORS_ORIGIN=$corsOrigins"
        
        Set-Content $FilePath $content -Encoding UTF8
        return $true
    }
    catch {
        Write-Error "Failed to update $FilePath : $_"
        return $false
    }
}

function Update-DockerCompose {
    param(
        [string]$FilePath,
        [hashtable]$PortConfig
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-Info "Docker Compose file not found: $FilePath (skipping)"
        return $true
    }
    
    try {
        $content = Get-Content $FilePath -Raw
        
        # Update CouchDB ports
        $content = $content -replace '"5984:5984"', "`"$($PortConfig['CouchDbPort']):$($PortConfig['CouchDbPort'])`""
        $content = $content -replace "'5984:5984'", "'$($PortConfig['CouchDbPort']):$($PortConfig['CouchDbPort'])'"
        $content = $content -replace 'localhost:5984', "localhost:$($PortConfig['CouchDbPort'])"
        
        # Update Redis ports
        $content = $content -replace '"6379:6379"', "`"$($PortConfig['RedisPort']):$($PortConfig['RedisPort'])`""
        $content = $content -replace "'6379:6379'", "'$($PortConfig['RedisPort']):$($PortConfig['RedisPort'])'"
        
        Set-Content $FilePath $content -Encoding UTF8
        return $true
    }
    catch {
        Write-Error "Failed to update Docker Compose file: $_"
        return $false
    }
}

# Main script execution
function Main {
    Write-Header "ScheduleRight - Port Configuration Setup"
    
    Write-Info "This script configures service ports for your ScheduleRight installation."
    Write-Info "Default configuration uses ports 5710-5715."
    
    $portConfig = @{
        'ServerPort' = $ServerPort
        'WebPort' = $WebPort
        'EmbedPort' = $EmbedPort
        'CouchDbPort' = $CouchDbPort
        'RedisPort' = $RedisPort
    }
    
    # Get interactive input if not using defaults
    if ($Interactive -and -not $UseDefaults) {
        Write-Header "Port Configuration"
        Write-Info "Leave blank to accept defaults"
        
        $portConfig['ServerPort'] = Get-InteractivePort -ServiceName "Node.js Server (API)" -DefaultPort $ServerPort
        $portConfig['WebPort'] = Get-InteractivePort -ServiceName "Web App (UI)" -DefaultPort $WebPort
        $portConfig['EmbedPort'] = Get-InteractivePort -ServiceName "Embed Widget" -DefaultPort $EmbedPort
        $portConfig['CouchDbPort'] = Get-InteractivePort -ServiceName "CouchDB" -DefaultPort $CouchDbPort
        $portConfig['RedisPort'] = Get-InteractivePort -ServiceName "Redis" -DefaultPort $RedisPort
    }
    
    Write-Header "Port Configuration Summary"
    Write-Host "Node.js Server (API):  localhost:$($portConfig['ServerPort'])" -ForegroundColor Green
    Write-Host "Web App (UI):          localhost:$($portConfig['WebPort'])" -ForegroundColor Green
    Write-Host "Embed Widget:          localhost:$($portConfig['EmbedPort'])" -ForegroundColor Green
    Write-Host "CouchDB:               localhost:$($portConfig['CouchDbPort'])" -ForegroundColor Green
    Write-Host "Redis:                 localhost:$($portConfig['RedisPort'])" -ForegroundColor Green
    
    Write-Header "Updating Configuration Files"
    
    $files = @(
        @{
            Path = "apps/server/.env"
            Type = "env"
        },
        @{
            Path = "docker-compose.yml"
            Type = "docker"
        },
        @{
            Path = "infra/docker-compose.yml"
            Type = "docker"
        }
    )
    
    $successCount = 0
    $failCount = 0
    
    foreach ($file in $files) {
        $fullPath = Join-Path $PSScriptRoot $file.Path
        
        if ($file.Type -eq "env") {
            if (Update-EnvFile -FilePath $fullPath -PortConfig $portConfig) {
                Write-Success "Updated $($file.Path)"
                $successCount++
            }
            else {
                $failCount++
            }
        }
        elseif ($file.Type -eq "docker") {
            if (Update-DockerCompose -FilePath $fullPath -PortConfig $portConfig) {
                Write-Success "Updated $($file.Path)"
                $successCount++
            }
            else {
                $failCount++
            }
        }
    }
    
    Write-Header "Setup Complete"
    Write-Host "Successfully updated: $successCount files" -ForegroundColor Green
    if ($failCount -gt 0) {
        Write-Host "Failed to update: $failCount files" -ForegroundColor Yellow
    }
    
    Write-Info "Next steps:"
    Write-Info "1. Start services: pnpm dev"
    Write-Info "2. Access web app: http://localhost:$($portConfig['WebPort'])"
    Write-Info "3. Access API: http://localhost:$($portConfig['ServerPort'])/health"
    Write-Info "4. Initialize DB: http://localhost:$($portConfig['ServerPort'])/api/v1/bootstrap"
    
    Write-Host ""
}

# Run main script
Main
