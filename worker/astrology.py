#!/usr/bin/env python3
import sys
import json
import time
from datetime import datetime
from zoneinfo import ZoneInfo

try:
    import swisseph as swe
except ImportError:
    print(json.dumps({"error": "pyswisseph not installed"}), file=sys.stdout)
    sys.exit(1)

try:
    from geopy.geocoders import Photon, Nominatim
    from timezonefinder import TimezoneFinder
except ImportError:
    print(json.dumps({"error": "geopy or timezonefinder not installed"}), file=sys.stdout)
    sys.exit(1)

ZODIAC_SIGNS = {
    "Aries": (0, 30), "Taurus": (30, 60), "Gemini": (60, 90), "Cancer": (90, 120),
    "Leo": (120, 150), "Virgo": (150, 180), "Libra": (180, 210), "Scorpio": (210, 240),
    "Sagittarius": (240, 270), "Capricorn": (270, 300), "Aquarius": (300, 330), "Pisces": (330, 360)
}

# Cache for geocoding results (survives worker process lifetime)
GEOCACHE = {}

# Track failed geocoding attempts to prevent infinite retries
GEOCODING_FAILURES = {}

def degrees_to_zodiac(longitude):
    longitude = longitude % 360
    for sign, (start, end) in ZODIAC_SIGNS.items():
        if start <= longitude < end:
            return sign, longitude - start
    return "Pisces", longitude - 330

def get_timezone_from_location(lat, lng):
    try:
        tz = TimezoneFinder().timezone_at(lat=lat, lng=lng)
        return tz
    except Exception as e:
        print(f"[TIMEZONE] Error detecting timezone: {str(e)}", file=sys.stderr)
        return None

def get_coordinates(country, province, city):
    """
    Attempt to geocode a city/province/country combination.
    Returns (lat, lng) on success, or (None, None) on failure.
    Does NOT raise exceptions - catches and logs them instead.
    """
    try:
        # Create cache key for this location
        cache_key = f"{city},{province},{country}".lower()
        
        # Check if we already have this location cached
        if cache_key in GEOCACHE:
            print(f"[GEOCODING] CACHE HIT: {cache_key}", file=sys.stderr)
            return GEOCACHE[cache_key]
        
        # Check if we already failed to find this location (don't retry infinite times)
        if cache_key in GEOCODING_FAILURES:
            print(f"[GEOCODING] SKIP: Already failed for {cache_key}, not retrying", file=sys.stderr)
            return None, None
        
        address_string = f"{city}, {province}, {country}"
        print(f"[GEOCODING] Attempting to geocode: {address_string}", file=sys.stderr)
        
        # PRIMARY: Use Photon (faster, no rate limiting)
        try:
            geolocator = Photon(user_agent="psychic_chat_astrology", timeout=10)
            location = geolocator.geocode(address_string, timeout=10)
            
            if location:
                result = (location.latitude, location.longitude)
                GEOCACHE[cache_key] = result
                print(f"[GEOCODING] ✓ SUCCESS via Photon: {cache_key} => ({location.latitude}, {location.longitude})", file=sys.stderr)
                return result
            
            print(f"[GEOCODING] Photon: No result for full address", file=sys.stderr)
        except Exception as e:
            print(f"[GEOCODING] Photon failed: {str(e)}", file=sys.stderr)
        
        # FALLBACK 1: Try without province (Photon)
        print(f"[GEOCODING] Fallback 1: Trying without province", file=sys.stderr)
        try:
            address_no_province = f"{city}, {country}"
            geolocator = Photon(user_agent="psychic_chat_astrology", timeout=10)
            location = geolocator.geocode(address_no_province, timeout=10)
            
            if location:
                result = (location.latitude, location.longitude)
                GEOCACHE[cache_key] = result
                print(f"[GEOCODING] ✓ SUCCESS via Photon (no province): {cache_key} => ({location.latitude}, {location.longitude})", file=sys.stderr)
                return result
        except Exception as e:
            print(f"[GEOCODING] Fallback 1 failed: {str(e)}", file=sys.stderr)
        
        # FALLBACK 2: Use Nominatim (OpenStreetMap official API, backup only)
        print(f"[GEOCODING] Fallback 2: Using Nominatim", file=sys.stderr)
        try:
            time.sleep(2)  # Rate limiting for Nominatim
            geolocator = Nominatim(user_agent="psychic_chat_astrology", timeout=10)
            location = geolocator.geocode(address_string, timeout=10)
            
            if location:
                result = (location.latitude, location.longitude)
                GEOCACHE[cache_key] = result
                print(f"[GEOCODING] ✓ SUCCESS via Nominatim: {cache_key} => ({location.latitude}, {location.longitude})", file=sys.stderr)
                return result
        except Exception as e:
            print(f"[GEOCODING] Fallback 2 failed: {str(e)}", file=sys.stderr)
        
        # All geocoding attempts failed - mark this location as unfound
        GEOCODING_FAILURES[cache_key] = True
        print(f"[GEOCODING] ✗ FAILED: Could not find coordinates for {address_string}", file=sys.stderr)
        return None, None
        
    except Exception as e:
        print(f"[GEOCODING] Unexpected error: {str(e)}", file=sys.stderr)
        return None, None

