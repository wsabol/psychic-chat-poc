#!/bin/bash

# Create Stripe Products and Prices using cURL
# Usage: ./api/scripts/create-products.sh

API_KEY=$STRIPE_SECRET_KEY

if [ -z "$API_KEY" ]; then
  echo "❌ Error: STRIPE_SECRET_KEY not set"
  exit 1
fi

echo "🚀 Creating Stripe Products and Prices..."

# Product 1: Basic Plan
echo "📦 Creating Basic Plan..."
BASIC_PRODUCT=$(curl -s https://api.stripe.com/v1/products \
  -u $API_KEY: \
  -d name="Basic Plan" \
  -d description="Our most popular plan for individuals" \
  -d type="service" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "✅ Basic Product: $BASIC_PRODUCT"

BASIC_PRICE=$(curl -s https://api.stripe.com/v1/prices \
  -u $API_KEY: \
  -d product="$BASIC_PRODUCT" \
  -d nickname="Basic Monthly" \
  -d unit_amount=999 \
  -d currency=usd \
  -d 'recurring[interval]=month' \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "✅ Basic Price: $BASIC_PRICE"

# Product 2: Pro Plan
echo "📦 Creating Pro Plan..."
PRO_PRODUCT=$(curl -s https://api.stripe.com/v1/products \
  -u $API_KEY: \
  -d name="Pro Plan" \
  -d description="For power users and teams" \
  -d type="service" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "✅ Pro Product: $PRO_PRODUCT"

PRO_PRICE=$(curl -s https://api.stripe.com/v1/prices \
  -u $API_KEY: \
  -d product="$PRO_PRODUCT" \
  -d nickname="Pro Monthly" \
  -d unit_amount=2999 \
  -d currency=usd \
  -d 'recurring[interval]=month' \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "✅ Pro Price: $PRO_PRICE"

# Product 3: Premium Plan
echo "📦 Creating Premium Plan..."
PREMIUM_PRODUCT=$(curl -s https://api.stripe.com/v1/products \
  -u $API_KEY: \
  -d name="Premium Plan" \
  -d description="All features, unlimited access" \
  -d type="service" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "✅ Premium Product: $PREMIUM_PRODUCT"

PREMIUM_PRICE=$(curl -s https://api.stripe.com/v1/prices \
  -u $API_KEY: \
  -d product="$PREMIUM_PRODUCT" \
  -d nickname="Premium Monthly" \
  -d unit_amount=5999 \
  -d currency=usd \
  -d 'recurring[interval]=month' \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "✅ Premium Price: $PREMIUM_PRICE"

echo ""
echo "✨ All products and prices created!"
echo ""
echo "📋 Price IDs (use these to test subscriptions):"
echo "  Basic:   $BASIC_PRICE"
echo "  Pro:     $PRO_PRICE"
echo "  Premium: $PREMIUM_PRICE"
