#!/usr/bin/env python3
"""
Swiss Ephemeris-based astrology calculations for birth chart data.
Uses pyswisseph for accurate planetary positions and rising/moon signs.
Calculates: Sun, Moon, Rising, Lunar Nodes, and current transits.
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

# Retrograde periods for 2025-2026
RETROGRADES_2025_2026 = [
    {"planet": "Mercury", "start": "2025-01-15", "end": "2025-02-03"},
    {"planet": "Mercury", "start": "2025-05-14", "end": "2025-06-08"},
    {"planet": "Mercury", "start": "2025-09-09", "end": "2025-10-03"},
    {"planet": "Venus", "start": "2025-12-25", "end": "2026-02-02"},
    {"planet": "Mars", "start": "2025-06-16", "end": "2025-08-23"},
    {"planet": "Jupiter", "start": "2025-10-04", "end": "2026-02-06"},
]

def degrees_to_zodiac(longitude):
    """Convert ecliptic longitude (0-360°) to zodiac sign and degree."""
    longitude = longitude % 360
    for sign, (start, end) in ZODIAC_SIGNS.items():
        if start <= longitude < end:
            degree_in_sign = longitude - start
            return sign, degree_in_sign
    return "Pisces", longitude - 330

def get_timezone_from_location(country, province, city):
    """Use geopy and timezonefinder to get timezone from location."""
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
        print(f"Error detecting timezone: {str(e)}", file=sys.stderr)
        return None

def get_coordinates(country, province, city):
    """Use geopy to convert city/province/country to latitude/longitude."""
    try:
        geolocator = Nominatim(user_agent="psychic_chat_astrology")
        location_str = f"{city}, {province}, {country}"
        location = geolocator.geocode(location_str, timeout=10)
        
        if location:
            return location.latitude, location.longitude
        return None, None
    except Exception as e:
        print(f"Error geocoding: {str(e)}", file=sys.stderr)
        return None, None

def calculate_birth_chart(birth_data):
    """Calculate birth chart with Sun, Moon, Rising, and Lunar Nodes."""
    try:
        birth_date_str = birth_data.get("birth_date")
        birth_time_str = birth_data.get("birth_time")
        country = birth_data.get("birth_country")
        province = birth_data.get("birth_province")
        city = birth_data.get("birth_city")
        provided_tz = birth_data.get("birth_timezone")
        
        if not all([birth_date_str, birth_time_str, country, province, city]):
            return {
                "error": "Missing required fields",
                "success": False
            }
        
        # Get coordinates
        lat, lng = get_coordinates(country, province, city)
        if lat is None or lng is None:
            return {
                "error": f"Could not find coordinates for {city}",
                "success": False
            }
        
        # Get timezone
        timezone_str = provided_tz or get_timezone_from_location(country, province, city)
        if not timezone_str:
            return {
                "error": f"Could not detect timezone",
                "success": False
            }
        
        # Parse birth date and time
        birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
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
                "error": f"Could not parse birth time",
                "success": False
            }
        
        # Create local datetime and convert to UTC
        local_dt = datetime.combine(birth_date, birth_time)
        local_dt = local_dt.replace(tzinfo=ZoneInfo(timezone_str))
        utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
        
        # Calculate Julian Day Number
        jd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, 
                       utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0)
        
        # Calculate planets
        sun = swe.calc_ut(jd, swe.SUN)
        moon = swe.calc_ut(jd, swe.MOON)
        
        # Calculate houses
        houses = swe.houses(jd, lat, lng)
        asc_lon = houses[0][0]
        
        # Calculate lunar nodes
        node = swe.calc_ut(jd, swe.MEAN_NODE)
        north_node_lon = node[0][0]
        south_node_lon = (north_node_lon + 180) % 360
        
        # Convert to zodiac
        sun_sign, sun_deg = degrees_to_zodiac(sun[0][0])
        moon_sign, moon_deg = degrees_to_zodiac(moon[0][0])
        asc_sign, asc_deg = degrees_to_zodiac(asc_lon)
        north_node_sign, north_node_deg = degrees_to_zodiac(north_node_lon)
        south_node_sign, south_node_deg = degrees_to_zodiac(south_node_lon)
        
        return {
            "rising_sign": asc_sign,
            "rising_degree": round(asc_deg, 2),
            "moon_sign": moon_sign,
            "moon_degree": round(moon_deg, 2),
            "sun_sign": sun_sign,
            "sun_degree": round(sun_deg, 2),
            "north_node_sign": north_node_sign,
            "north_node_degree": round(north_node_deg, 2),
            "south_node_sign": south_node_sign,
            "south_node_degree": round(south_node_deg, 2),
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
            "success": False
        }

def calculate_current_transits(birth_jd, birth_sun_lon, birth_moon_lon, birth_rising_lon):
    """Calculate current planetary positions and aspects to natal chart."""
    try:
        from datetime import datetime
        from zoneinfo import ZoneInfo
        
        now_utc = datetime.now(ZoneInfo("UTC"))
        jd = swe.julday(now_utc.year, now_utc.month, now_utc.day,
                       now_utc.hour + now_utc.minute / 60.0 + now_utc.second / 3600.0)
        
        # Calculate current planetary positions
        planets = {
            "Sun": swe.SUN,
            "Moon": swe.MOON,
            "Mercury": swe.MERCURY,
            "Venus": swe.VENUS,
            "Mars": swe.MARS,
            "Jupiter": swe.JUPITER,
            "Saturn": swe.SATURN,
        }
        
        transits = []
        
        for planet_name, planet_num in planets.items():
            planet_pos = swe.calc_ut(jd, planet_num)
            current_lon = planet_pos[0][0]
            current_sign, current_deg = degrees_to_zodiac(current_lon)
            
            # Calculate aspects to natal planets (simplified - conjunctions only for now)
            aspects = []
            
            # Check conjunction to Sun
            sun_diff = abs(current_lon - birth_sun_lon)
            if sun_diff > 180:
                sun_diff = 360 - sun_diff
            if sun_diff < 8:  # 8° orb for conjunction
                aspects.append(f"Conjunct Natal Sun")
            
            transits.append({
                "planet": planet_name,
                "sign": current_sign,
                "degree": round(current_deg, 2),
                "aspects": aspects
            })
        
        return {
            "transits": transits,
            "timestamp": now_utc.isoformat(),
            "success": True
        }
    
    except Exception as e:
        print(f"Error calculating transits: {str(e)}", file=sys.stderr)
        return {
            "error": str(e),
            "success": False
        }

def calculate_current_moon_phase():
    """Calculate the current lunar phase."""
    try:
        from datetime import datetime
        from zoneinfo import ZoneInfo
        
        now_utc = datetime.now(ZoneInfo("UTC"))
        jd = swe.julday(now_utc.year, now_utc.month, now_utc.day,
                       now_utc.hour + now_utc.minute / 60.0 + now_utc.second / 3600.0)
        
        sun_pos = swe.calc_ut(jd, swe.SUN)
        moon_pos = swe.calc_ut(jd, swe.MOON)
        
        sun_lon = sun_pos[0][0]
        moon_lon = moon_pos[0][0]
        
        phase_angle = (moon_lon - sun_lon) % 360
        
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
        
        # Check if Moon is void of course (not aspecting other planets)
        moon_lon_norm = moon_lon % 360
        void_of_course = True
        
        # Simple check: Moon aspects other planets within 12° (simplified)
        other_planets = [swe.SUN, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
        for planet_num in other_planets:
            planet_pos = swe.calc_ut(jd, planet_num)
            planet_lon = planet_pos[0][0] % 360
            diff = abs(moon_lon_norm - planet_lon)
            if diff > 180:
                diff = 360 - diff
            if diff < 12:
                void_of_course = False
                break
        
        cycle_percentage = round((phase_angle / 360) * 100, 1)
        
        return {
            "phase": phase_names[phase_index],
            "phase_angle": round(phase_angle, 2),
            "cycle_percentage": cycle_percentage,
            "void_of_course": void_of_course,
            "timestamp": now_utc.isoformat(),
            "success": True
        }
    except Exception as e:
        print(f"Error calculating moon phase: {str(e)}", file=sys.stderr)
        return {
            "error": str(e),
            "success": False
        }

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        print(json.dumps({
            "error": f"Invalid JSON: {str(e)}",
            "success": False
        }), file=sys.stdout)
        sys.exit(1)
    
    if input_data.get("type") == "moon_phase":
        result = calculate_current_moon_phase()
    elif input_data.get("type") == "transits":
        result = calculate_current_transits(
            input_data.get("birth_jd"),
            input_data.get("birth_sun_lon"),
            input_data.get("birth_moon_lon"),
            input_data.get("birth_rising_lon")
        )
    else:
        result = calculate_birth_chart(input_data)
    
    print(json.dumps(result), file=sys.stdout)