def calculate_birth_chart(birth_data):
    """
    Calculate birth chart with graceful degradation.
    If location cannot be geocoded, returns sun sign (always available)
    but sun/moon/rising signs from location data will be unavailable.
    """
    try:
        birth_date_str = birth_data.get("birth_date")
        birth_time_str = birth_data.get("birth_time")
        country = birth_data.get("birth_country")
        province = birth_data.get("birth_province")
        city = birth_data.get("birth_city")
        provided_tz = birth_data.get("birth_timezone")
        
        # Check for required fields
        if not all([birth_date_str, birth_time_str]):
            return {"error": "Missing required fields: birth date and time are required", "success": False}
        
        # If location is not provided, still calculate what we can
        location_provided = all([country, province, city])
        
        # Try to parse date and time
        try:
            birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
        except ValueError:
            return {"error": "Invalid birth date format. Use YYYY-MM-DD", "success": False}
        
        time_formats = ["%H:%M:%S", "%H:%M"]
        birth_time = None
        for fmt in time_formats:
            try:
                birth_time = datetime.strptime(birth_time_str, fmt).time()
                break
            except ValueError:
                continue
        
        if birth_time is None:
            return {"error": "Invalid birth time format. Use HH:MM or HH:MM:SS", "success": False}
        
        # Initialize response with basic data
        result = {
            "success": True,
            "birth_date": birth_date_str,
            "birth_time": birth_time_str,
            "warnings": []
        }
        
        # If location is provided, try to geocode it
        if location_provided:
            lat, lng = get_coordinates(country, province, city)
            
            if lat is None or lng is None:
                # Geocoding failed - user-friendly message
                warning_msg = f"I am having trouble locating {city}. Please check the spelling or select another larger city nearby. Your rising, moon, and sun signs will not be available, but I can still provide general guidance."
                result["warnings"].append(warning_msg)
                result["location_error"] = warning_msg
                print(f"[BIRTH-CHART] Location geocoding failed for {city}, {province}, {country}", file=sys.stderr)
                # Continue without location data
                lat = lng = None
            else:
                result["latitude"] = round(lat, 2)
                result["longitude"] = round(lng, 2)
                print(f"[BIRTH-CHART] Location geocoded: {city}, {province}, {country} => ({lat}, {lng})", file=sys.stderr)
        else:
            lat = lng = None
            result["warnings"].append("Birth location not provided. Your rising, moon, and sun signs cannot be calculated.")
        
        # If timezone not provided and we have coordinates, try to detect it
        if lat and lng and not provided_tz:
            timezone_str = get_timezone_from_location(lat, lng)
            if timezone_str:
                result["timezone"] = timezone_str
            else:
                result["warnings"].append("Could not detect timezone from location. Using UTC.")
                timezone_str = "UTC"
        elif provided_tz:
            timezone_str = provided_tz
            result["timezone"] = timezone_str
        else:
            timezone_str = "UTC"
        
        # Calculate astrology signs if we have coordinates
        if lat is not None and lng is not None:
            try:
                local_dt = datetime.combine(birth_date, birth_time)
                local_dt = local_dt.replace(tzinfo=ZoneInfo(timezone_str))
                utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
                
                jd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0)
                
                sun = swe.calc_ut(jd, swe.SUN)
                moon = swe.calc_ut(jd, swe.MOON)
                houses = swe.houses(jd, lat, lng)
                asc_lon = houses[0][0]
                
                sun_sign, sun_deg = degrees_to_zodiac(sun[0][0])
                moon_sign, moon_deg = degrees_to_zodiac(moon[0][0])
                asc_sign, asc_deg = degrees_to_zodiac(asc_lon)
                
                result["sun_sign"] = sun_sign
                result["sun_degree"] = round(sun_deg, 2)
                result["moon_sign"] = moon_sign
                result["moon_degree"] = round(moon_deg, 2)
                result["rising_sign"] = asc_sign
                result["rising_degree"] = round(asc_deg, 2)
                result["utc_time"] = utc_dt.isoformat()
                
            except Exception as e:
                result["warnings"].append(f"Could not calculate all astrological signs: {str(e)}")
                print(f"[BIRTH-CHART] Error calculating signs: {str(e)}", file=sys.stderr)
        else:
            result["warnings"].append("Location not available. Rising, moon, and sun signs cannot be calculated.")
        
        return result
        
    except Exception as e:
        print(f"[BIRTH-CHART] Unexpected error: {str(e)}", file=sys.stderr)
        return {"error": f"An unexpected error occurred: {str(e)}", "success": False}

