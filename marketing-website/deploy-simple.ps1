# Simple AWS S3 Deployment Script
param(
    [string]$BucketName = "www.starshippsychics.com"
)

$AWS = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"

Write-Host "Deploying to S3 bucket: $BucketName" -ForegroundColor Cyan

# Step 1: Create bucket
Write-Host "`n1. Creating S3 bucket..." -ForegroundColor Yellow
& $AWS s3api create-bucket --bucket $BucketName --region us-east-1

# Step 2: Enable static website hosting
Write-Host "`n2. Enabling static website hosting..." -ForegroundColor Yellow
$config = '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'
$config | Out-File -FilePath "temp-config.json" -Encoding ASCII -NoNewline
& $AWS s3api put-bucket-website --bucket $BucketName --website-configuration file://temp-config.json
Remove-Item "temp-config.json"

# Step 3: Remove public access block
Write-Host "`n3. Configuring public access..." -ForegroundColor Yellow
& $AWS s3api delete-public-access-block --bucket $BucketName

# Step 4: Set bucket policy
Write-Host "`n4. Setting bucket policy..." -ForegroundColor Yellow
$policy = "{`"Version`":`"2012-10-17`",`"Statement`":[{`"Sid`":`"PublicReadGetObject`",`"Effect`":`"Allow`",`"Principal`":`"*`",`"Action`":`"s3:GetObject`",`"Resource`":`"arn:aws:s3:::$BucketName/*`"}]}"
$policy | Out-File -FilePath "temp-policy.json" -Encoding ASCII -NoNewline
& $AWS s3api put-bucket-policy --bucket $BucketName --policy file://temp-policy.json
Remove-Item "temp-policy.json"

# Step 5: Upload files
Write-Host "`n5. Uploading files..." -ForegroundColor Yellow
& $AWS s3 cp index.html "s3://$BucketName/" --content-type "text/html"
& $AWS s3 cp styles.css "s3://$BucketName/" --content-type "text/css"
& $AWS s3 cp script.js "s3://$BucketName/" --content-type "application/javascript"
& $AWS s3 cp StarshipPsychics_Logo.png "s3://$BucketName/" --content-type "image/png"
& $AWS s3 cp iStock-1355328450.jpg "s3://$BucketName/" --content-type "image/jpeg"
& $AWS s3 cp knightofcups.jpeg "s3://$BucketName/" --content-type "image/jpeg"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nYour website URL:" -ForegroundColor Yellow
Write-Host "http://$BucketName.s3-website-us-east-1.amazonaws.com" -ForegroundColor Cyan
Write-Host "`nTest it in your browser!" -ForegroundColor Yellow
