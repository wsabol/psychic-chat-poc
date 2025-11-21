#!/usr/bin/env python3
"""
Swiss Ephemeris-based astrology calculations for birth chart data.
Uses pyswisseph for accurate planetary positions and rising/moon signs.
"""

import sys
import json
import math
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

try:
    import swisseph as swe
except ImportError:
    print(json.dumps({
        "error": "pyswisseph not installed",
        "rising_sign": None,
        "moon_sign": None
    }), file=sys.stdout)
    sys.exit(1)

try:
    from geopy.geocoders import Nominatim
    from timezonefinder import TimezoneFinder
except ImportError:
    print(json.dumps({
        "error": "geopy or timezonefinder not installed",
        "rising_sign": None,
        "moon_sign": None
    }), file=sys.stdout)
    sys.exit(1)

# Zodiac sign names and date ranges
ZODIAC_SIGNS = {
    "Aries": (0, 30),
    "Taurus": (30, 60),
    "Gemini": (60, 90),
    "Cancer": (90, 120),
    "Leo": (120, 150),
    "Virgo": (150, 180),
    "Libra": (180, 210),
    "Scorpio": (210, 240),
    "Sagittarius": (240, 270),
    "Capricorn": (270, 300),
    "Aquarius": (300, 330),
    "Pisces": (330, 360)
}

def degrees_to_zodiac(longitude):
    """Convert ecliptic longitude (0-360°) to zodiac sign and degree."""
    longitude = longitude % 360
    for sign, (start, end) in ZODIAC_SIGNS.items():
        if start <= longitude < end:
            degree_in_sign = longitude - start
            return sign, degree_in_sign
    return "Pisces", longitude - 330

def get_timezone_from_location(country, province, city):
    """
    Use geopy and timezonefinder to get timezone from location.
    Returns timezone string (e.g., 'America/New_York') or None if not found.
    """
    try:
        geolocator = Nominatim(user_agent="psychic_chat_astrology")
        location_str = f"{city}, {province}, {country}"
        location = geolocator.geocode(location_str, timeout=10)
        
        if not location:
            return None
        
        tf = TimezoneFinder()
        tz = tf.timezone_at(lat=location.latitude, lng=location.longitude)
        return tz
    except Exception as e:
        print(f"Error detecting timezone for {city}, {province}, {country}: {str(e)}", 
              file=sys.stderr)
        return None

def get_coordinates(country, province, city):
    """
    Use geopy to convert city/province/country to latitude/longitude.
    Returns (lat, lng) tuple or (None, None) if not found.
    """
    try:
        geolocator = Nominatim(user_agent="psychic_chat_astrology")
        location_str = f"{city}, {province}, {country}"
        location = geolocator.geocode(location_str, timeout=10)
        
        if location:
            return location.latitude, location.longitude
        return None, None
    except Exception as e:
        print(f"Error geocoding {city}, {province}, {country}: {str(e)}", 
              file=sys.stderr)
        return None, None