def calculate_current_moon_phase():
    try:
        now_utc = datetime.now(ZoneInfo("UTC"))
        jd = swe.julday(now_utc.year, now_utc.month, now_utc.day, now_utc.hour + now_utc.minute / 60.0 + now_utc.second / 3600.0)
        
        sun_pos = swe.calc_ut(jd, swe.SUN)
        moon_pos = swe.calc_ut(jd, swe.MOON)
        
        phase_angle = (moon_pos[0][0] - sun_pos[0][0]) % 360
        phase_index = int((phase_angle / 360) * 8) % 8
        phase_names = ["newMoon", "waxingCrescent", "firstQuarter", "waxingGibbous", "fullMoon", "waningGibbous", "lastQuarter", "waningCrescent"]
        cycle_percentage = round((phase_angle / 360) * 100, 1)
        
        return {"phase": phase_names[phase_index], "phase_angle": round(phase_angle, 2), "cycle_percentage": cycle_percentage, "timestamp": now_utc.isoformat(), "success": True}
    except Exception as e:
        return {"error": str(e), "phase": None, "success": False}

def calculate_current_planets():
    try:
        now_utc = datetime.now(ZoneInfo("UTC"))
        jd = swe.julday(now_utc.year, now_utc.month, now_utc.day, now_utc.hour + now_utc.minute / 60.0 + now_utc.second / 3600.0)
        planets = [(swe.SUN, "Sun"), (swe.MOON, "Moon"), (swe.MERCURY, "Mercury"), (swe.VENUS, "Venus"), (swe.MARS, "Mars"), (swe.JUPITER, "Jupiter"), (swe.SATURN, "Saturn")]
        planet_data = []
        for planet_id, planet_name in planets:
            planet_pos = swe.calc_ut(jd, planet_id)
            longitude = planet_pos[0][0]
            sign, degree = degrees_to_zodiac(longitude)
            planet_data.append({"name": planet_name, "sign": sign, "degree": round(degree, 2), "retrograde": False, "displayName": planet_name})
        return {"planets": planet_data, "timestamp": now_utc.isoformat(), "success": True}
    except Exception as e:
        return {"error": str(e), "planets": [], "success": False}

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {str(e)}"}), file=sys.stdout)
        sys.exit(1)
    
    request_type = input_data.get("type")
    
    if request_type == "moon_phase":
        result = calculate_current_moon_phase()
    elif request_type == "current_planets":
        result = calculate_current_planets()
    else:
        result = calculate_birth_chart(input_data)
    
    print(json.dumps(result), file=sys.stdout)
