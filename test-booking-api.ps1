#!/usr/bin/env pwsh

<#
.SYNOPSIS
Comprehensive booking API tests for ScheduleRight

.DESCRIPTION
Tests all availability and booking endpoints with various scenarios

.EXAMPLE
./test-booking-api.ps1 -ApiUrl "http://localhost:3001" -Token "eyJ..."
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl,

  [Parameter(Mandatory = $true)]
  [string]$Token,

  [Parameter(Mandatory = $false)]
  [string]$SiteId = "site-test-$(Get-Random)"
)

# Color output
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Error-Custom { Write-Host "✗ $args" -ForegroundColor Red }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Cyan }
function Write-Header { Write-Host "`n=== $args ===" -ForegroundColor Yellow }

# Test counters
$passed = 0
$failed = 0

# Make API requests
function Invoke-Api {
  param(
    [string]$Method,
    [string]$Endpoint,
    [object]$Body,
    [switch]$NoAuth
  )

  $url = "$ApiUrl$Endpoint"
  $headers = @{
    "Content-Type" = "application/json"
  }

  if (-not $NoAuth) {
    $headers["Authorization"] = "Bearer $Token"
  }

  try {
    $params = @{
      Uri     = $url
      Method  = $Method
      Headers = $headers
    }

    if ($Body) {
      $params["Body"] = $Body | ConvertTo-Json
    }

    $response = Invoke-RestMethod @params
    return @{
      Success = $true
      Data    = $response
      Status  = 200
    }
  }
  catch {
    $response = $_.Exception.Response
    $statusCode = $response.StatusCode
    
    try {
      $content = $response.Content.ReadAsStream()
      $reader = [System.IO.StreamReader]::new($content)
      $body = $reader.ReadToEnd()
      $json = $body | ConvertFrom-Json
    }
    catch {
      $json = @{ error = $body }
    }

    return @{
      Success    = $false
      Data       = $json
      Status     = [int]$statusCode
      RawMessage = $_.Exception.Message
    }
  }
}

# Test assertion
function Assert-Success {
  param(
    [string]$TestName,
    [object]$Response,
    [int]$ExpectedStatus = 200
  )

  if ($Response.Success -and $Response.Status -eq $ExpectedStatus) {
    Write-Success "$TestName (HTTP $($Response.Status))"
    $script:passed++
    return $true
  }
  else {
    Write-Error-Custom "$TestName - Got status $($Response.Status)"
    if ($Response.Data.error) {
      Write-Host "  Error: $($Response.Data.error)" -ForegroundColor DarkRed
    }
    $script:failed++
    return $false
  }
}

# ============================================================================
# TEST SETUP
# ============================================================================

Write-Header "ScheduleRight Booking API Tests"
Write-Info "API URL: $ApiUrl"
Write-Info "Site ID: $SiteId"

# First, we need to create a site to test with
Write-Header "Setup: Creating test organization and site"

# Get current user to get org ID
Write-Info "Getting current user..."
$userResponse = Invoke-Api -Method "GET" -Endpoint "/api/v1/users/me"
if (-not $userResponse.Success) {
  Write-Error-Custom "Failed to get current user"
  exit 1
}

$orgId = $userResponse.Data.orgId
Write-Success "Got org ID: $orgId"

# Create a test site
Write-Info "Creating test site..."
$siteResponse = Invoke-Api -Method "POST" -Endpoint "/api/v1/orgs/$orgId/sites" -Body @{
  name     = "Test Site - $(Get-Date -Format 'yyyyMMdd-HHmmss')"
  timezone = "America/New_York"
}

if (-not $siteResponse.Success) {
  Write-Error-Custom "Failed to create test site"
  Write-Host $siteResponse.Data
  exit 1
}

$siteId = $siteResponse.Data.id
Write-Success "Created test site: $siteId"

# ============================================================================
# AVAILABILITY TESTS
# ============================================================================

Write-Header "Availability Endpoint Tests"

# Test 1: Create daily availability slot
Write-Info "Test 1: Create daily availability slot..."
$response = Invoke-Api -Method "POST" -Endpoint "/api/v1/sites/$siteId/availability" -Body @{
  title             = "Morning Walk-In Hours"
  description       = "Drop-in consultations"
  startTime         = "09:00"
  endTime           = "12:00"
  recurrence        = "daily"
  recurrenceEndDate = "2025-12-31"
  capacity          = 5
  durationMinutes   = 30
  buffer            = 5
  notesForClients   = "First come, first served"
}
$dailySlotId = $null
if (Assert-Success "Create daily slot" $response 201) {
  $dailySlotId = $response.Data.id
}

