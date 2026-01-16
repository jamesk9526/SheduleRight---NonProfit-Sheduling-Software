#!/usr/bin/env pwsh
# ScheduleRight Auth Endpoints Automated Test Suite
# Run with: pwsh test-auth-endpoints.ps1

param(
    [string]$ApiUrl = "http://localhost:3001",
    [switch]$Verbose = $false
)

$global:TestsPassed = 0
$global:TestsFailed = 0
$global:Tokens = @{}

function Write-TestHeader {
    param([string]$Title)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Test-Auth {
    param(
        [string]$TestName,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body,
        [int]$ExpectedStatus,
        [string]$Token,
        [scriptblock]$Validator
    )

    Write-Host "`n📝 Testing: $TestName"
    Write-Host "   $Method $Endpoint"

    try {
        $uri = "$ApiUrl$Endpoint"
        $splat = @{
            Uri             = $uri
            Method          = $Method
            ContentType     = "application/json"
            ErrorAction     = "Stop"
            UseBasicParsing = $true
        }

        if ($Body) {
            $splat.Body = $Body | ConvertTo-Json
        }

        if ($Token) {
            $splat.Headers = @{ "Authorization" = "Bearer $Token" }
        }

        if ($Verbose) {
            Write-Host "   Request: $($splat | ConvertTo-Json -Depth 2)"
        }

        $response = Invoke-WebRequest @splat
        $status = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json

        if ($status -eq $ExpectedStatus) {
            Write-Host "   ✅ Status: $status (expected)" -ForegroundColor Green
            
            if ($Validator) {
                $result = & $Validator $content $response
                if ($result -eq $true) {
                    Write-Host "   ✅ Validation passed" -ForegroundColor Green
                    $global:TestsPassed++
                    return $content
                } else {
                    Write-Host "   ❌ Validation failed" -ForegroundColor Red
                    $global:TestsFailed++
                    return $null
                }
            } else {
                $global:TestsPassed++
                return $content
            }
        } else {
            Write-Host "   ❌ Status: $status (expected $ExpectedStatus)" -ForegroundColor Red
            $global:TestsFailed++
            return $null
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "   ✅ Status: $statusCode (expected)" -ForegroundColor Green
            
            try {
                $content = $_.Exception.Response.Content.ToString() | ConvertFrom-Json
                
                if ($Validator) {
                    $result = & $Validator $content $_.Exception.Response
                    if ($result -eq $true) {
                        Write-Host "   ✅ Validation passed" -ForegroundColor Green
                        $global:TestsPassed++
                        return $content
                    } else {
                        Write-Host "   ❌ Validation failed" -ForegroundColor Red
                        $global:TestsFailed++
                        return $null
                    }
                } else {
                    $global:TestsPassed++
                    return $content
                }
            } catch {
                Write-Host "   ✅ Expected error status received" -ForegroundColor Green
                $global:TestsPassed++
                return $null
            }
        } else {
            Write-Host "   ❌ Status: $statusCode (expected $ExpectedStatus)" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
            $global:TestsFailed++
            return $null
        }
    }
}

function CheckHealth {
    Write-TestHeader "Checking API Health"
    
    try {
        $response = Invoke-WebRequest "$ApiUrl/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ API is healthy" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ API is not responding at $ApiUrl" -ForegroundColor Red
        Write-Host "   Make sure: pnpm dev is running" -ForegroundColor Yellow
        Write-Host "   Make sure: CouchDB is running (docker-compose up -d)" -ForegroundColor Yellow
        Write-Host "   Make sure: Database is seeded (pnpm --filter=@scheduleright/server seed)" -ForegroundColor Yellow
        return $false
    }
}

function TestLoginFlow {
    Write-TestHeader "Login Flow Tests"
    
    # Test 1: Valid login (ADMIN)
    $loginResponse = Test-Auth `
        -TestName "Login with valid credentials (admin)" `
        -Method "POST" `
        -Endpoint "/api/v1/auth/login" `
        -Body @{
            email    = "admin@example.com"
            password = "admin123"
        } `
        -ExpectedStatus 200 `
        -Validator {
            param($content, $response)
            return $null -ne $content.accessToken -and $null -ne $content.refreshToken -and $content.user.email -eq "admin@example.com"
        }
    
    if ($loginResponse) {
        $global:Tokens.admin = @{
            accessToken  = $loginResponse.accessToken
            refreshToken = $loginResponse.refreshToken
            userId       = $loginResponse.user.id
            email        = $loginResponse.user.email
            roles        = $loginResponse.user.roles
        }
    }

    # Test 2: Valid login (STAFF)
    $staffLogin = Test-Auth `
        -TestName "Login with valid credentials (staff)" `
        -Method "POST" `
        -Endpoint "/api/v1/auth/login" `
        -Body @{
            email    = "staff@example.com"
            password = "staff123"
        } `
        -ExpectedStatus 200 `
        -Validator {
            param($content, $response)
            return $null -ne $content.accessToken -and $content.user.roles -contains "STAFF"
        }
    
    if ($staffLogin) {
        $global:Tokens.staff = @{
            accessToken  = $staffLogin.accessToken
            refreshToken = $staffLogin.refreshToken
        }
    }

    # Test 3: Invalid password
    Test-Auth `
        -TestName "Login with invalid password (rejected)" `
        -Method "POST" `
        -Endpoint "/api/v1/auth/login" `
        -Body @{
            email    = "admin@example.com"
            password = "wrongpassword"
        } `
        -ExpectedStatus 401 `
        -Validator {
            param($content, $response)
            return $content.error -like "*Invalid*"
        } | Out-Null

    # Test 4: Invalid email
    Test-Auth `
        -TestName "Login with non-existent email (rejected)" `
        -Method "POST" `
        -Endpoint "/api/v1/auth/login" `
        -Body @{
            email    = "nonexistent@example.com"
            password = "password123"
        } `
        -ExpectedStatus 401 | Out-Null

    # Test 5: Missing email validation
    Test-Auth `
        -TestName "Login with invalid email format (rejected)" `
        -Method "POST" `
        -Endpoint "/api/v1/auth/login" `
        -Body @{
            email    = "not-an-email"
            password = "password123"
        } `
        -ExpectedStatus 400 | Out-Null
}

function TestTokens {
    Write-TestHeader "Token Tests"
    
    if (-not $global:Tokens.admin) {
        Write-Host "⏭️  Skipping token tests (no admin token from login)" -ForegroundColor Yellow
        return
    }

    $adminToken = $global:Tokens.admin.accessToken

    # Test 6: Get current user with valid token
    Test-Auth `
        -TestName "Get current user with valid token" `
        -Method "GET" `
        -Endpoint "/api/v1/users/me" `
        -ExpectedStatus 200 `
        -Token $adminToken `
        -Validator {
            param($content, $response)
            return $content.email -eq "admin@example.com" -and $content.id -like "*admin*"
        } | Out-Null

    # Test 7: Access protected route without token
    Test-Auth `
        -TestName "Access protected route without token (rejected)" `
        -Method "GET" `
        -Endpoint "/api/v1/users/me" `
        -ExpectedStatus 401 | Out-Null

    # Test 8: Access protected route with invalid token
    Test-Auth `
        -TestName "Access protected route with invalid token (rejected)" `
        -Method "GET" `
        -Endpoint "/api/v1/users/me" `
        -ExpectedStatus 401 `
        -Token "invalid.token.here" | Out-Null

    # Test 9: Refresh token
    $refreshResponse = Test-Auth `
        -TestName "Refresh access token with valid refresh token" `
        -Method "POST" `
        -Endpoint "/api/v1/auth/refresh" `
        -Body @{
            refreshToken = $global:Tokens.admin.refreshToken
        } `
        -ExpectedStatus 200 `
        -Validator {
            param($content, $response)
            return $null -ne $content.accessToken -and $null -ne $content.refreshToken
        }
    
    if ($refreshResponse) {
        Write-Host "   💡 Tokens refreshed successfully" -ForegroundColor Cyan
    }

    # Test 10: Refresh with invalid token
    Test-Auth `
        -TestName "Refresh with invalid token (rejected)" `
        -Method "POST" `
        -Endpoint "/api/v1/auth/refresh" `
        -Body @{
            refreshToken = "invalid.refresh.token"
        } `
        -ExpectedStatus 401 | Out-Null

    # Test 11: Refresh without token
    Test-Auth `
        -TestName "Refresh without token (rejected)" `
        -Method "POST" `
        -Endpoint "/api/v1/auth/refresh" `
        -Body @{} `
        -ExpectedStatus 401 | Out-Null
}

function TestRoles {
    Write-TestHeader "Role-Based Access Tests"
    
    if (-not $global:Tokens.admin -or -not $global:Tokens.staff) {
        Write-Host "⏭️  Skipping role tests (missing tokens)" -ForegroundColor Yellow
        return
    }

    # Test with admin token
    $adminResponse = Test-Auth `
        -TestName "Admin can access /api/v1/users/me" `
        -Method "GET" `
        -Endpoint "/api/v1/users/me" `
        -ExpectedStatus 200 `
        -Token $global:Tokens.admin.accessToken `
        -Validator {
            param($content, $response)
            return $content.roles -contains "ADMIN"
        }

    # Test with staff token
    $staffResponse = Test-Auth `
        -TestName "Staff can access /api/v1/users/me" `
        -Method "GET" `
        -Endpoint "/api/v1/users/me" `
        -ExpectedStatus 200 `
        -Token $global:Tokens.staff.accessToken `
        -Validator {
            param($content, $response)
            return $content.roles -contains "STAFF"
        }
}

function TestLogout {
    Write-TestHeader "Logout Tests"
    
    # Test 12: Logout
    Test-Auth `
        -TestName "Logout clears session" `
        -Method "POST" `
        -Endpoint "/api/v1/auth/logout" `
        -ExpectedStatus 200 `
        -Validator {
            param($content, $response)
            return $content.message -like "*Logged out*" -or $content.message -like "*success*"
        } | Out-Null
}

function PrintSummary {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  Test Summary" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "  ✅ Passed: $($global:TestsPassed)" -ForegroundColor Green
    Write-Host "  ❌ Failed: $($global:TestsFailed)" -ForegroundColor $(if ($global:TestsFailed -eq 0) { "Green" } else { "Red" })
    Write-Host ""
    
    $total = $global:TestsPassed + $global:TestsFailed
    if ($global:TestsFailed -eq 0) {
        Write-Host "  🎉 All $total tests passed!" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $($global:TestsFailed) of $total tests failed" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================
# Main Test Execution
# ============================================================

Write-Host ""
Write-Host "🧪 ScheduleRight Auth Endpoints Test Suite" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl" -ForegroundColor Cyan
Write-Host ""

# Check health first
if (-not (CheckHealth)) {
    exit 1
}

# Run all test groups
TestLoginFlow
TestTokens
TestRoles
TestLogout

# Print summary
PrintSummary

# Exit with appropriate code
if ($global:TestsFailed -gt 0) {
    exit 1
}
exit 0
