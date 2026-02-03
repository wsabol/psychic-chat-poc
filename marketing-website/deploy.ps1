# Starship Psychics Marketing Website - AWS Deployment Script
# This script automates the deployment of the marketing website to AWS S3 + CloudFront

param(
    [Parameter(Mandatory=$true)]
    [string]$BucketName,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$DistributionId = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateBucket,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipInvalidation
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starship Psychics - AWS Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "Checking AWS CLI installation..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "  Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check AWS credentials
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    Write-Host "✓ AWS credentials configured" -ForegroundColor Green
    Write-Host "  Account: $($identity.Account)" -ForegroundColor Gray
    Write-Host "  User: $($identity.Arn)" -ForegroundColor Gray
} catch {
    Write-Host "✗ AWS credentials not configured. Run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Create S3 bucket if requested
if ($CreateBucket) {
    Write-Host ""
    Write-Host "Creating S3 bucket: $BucketName..." -ForegroundColor Yellow
    
    try {
        if ($Region -eq "us-east-1") {
            aws s3api create-bucket --bucket $BucketName --region $Region 2>&1 | Out-Null
        } else {
            aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration LocationConstraint=$Region 2>&1 | Out-Null
        }
        Write-Host "✓ Bucket created successfully" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to create bucket. It may already exist." -ForegroundColor Yellow
    }
    
    # Enable static website hosting
    Write-Host "Configuring static website hosting..." -ForegroundColor Yellow
    $websiteConfig = @"
{
    "IndexDocument": {
        "Suffix": "index.html"
    },
    "ErrorDocument": {
        "Key": "index.html"
    }
}
"@
    $websiteConfig | Out-File -FilePath "website-config.json" -Encoding utf8
    aws s3api put-bucket-website --bucket $BucketName --website-configuration file://website-config.json
    Remove-Item "website-config.json"
    Write-Host "✓ Static website hosting enabled" -ForegroundColor Green
    
    # Disable block public access
    Write-Host "Configuring public access..." -ForegroundColor Yellow
    aws s3api delete-public-access-block --bucket $BucketName 2>&1 | Out-Null
    Write-Host "✓ Public access configured" -ForegroundColor Green
    
    # Set bucket policy
    Write-Host "Setting bucket policy..." -ForegroundColor Yellow
    $bucketPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BucketName/*"
        }
    ]
}
"@
    $bucketPolicy | Out-File -FilePath "bucket-policy.json" -Encoding utf8
    aws s3api put-bucket-policy --bucket $BucketName --policy file://bucket-policy.json
    Remove-Item "bucket-policy.json"
    Write-Host "✓ Bucket policy applied" -ForegroundColor Green
}

# Upload files to S3
Write-Host ""
Write-Host "Uploading website files to S3..." -ForegroundColor Yellow

$filesToUpload = @(
    @{File="index.html"; ContentType="text/html"},
    @{File="styles.css"; ContentType="text/css"},
    @{File="script.js"; ContentType="application/javascript"},
    @{File="StarshipPsychics_Logo.png"; ContentType="image/png"},
    @{File="iStock-1355328450.jpg"; ContentType="image/jpeg"},
    @{File="knightofcups.jpeg"; ContentType="image/jpeg"}
)

$uploadedCount = 0
foreach ($item in $filesToUpload) {
    $file = $item.File
    $contentType = $item.ContentType
    
    if (Test-Path $file) {
        Write-Host "  Uploading $file..." -ForegroundColor Gray
        aws s3 cp $file "s3://$BucketName/$file" --content-type $contentType --cache-control "public, max-age=3600" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $uploadedCount++
            Write-Host "  ✓ $file uploaded" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Failed to upload $file" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⊗ $file not found, skipping" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✓ Uploaded $uploadedCount files successfully" -ForegroundColor Green

# Invalidate CloudFront cache if distribution ID provided
if ($DistributionId -and -not $SkipInvalidation) {
    Write-Host ""
    Write-Host "Creating CloudFront invalidation..." -ForegroundColor Yellow
    try {
        $invalidation = aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*" 2>&1 | ConvertFrom-Json
        Write-Host "✓ Invalidation created: $($invalidation.Invalidation.Id)" -ForegroundColor Green
        Write-Host "  Status: $($invalidation.Invalidation.Status)" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Failed to create invalidation. You may need to do this manually." -ForegroundColor Yellow
    }
}

# Display website URL
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete! 🚀" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "S3 Website URL:" -ForegroundColor Yellow
Write-Host "  http://$BucketName.s3-website-$Region.amazonaws.com" -ForegroundColor White
Write-Host ""

if ($DistributionId) {
    Write-Host "CloudFront Distribution:" -ForegroundColor Yellow
    Write-Host "  Distribution ID: $DistributionId" -ForegroundColor White
    Write-Host "  (Check AWS Console for CloudFront URL)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test the S3 website URL above" -ForegroundColor White
Write-Host "2. If using CloudFront, wait 5-10 minutes for deployment" -ForegroundColor White
Write-Host "3. Configure your domain DNS to point to CloudFront" -ForegroundColor White
Write-Host "4. Set up SSL certificate in AWS Certificate Manager" -ForegroundColor White
Write-Host ""
