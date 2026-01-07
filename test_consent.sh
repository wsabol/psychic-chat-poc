#!/bin/bash

USER_ID="aM5X3KeG2rUT5SRH9nnpVZwEg0v1"

echo "Testing consent endpoint..."
echo "User ID: $USER_ID"
echo ""

curl -X POST http://localhost:3000/auth/consent/terms-acceptance \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"terms_accepted\": true,
    \"privacy_accepted\": true
  }"

echo ""
echo ""
echo "Checking if record was created..."
docker exec psychic-chat-poc-db-1 psql -U postgres -d chatbot -c "SELECT * FROM user_consents WHERE user_id_hash = (SELECT MD5('$USER_ID')) LIMIT 1;" 2>/dev/null || echo "Could not query database"
