# Refined API Test Script including RBAC Validation
$BaseUrl = "http://localhost:5000/api"

Write-Host "Running RBAC & Business Rules Integration Tests..." -ForegroundColor Cyan

# Helper to check response status and execute blocks
function Test-Endpoint {
    param(
        [string]$TestName,
        [string]$Path,
        [string]$Method = "GET",
        [Object]$Body = $null,
        [string]$Token = $null,
        [int]$ExpectedStatus = 200
    )
    
    $headers = @{}
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    $jsonBody = $null
    if ($Body) {
        $jsonBody = $Body | ConvertTo-Json -Depth 5
    }

    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/$Path" -Method $Method -Headers $headers -Body $jsonBody -ContentType "application/json" -UseBasicParsing
        $status = $response.StatusCode
        if ($status -eq $ExpectedStatus) {
            Write-Host "SUCCESS: $TestName (Status $status)" -ForegroundColor Green
            return $response.Content | ConvertFrom-Json
        } else {
            Write-Host "FAIL: $TestName (Expected $ExpectedStatus, got $status)" -ForegroundColor Red
            return $null
        }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq $ExpectedStatus) {
            Write-Host "SUCCESS: $TestName (Caught expected status $ExpectedStatus)" -ForegroundColor Green
        } else {
            Write-Host "FAIL: $TestName (Expected $ExpectedStatus, got $status)" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Yellow
        }
        return $null
    }
}

# 1. Login Cases
$aliceToken = "mock-jwt-token-for-alice"
$bobToken = "mock-jwt-token-for-bob"
$charlieToken = "mock-jwt-token-for-agent_charlie"
$eveToken = "mock-jwt-token-for-manager_eve"

$loginAlice = Test-Endpoint "Login Alice" "auth/login" "POST" @{ username = "alice"; password = "password" } $null 200
$loginBad = Test-Endpoint "Login Bad Password" "auth/login" "POST" @{ username = "alice"; password = "wrong_password" } $null 401

# 2. Authentication Guards
Test-Endpoint "List Tickets - Unauthenticated" "tickets" "GET" $null $null 401

# 3. RBAC Listings
$aliceTickets = Test-Endpoint "List Tickets - Alice (Customer)" "tickets" "GET" $null $aliceToken 200
$charlieTickets = Test-Endpoint "List Tickets - Charlie (Agent)" "tickets" "GET" $null $charlieToken 200

# 4. RBAC Ticket Details Isolation
# Alice details (should succeed for TKT-1001)
$aliceDetail = Test-Endpoint "Get Details TKT-1001 - Alice (Owner)" "tickets/TKT-1001" "GET" $null $aliceToken 200

# Bob details (should be Forbidden for TKT-1001)
Test-Endpoint "Get Details TKT-1001 - Bob (Non-Owner)" "tickets/TKT-1001" "GET" $null $bobToken 403

# Charlie details (should succeed since he is agent)
$charlieDetail = Test-Endpoint "Get Details TKT-1001 - Charlie (Agent)" "tickets/TKT-1001" "GET" $null $charlieToken 200

# Verify message redactions: Alice detail should not see isInternal messages
$aliceNotesCount = @($aliceDetail.messages | Where-Object { $_.isInternal -eq $true }).Count
$charlieNotesCount = @($charlieDetail.messages | Where-Object { $_.isInternal -eq $true }).Count

if ($aliceNotesCount -eq 0 -and $charlieNotesCount -gt 0) {
    Write-Host "SUCCESS: Internal notes redacted for Customer, visible to Agent" -ForegroundColor Green
} else {
    Write-Host "FAIL: Note redaction verification failed (Alice notes: $aliceNotesCount, Charlie notes: $charlieNotesCount)" -ForegroundColor Red
}

# 5. POST Notes Rules
# Customer posting note (forbidden)
Test-Endpoint "Post Internal Note - Alice (Forbidden)" "tickets/TKT-1001/notes" "POST" @{ content = "Should fail" } $aliceToken 403

# Agent posting note (success)
$noteRes = Test-Endpoint "Post Internal Note - Charlie (Success)" "tickets/TKT-1001/notes" "POST" @{ content = "Agent check log 999" } $charlieToken 200

# 6. Ticket Submission Validation
Test-Endpoint "Submit Ticket - Empty Body" "tickets" "POST" @{} $aliceToken 400
Test-Endpoint "Submit Ticket - Agent (Forbidden)" "tickets" "POST" @{ title = "Valid Title"; description = "Valid length description text here"; category = "Billing"; urgency = "High" } $charlieToken 403

$newTicket = Test-Endpoint "Submit Ticket - Alice (Success)" "tickets" "POST" @{
    title = "Billing issue again"
    description = "I have another invoice concern with my account billing details"
    category = "Billing"
    urgency = "Medium"
} $aliceToken 201

# 7. Assignment Logic
# Agent Charlie claims ticket
$claimRes = Test-Endpoint "Claim Ticket - Charlie" "tickets/$($newTicket.id)" "PATCH" @{ assignedTo = "agent_1" } $charlieToken 200

# Agent Charlie tries to assign it to Diana (forbidden)
Test-Endpoint "Reassign to Agent 2 - Charlie (Forbidden)" "tickets/$($newTicket.id)" "PATCH" @{ assignedTo = "agent_2" } $charlieToken 403

# Manager Eve reassigns to Diana (success)
$reassignRes = Test-Endpoint "Reassign to Agent 2 - Eve (Manager)" "tickets/$($newTicket.id)" "PATCH" @{ assignedTo = "agent_2" } $eveToken 200

# 8. Resolution and Reopening State Machine
# Resolve without summary (should fail)
Test-Endpoint "Resolve Ticket - No Summary (Failure)" "tickets/$($newTicket.id)" "PATCH" @{ status = "resolved" } $charlieToken 400

# Resolve with summary (success)
$resolveRes = Test-Endpoint "Resolve Ticket - With Summary (Success)" "tickets/$($newTicket.id)" "PATCH" @{
    status = "resolved"
    resolutionSummary = "Charge reversed and adjusted on standard invoice ledger."
} $charlieToken 200

if ($resolveRes.status -eq "resolved" -and $resolveRes.resolutionSummary -eq "Charge reversed and adjusted on standard invoice ledger.") {
    Write-Host "SUCCESS: Resolution status and summary confirmed" -ForegroundColor Green
} else {
    Write-Host "FAIL: Ticket resolution mismatch" -ForegroundColor Red
}

# Reopen Ticket via customer reply (success)
$replyRes = Test-Endpoint "Customer Reply to Resolved Ticket (Auto-Reopen)" "tickets/$($newTicket.id)/messages" "POST" @{
    content = "Wait, it still shows pending on my online banking."
} $aliceToken 200

# Get ticket detail again to confirm status
$ticketDetail = Test-Endpoint "Get Ticket Status after reply" "tickets/$($newTicket.id)" "GET" $null $aliceToken 200
if ($ticketDetail.status -eq "requires_attention") {
    Write-Host "SUCCESS: Ticket automatically reverted to requires_attention on customer reply" -ForegroundColor Green
} else {
    Write-Host "FAIL: Ticket status is still $($ticketDetail.status)" -ForegroundColor Red
}

Write-Host "RBAC & Business Rules Tests Complete!" -ForegroundColor Cyan