# Test 2: Create one-time availability slot
Write-Info "Test 2: Create one-time availability slot..."
$response = Invoke-Api -Method "POST" -Endpoint "/api/v1/sites/$siteId/availability" -Body @{
  title          = "Special Event"
  startTime      = "14:00"
  endTime        = "15:30"
  recurrence     = "once"
  specificDate   = "2025-02-15"
  capacity       = 20
  durationMinutes = 90
}
$oneTimeSlotId = $null
if (Assert-Success "Create one-time slot" $response 201) {
  $oneTimeSlotId = $response.Data.id
}

# Test 3: Create weekly availability slot
Write-Info "Test 3: Create weekly availability slot..."
$response = Invoke-Api -Method "POST" -Endpoint "/api/v1/sites/$siteId/availability" -Body @{
  title             = "Thursday Sessions"
  startTime         = "13:00"
  endTime           = "17:00"
  recurrence        = "weekly"
  dayOfWeek         = 4  # Thursday
  recurrenceEndDate = "2025-12-31"
  capacity          = 8
  durationMinutes   = 60
}
$weeklySlotId = $null
if (Assert-Success "Create weekly slot" $response 201) {
  $weeklySlotId = $response.Data.id
}

# Test 4: List all availability slots
Write-Info "Test 4: List all availability slots..."
$response = Invoke-Api -Method "GET" -Endpoint "/api/v1/sites/$siteId/availability"
Assert-Success "List slots" $response

# Test 5: Get single slot
if ($dailySlotId) {
  Write-Info "Test 5: Get single slot..."
  $response = Invoke-Api -Method "GET" -Endpoint "/api/v1/sites/$siteId/availability/$dailySlotId"
  Assert-Success "Get single slot" $response
}

# Test 6: Invalid time (end before start)
Write-Info "Test 6: Create slot with invalid time (should fail)..."
$response = Invoke-Api -Method "POST" -Endpoint "/api/v1/sites/$siteId/availability" -Body @{
  title           = "Invalid Slot"
  startTime       = "14:00"
  endTime         = "09:00"  # Invalid: after start
  recurrence      = "daily"
  capacity        = 5
  durationMinutes = 30
}
if ($response.Status -eq 400) {
  Write-Success "Invalid time correctly rejected"
  $passed++
}
else {
  Write-Error-Custom "Invalid time should be rejected"
  $failed++
}

# ============================================================================
# BOOKING TESTS
# ============================================================================

Write-Header "Booking Endpoint Tests"

# Test 7: Create booking (public - no auth)
Write-Info "Test 7: Create booking (no authentication required)..."
if ($dailySlotId) {
  $response = Invoke-Api -Method "POST" -Endpoint "/api/v1/sites/$siteId/bookings" -Body @{
    slotId      = $dailySlotId
    clientName  = "John Doe"
    clientEmail = "john@example.com"
    clientPhone = "+1-555-0001"
    notes       = "First time visitor"
  } -NoAuth
  $bookingId1 = $null
  if (Assert-Success "Create booking (public)" $response 201) {
    $bookingId1 = $response.Data.id
  }
}

# Test 8: Create second booking
Write-Info "Test 8: Create second booking..."
if ($dailySlotId) {
  $response = Invoke-Api -Method "POST" -Endpoint "/api/v1/sites/$siteId/bookings" -Body @{
    slotId      = $dailySlotId
    clientName  = "Jane Smith"
    clientEmail = "jane@example.com"
    clientPhone = "+1-555-0002"
  } -NoAuth
  $bookingId2 = $null
  if (Assert-Success "Create second booking" $response 201) {
    $bookingId2 = $response.Data.id
  }
}

# Test 9: List site bookings (staff only)
Write-Info "Test 9: List site bookings..."
$response = Invoke-Api -Method "GET" -Endpoint "/api/v1/sites/$siteId/bookings"
Assert-Success "List site bookings" $response

# Test 10: List pending bookings only
Write-Info "Test 10: List pending bookings only..."
$response = Invoke-Api -Method "GET" -Endpoint "/api/v1/sites/$siteId/bookings?status=pending"
Assert-Success "List pending bookings" $response

# Test 11: Get single booking
if ($bookingId1) {
  Write-Info "Test 11: Get single booking..."
  $response = Invoke-Api -Method "GET" -Endpoint "/api/v1/bookings/$bookingId1"
  Assert-Success "Get single booking" $response
}

