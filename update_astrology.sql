UPDATE user_astrology 
SET astrology_data = '{"sun_sign": "Aries", "moon_sign": "Taurus", "rising_sign": "Gemini", "sun_degree": 15.5, "moon_degree": 22.3, "rising_degree": 10.8, "latitude": 43.6532, "longitude": -79.3832, "timezone": "America/Toronto", "calculated_at": "2025-12-16T19:30:00Z"}'::jsonb,
updated_at = CURRENT_TIMESTAMP
WHERE user_id_hash = 'bdd2d3e385206ef012e6478eeaaa922b1d5f6094e3ad297a727d04342372e768';

SELECT 'Astrology data updated successfully' as status;
