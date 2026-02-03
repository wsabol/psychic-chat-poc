#!/bin/bash
# Starship Psychics Marketing Website - AWS Deployment Script (Bash)
# This script automates the deployment of the marketing website to AWS S3 + CloudFront

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
REGION="us-east-1"
CREATE_BUCKET=false
SKIP_INVALIDATION=false
DISTRIBUTION_ID=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--bucket)
            BUCKET_NAME="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -d|--distribution-id)
            DISTRIBUTION_ID="$2"
            shift 2
            ;;
        --create-bucket)
            CREATE_BUCKET=true
            shift
            ;;
        --skip-invalidation)
            SKIP_INVALIDATION=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 -b BUCKET_NAME [-r REGION] [-d DISTRIBUTION_ID] [--create-bucket] [--skip-invalidation]"
            echo ""
            echo "Options:"
            echo "  -b, --bucket              S3 bucket name (required)"
            echo "  -r, --region              AWS region (default: us-east-1)"
            echo "  -d, --distribution-id     CloudFront distribution ID for cache invalidation"
            echo "  --create-bucket           Create the S3 bucket if it doesn't exist"
            echo "  --skip-invalidation       Skip CloudFront cache invalidation"
            echo "  -h, --help                Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

if [ -z "$BUCKET_NAME" ]; then
    echo -e "${RED}Error: Bucket name is required${NC}"
    echo "Usage: $0 -b BUCKET_NAME [-r REGION] [-d DISTRIBUTION_ID]"
    exit 1
fi

echo -e "${CYAN}========================================"
echo "Starship Psychics - AWS Deployment"
echo -e "========================================${NC}\n"

# Check if AWS CLI is installed
echo -e "${YELLOW}Checking AWS CLI installation...${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI not found. Please install it first:${NC}"
    echo -e "${YELLOW}  Download from: https://aws.amazon.com/cli/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ AWS CLI found: $(aws --version)${NC}"

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS credentials not configured. Run 'aws configure' first.${NC}"
    exit 1
fi
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
echo -e "${GREEN}✓ AWS credentials configured${NC}"
echo -e "  Account: $ACCOUNT"
echo -e "  User: $USER_ARN"

# Create S3 bucket if requested
if [ "$CREATE_BUCKET" = true ]; then
    echo -e "\n${YELLOW}Creating S3 bucket: $BUCKET_NAME...${NC}"
    
    if [ "$REGION" = "us-east-1" ]; then
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null || echo -e "${YELLOW}Bucket may already exist${NC}"
    else
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" --create-bucket-configuration LocationConstraint="$REGION" 2>/dev/null || echo -e "${YELLOW}Bucket may already exist${NC}"
    fi
    echo -e "${GREEN}✓ Bucket ready${NC}"
    
    # Enable static website hosting
    echo -e "${YELLOW}Configuring static website hosting...${NC}"
    cat > website-config.json <<EOF
{
    "IndexDocument": {
        "Suffix": "index.html"
    },
    "ErrorDocument": {
        "Key": "index.html"
    }
}
EOF
    aws s3api put-bucket-website --bucket "$BUCKET_NAME" --website-configuration file://website-config.json
    rm website-config.json
    echo -e "${GREEN}✓ Static website hosting enabled${NC}"
    
    # Disable block public access
    echo -e "${YELLOW}Configuring public access...${NC}"
    aws s3api delete-public-access-block --bucket "$BUCKET_NAME" 2>/dev/null || true
    echo -e "${GREEN}✓ Public access configured${NC}"
    
    # Set bucket policy
    echo -e "${YELLOW}Setting bucket policy...${NC}"
    cat > bucket-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF
    aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file://bucket-policy.json
    rm bucket-policy.json
    echo -e "${GREEN}✓ Bucket policy applied${NC}"
fi

# Upload files to S3
echo -e "\n${YELLOW}Uploading website files to S3...${NC}"

declare -a files=(
    "index.html:text/html"
    "styles.css:text/css"
    "script.js:application/javascript"
    "StarshipPsychics_Logo.png:image/png"
    "iStock-1355328450.jpg:image/jpeg"
    "knightofcups.jpeg:image/jpeg"
)

uploaded_count=0
for item in "${files[@]}"; do
    IFS=':' read -r file content_type <<< "$item"
    
    if [ -f "$file" ]; then
        echo -e "  Uploading $file..."
        aws s3 cp "$file" "s3://$BUCKET_NAME/$file" --content-type "$content_type" --cache-control "public, max-age=3600"
        echo -e "  ${GREEN}✓ $file uploaded${NC}"
        ((uploaded_count++))
    else
        echo -e "  ${YELLOW}⊗ $file not found, skipping${NC}"
    fi
done

echo -e "\n${GREEN}✓ Uploaded $uploaded_count files successfully${NC}"

# Invalidate CloudFront cache if distribution ID provided
if [ -n "$DISTRIBUTION_ID" ] && [ "$SKIP_INVALIDATION" = false ]; then
    echo -e "\n${YELLOW}Creating CloudFront invalidation...${NC}"
    INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" --query 'Invalidation.Id' --output text 2>/dev/null || echo "")
    
    if [ -n "$INVALIDATION_ID" ]; then
        echo -e "${GREEN}✓ Invalidation created: $INVALIDATION_ID${NC}"
    else
        echo -e "${YELLOW}✗ Failed to create invalidation. You may need to do this manually.${NC}"
    fi
fi

# Display website URL
echo -e "\n${CYAN}========================================"
echo -e "Deployment Complete! 🚀"
echo -e "========================================${NC}\n"

echo -e "${YELLOW}S3 Website URL:${NC}"
echo -e "  http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com\n"

if [ -n "$DISTRIBUTION_ID" ]; then
    echo -e "${YELLOW}CloudFront Distribution:${NC}"
    echo -e "  Distribution ID: $DISTRIBUTION_ID"
    echo -e "  (Check AWS Console for CloudFront URL)\n"
fi

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Test the S3 website URL above"
echo -e "2. If using CloudFront, wait 5-10 minutes for deployment"
echo -e "3. Configure your domain DNS to point to CloudFront"
echo -e "4. Set up SSL certificate in AWS Certificate Manager\n"
