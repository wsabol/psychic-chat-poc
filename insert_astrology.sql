INSERT INTO user_astrology (user_id_hash, zodiac_sign, astrology_data)
VALUES (
  'bdd2d3e385206ef012e6478eeaaa922b1d5f6094e3ad297a727d04342372e768',
  'Aries',
  '{"sun_sign": "Aries", "moon_sign": "Taurus", "rising_sign": "Gemini", "sun_degree": 15.5, "moon_degree": 22.3, "rising_degree": 10.8, "latitude": 43.6532, "longitude": -79.3832, "timezone": "America/Toronto", "calculated_at": "2025-12-16T19:10:00Z"}'
)
ON CONFLICT (user_id_hash) DO UPDATE SET
astrology_data = EXCLUDED.astrology_data,
updated_at = CURRENT_TIMESTAMP;

SELECT 'Astrology data inserted successfully' as status;
