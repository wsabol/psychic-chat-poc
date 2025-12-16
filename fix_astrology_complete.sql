UPDATE user_astrology 
SET astrology_data = jsonb_set(
  astrology_data, 
  '{}', 
  '{"sun_sign": "Aquarius", "sun_degree": 15.5, "moon_sign": "Taurus", "moon_degree": 22.3, "rising_sign": "Gemini", "rising_degree": 10.8, "latitude": 37.0298, "longitude": -76.3452, "timezone": "America/New_York", "calculated_at": "2025-12-16T19:40:00Z"}'::jsonb
),
zodiac_sign = 'Aquarius',
updated_at = CURRENT_TIMESTAMP
WHERE user_id_hash = 'bdd2d3e385206ef012e6478eeaaa922b1d5f6094e3ad297a727d04342372e768';

SELECT 'Astrology data updated with moon_sign and rising_sign' as status;
