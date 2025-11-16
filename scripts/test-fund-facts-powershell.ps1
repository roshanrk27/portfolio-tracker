# PowerShell test script for Fund Facts (No jq required)
# Usage: .\scripts\test-fund-facts-powershell.ps1 [FUND_ID]

param(
    [string]$FundId = "120437",
    [string]$ApiKey = $env:AI_COACH_API_KEY,
    [string]$BaseUrl = $env:NEXTJS_BASE_URL
)

if (-not $ApiKey) {
    $ApiKey = "test_api_key_12345_change_in_production"
}

if (-not $BaseUrl) {
    $BaseUrl = "http://localhost:3002"
}

Write-Host "🔍 Detailed Fund Facts Test - Showing Perplexity Data" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Fund ID: $FundId"
Write-Host "Base URL: $BaseUrl"
Write-Host ""

# Make the request
$headers = @{
    "X-AI-Coach-API-Key" = $ApiKey
}

try {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/ai-coach/funds/$FundId/facts" -Headers $headers -Method GET
    $stopwatch.Stop()
    
    $json = $response.Content | ConvertFrom-Json
    
    Write-Host "📊 Response Status" -ForegroundColor Green
    Write-Host "──────────────────"
    Write-Host "HTTP Status: $($response.StatusCode)"
    Write-Host "Response Time: $($stopwatch.ElapsedMilliseconds)ms"
    Write-Host ""
    
    Write-Host "📋 Fund Facts Summary" -ForegroundColor Green
    Write-Host "─────────────────────"
    Write-Host "Success: $($json.success)"
    Write-Host "Fund ID: $($json.data.fund_id)"
    Write-Host "Scheme Name: $($json.data.scheme_name)"
    Write-Host "Provenance: $($json.data.provenance)"
    Write-Host "LLM Confidence: $($json.data.llm_confidence)"
    Write-Host "LLM As Of: $($json.data.llm_as_of)"
    Write-Host "Summary: $($json._summary)"
    Write-Host ""
    
    Write-Host "📈 Risk & Return Metrics (from Perplexity)" -ForegroundColor Green
    Write-Host "──────────────────────────────────────────"
    $json.data.risk_return | ConvertTo-Json -Depth 10
    Write-Host ""
    
    Write-Host "💰 Fees & AUM (from Perplexity)" -ForegroundColor Green
    Write-Host "────────────────────────────────"
    $json.data.fees_aum | ConvertTo-Json -Depth 10
    Write-Host ""
    
    Write-Host "🔗 Sources & Citations (from Perplexity)" -ForegroundColor Green
    Write-Host "─────────────────────────────────────────"
    $json.data.sources | ConvertTo-Json -Depth 10
    Write-Host ""
    
    Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "📄 Complete JSON Response" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
    $json | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "   - If 'provenance' is 'deterministic', LLM is disabled or cache miss"
Write-Host "   - If 'provenance' is 'llm+cited', data came from Perplexity"
Write-Host "   - Check 'sources' array for citation URLs"
Write-Host "   - 'llm_confidence' shows data quality: high/medium/low"

