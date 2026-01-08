INSERT INTO user_consents (
  user_id_hash,
  terms_version,
  terms_accepted,
  terms_accepted_at,
  privacy_version,
  privacy_accepted,
  privacy_accepted_at,
  agreed_from_ip_encrypted,
  user_agent_encrypted,
  requires_consent_update,
  created_at,
  updated_at
) VALUES (
  'test_hanging_hash_xyz',
  '1.0',
  true,
  NOW(),
  '1.0',
  true,
  NOW(),
  NULL,
  NULL,
  false,
  NOW(),
  NOW()
) ON CONFLICT (user_id_hash) DO UPDATE SET
  terms_version = CASE WHEN true THEN '1.0' ELSE user_consents.terms_version END,
  terms_accepted = true,
  terms_accepted_at = CASE WHEN true THEN NOW() ELSE user_consents.terms_accepted_at END,
  privacy_version = CASE WHEN true THEN '1.0' ELSE user_consents.privacy_version END,
  privacy_accepted = true,
  privacy_accepted_at = CASE WHEN true THEN NOW() ELSE user_consents.privacy_accepted_at END,
  agreed_from_ip_encrypted = NULL,
  user_agent_encrypted = NULL,
  requires_consent_update = false,
  updated_at = NOW()
RETURNING user_id_hash;
