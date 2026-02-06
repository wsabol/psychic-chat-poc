# Test Contact Form Endpoint
$body = @{
    name = "Test User"
    email = "test@example.com"
    message = "Testing the contact form endpoint - this is a test message to verify the form is working correctly."
} | ConvertTo-Json

Write-Host "Testing contact form at: https://api.starshippsychics.com/api/contact" -ForegroundColor Cyan
Write-Host "Request body: $body" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri 'https://api.starshippsychics.com/api/contact' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}