def calculate_birth_chart(birth_data):
    """
    Calculate rising sign, moon sign, and other planetary positions.
    
    Input:
    {
        "birth_date": "1956-02-09",  # YYYY-MM-DD
        "birth_time": "05:35",        # HH:MM
        "birth_timezone": "America/New_York",  # IANA timezone or auto-detect
        "birth_country": "United States",
        "birth_province": "Virginia",
        "birth_city": "Newport News"
    }
    
    Output:
    {
        "rising_sign": "Aquarius",
        "rising_degree": 18.5,
        "moon_sign": "Capricorn",
        "moon_degree": 12.3,
        "sun_sign": "Aquarius",
        "sun_degree": 20.1,
        "latitude": 37.03,
        "longitude": -76.43,
        "timezone": "America/New_York"
    }
    """
    try:
        # Parse birth data
        birth_date_str = birth_data.get("birth_date")
        birth_time_str = birth_data.get("birth_time")
        country = birth_data.get("birth_country")
        province = birth_data.get("birth_province")
        city = birth_data.get("birth_city")
        provided_tz = birth_data.get("birth_timezone")
        
        if not all([birth_date_str, birth_time_str, country, province, city]):
            return {
                "error": "Missing required fields: birth_date, birth_time, birth_country, birth_province, birth_city",
                "rising_sign": None,
                "moon_sign": None
            }
        
        # Get coordinates
        lat, lng = get_coordinates(country, province, city)
        if lat is None or lng is None:
            return {
                "error": f"Could not find coordinates for {city}, {province}, {country}",
                "rising_sign": None,
                "moon_sign": None
            }
        
        # Get timezone (auto-detect if not provided)
        timezone_str = provided_tz or get_timezone_from_location(country, province, city)
        if not timezone_str:
            return {
                "error": f"Could not detect timezone for {city}, {province}, {country}",
                "rising_sign": None,
                "moon_sign": None
            }
        
        # Parse birth date and time
        birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
        # Handle both HH:MM and HH:MM:SS formats
        time_formats = ["%H:%M:%S", "%H:%M"]
        birth_time = None
        for fmt in time_formats:
            try:
                birth_time = datetime.strptime(birth_time_str, fmt).time()
                break
            except ValueError:
                continue
        
        if birth_time is None:
            return {
                "error": f"Could not parse birth time: {birth_time_str}",
                "rising_sign": None,
                "moon_sign": None
            }
        
        # Create local datetime
        local_dt = datetime.combine(birth_date, birth_time)
        local_dt = local_dt.replace(tzinfo=ZoneInfo(timezone_str))
        
        # Convert to UTC
        utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
        
        # Calculate Julian Day Number
        jd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, 
                       utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0)
        
        # Calculate planets
        sun = swe.calc_ut(jd, swe.SUN)
        moon = swe.calc_ut(jd, swe.MOON)
        
        # Calculate houses (MC, Ascendant, etc.)
        houses = swe.houses(jd, lat, lng)
        asc_lon = houses[0][0]  # Ascendant longitude
        mc_lon = houses[0][1]   # Midheaven longitude
        
        # Convert to zodiac signs
        sun_sign, sun_deg = degrees_to_zodiac(sun[0][0])
        moon_sign, moon_deg = degrees_to_zodiac(moon[0][0])
        asc_sign, asc_deg = degrees_to_zodiac(asc_lon)
        
        return {
            "rising_sign": asc_sign,
            "rising_degree": round(asc_deg, 2),
            "moon_sign": moon_sign,
            "moon_degree": round(moon_deg, 2),
            "sun_sign": sun_sign,
            "sun_degree": round(sun_deg, 2),
            "latitude": round(lat, 2),
            "longitude": round(lng, 2),
            "timezone": timezone_str,
            "utc_time": utc_dt.isoformat(),
            "success": True
        }
    
    except Exception as e:
        print(f"Error calculating birth chart: {str(e)}", file=sys.stderr)
        return {
            "error": str(e),
            "rising_sign": None,
            "moon_sign": None,
            "success": False
        }

def calculate_current_moon_phase():
    """
    Calculate the current lunar phase based on the angle between sun and moon.
    Returns the phase name and percentage through the lunar cycle.
    
    Phase angle ranges:
    0-45°: New Moon (0%)
    45-90°: Waxing Crescent (25%)
    90-135°: First Quarter (50%)
    135-180°: Waxing Gibbous (75%)
    180-225°: Full Moon (100%)
    225-270°: Waning Gibbous (75%)
    270-315°: Last Quarter (50%)
    315-360°: Waning Crescent (25%)
    """
    try:
        from datetime import datetime
        from zoneinfo import ZoneInfo
        
        # Get current UTC time
        now_utc = datetime.now(ZoneInfo("UTC"))
        
        # Calculate Julian Day Number
        jd = swe.julday(now_utc.year, now_utc.month, now_utc.day,
                       now_utc.hour + now_utc.minute / 60.0 + now_utc.second / 3600.0)
        
        # Calculate sun and moon positions
        sun_pos = swe.calc_ut(jd, swe.SUN)
        moon_pos = swe.calc_ut(jd, swe.MOON)
        
        # Get ecliptic longitudes
        sun_lon = sun_pos[0][0]
        moon_lon = moon_pos[0][0]
        
        # Calculate phase angle (0-360°)
        phase_angle = (moon_lon - sun_lon) % 360
        
        # Map to 8 phases
        phase_index = int((phase_angle / 360) * 8) % 8
        phase_names = [
            "newMoon",
            "waxingCrescent",
            "firstQuarter",
            "waxingGibbous",
            "fullMoon",
            "waningGibbous",
            "lastQuarter",
            "waningCrescent"
        ]
        
        # Calculate percentage through lunar cycle (0-100%)
        cycle_percentage = round((phase_angle / 360) * 100, 1)
        
        return {
            "phase": phase_names[phase_index],
            "phase_angle": round(phase_angle, 2),
            "cycle_percentage": cycle_percentage,
            "timestamp": now_utc.isoformat(),
            "success": True
        }
    except Exception as e:
        print(f"Error calculating moon phase: {str(e)}", file=sys.stderr)
        return {
            "error": str(e),
            "phase": None,
            "success": False
        }

if __name__ == "__main__":
    # Read input to determine what to calculate
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        print(json.dumps({
            "error": f"Invalid JSON: {str(e)}",
            "rising_sign": None,
            "moon_sign": None
        }), file=sys.stdout)
        sys.exit(1)
    
    # Check if this is a moon phase calculation request
    if input_data.get("type") == "moon_phase":
        result = calculate_current_moon_phase()
    else:
        # Default: calculate birth chart
        result = calculate_birth_chart(input_data)
    
    print(json.dumps(result), file=sys.stdout)