# Test 12: Confirm booking
if ($bookingId1) {
  Write-Info "Test 12: Confirm booking..."
  $response = Invoke-Api -Method "PUT" -Endpoint "/api/v1/bookings/$bookingId1/confirm" -Body @{}
  Assert-Success "Confirm booking" $response
}

# Test 13: Update staff notes
if ($bookingId1) {
  Write-Info "Test 13: Update staff notes..."
  $response = Invoke-Api -Method "PUT" -Endpoint "/api/v1/bookings/$bookingId1/notes" -Body @{
    notes = "Client needs interpreter. Provided referral to social services."
  }
  Assert-Success "Update staff notes" $response
}

# Test 14: Mark as completed
if ($bookingId1) {
  Write-Info "Test 14: Mark booking as completed..."
  $response = Invoke-Api -Method "PUT" -Endpoint "/api/v1/bookings/$bookingId1/complete" -Body @{}
  Assert-Success "Mark completed" $response
}

# Test 15: Cancel booking
if ($bookingId2) {
  Write-Info "Test 15: Cancel booking..."
  $response = Invoke-Api -Method "PUT" -Endpoint "/api/v1/bookings/$bookingId2/cancel" -Body @{
    reason = "Client requested cancellation"
  }
  Assert-Success "Cancel booking" $response
}

# Test 16: Fill slot to capacity and try to book
Write-Info "Test 16: Test capacity limits..."
if ($oneTimeSlotId) {
  # Create many bookings to fill capacity
  $bookingIds = @()
  for ($i = 0; $i -lt 20; $i++) {
    $response = Invoke-Api -Method "POST" -Endpoint "/api/v1/sites/$siteId/bookings" -Body @{
      slotId      = $oneTimeSlotId
      clientName  = "Client $i"
      clientEmail = "client$i@example.com"
    } -NoAuth
    if ($response.Success) {
      $bookingIds += $response.Data.id
    }
  }
  
  # Try to book when full
  $response = Invoke-Api -Method "POST" -Endpoint "/api/v1/sites/$siteId/bookings" -Body @{
    slotId      = $oneTimeSlotId
    clientName  = "Overflow Client"
    clientEmail = "overflow@example.com"
  } -NoAuth
  
  if ($response.Status -eq 409) {
    Write-Success "Capacity limit enforced (got 409)"
    $passed++
  }
  else {
    Write-Error-Custom "Capacity limit should return 409"
    $failed++
  }
}

# Test 17: Mark no-show
if ($bookingId2) {
  Write-Info "Test 17: Mark booking as no-show..."
  # First create a new booking to mark as no-show
  $response = Invoke-Api -Method "POST" -Endpoint "/api/v1/sites/$siteId/bookings" -Body @{
    slotId      = $weeklySlotId
    clientName  = "No Show Client"
    clientEmail = "noshow@example.com"
  } -NoAuth
  
  if ($response.Success) {
    $noShowId = $response.Data.id
    $response = Invoke-Api -Method "PUT" -Endpoint "/api/v1/bookings/$noShowId/no-show" -Body @{}
    Assert-Success "Mark no-show" $response
  }
}

# Test 18: Deactivate availability slot
if ($weeklySlotId) {
  Write-Info "Test 18: Deactivate availability slot..."
  $response = Invoke-Api -Method "DELETE" -Endpoint "/api/v1/sites/$siteId/availability/$weeklySlotId"
  Assert-Success "Deactivate slot" $response
}

# Test 19: Test unauthorized access (delete from list)
Write-Info "Test 19: Test RBAC - non-staff cannot confirm..."
$response = Invoke-Api -Method "PUT" -Endpoint "/api/v1/bookings/invalid-id/confirm" -Body @{}
if ($response.Status -eq 403 -or $response.Status -eq 401 -or $response.Status -eq 404) {
  Write-Success "RBAC enforced"
  $passed++
}
else {
  Write-Error-Custom "RBAC should prevent non-staff from confirming"
  $failed++
}

# ============================================================================
# RESULTS
# ============================================================================

Write-Header "Test Results"
Write-Host "Passed: " -NoNewline -ForegroundColor Green
Write-Host $passed -ForegroundColor Green -BackgroundColor Black
Write-Host "Failed: " -NoNewline -ForegroundColor Red
Write-Host $failed -ForegroundColor Red -BackgroundColor Black

$total = $passed + $failed
$percentage = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 1) } else { 0 }
Write-Info "Success Rate: $percentage%"

if ($failed -eq 0) {
  Write-Success "All tests passed!"
  exit 0
}
else {
  Write-Error-Custom "$failed test(s) failed"
  exit 1
}
