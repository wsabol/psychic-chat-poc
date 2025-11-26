#!/usr/bin/env python3
import sys
import json
from datetime import datetime
from zoneinfo import ZoneInfo

try:
    import swisseph as swe
except ImportError:
    print(json.dumps({"error": "pyswisseph not installed"}), file=sys.stdout)
    sys.exit(1)

try:
    from geopy.geocoders import Nominatim
    from timezonefinder import TimezoneFinder
except ImportError:
    print(json.dumps({"error": "geopy or timezonefinder not installed"}), file=sys.stdout)
    sys.exit(1)

ZODIAC_SIGNS = {
    "Aries": (0, 30), "Taurus": (30, 60), "Gemini": (60, 90), "Cancer": (90, 120),
    "Leo": (120, 150), "Virgo": (150, 180), "Libra": (180, 210), "Scorpio": (210, 240),
    "Sagittarius": (240, 270), "Capricorn": (270, 300), "Aquarius": (300, 330), "Pisces": (330, 360)
}

def degrees_to_zodiac(longitude):
    longitude = longitude % 360
    for sign, (start, end) in ZODIAC_SIGNS.items():
        if start <= longitude < end:
            return sign, longitude - start
    return "Pisces", longitude - 330

def get_timezone_from_location(country, province, city):
    try:
        geolocator = Nominatim(user_agent="psychic_chat_astrology")
        location = geolocator.geocode(f"{city}, {province}, {country}", timeout=10)
        if not location:
            return None
        tz = TimezoneFinder().timezone_at(lat=location.latitude, lng=location.longitude)
        return tz
    except Exception as e:
        print(f"Error detecting timezone: {str(e)}", file=sys.stderr)
        return None

def get_coordinates(country, province, city):
    try:
        geolocator = Nominatim(user_agent="psychic_chat_astrology")
        location = geolocator.geocode(f"{city}, {province}, {country}", timeout=10)
        if location:
            return location.latitude, location.longitude
        return None, None
    except Exception as e:
        print(f"Error geocoding: {str(e)}", file=sys.stderr)
        return None, None

def calculate_birth_chart(birth_data):
    try:
        birth_date_str = birth_data.get("birth_date")
        birth_time_str = birth_data.get("birth_time")
        country = birth_data.get("birth_country")
        province = birth_data.get("birth_province")
        city = birth_data.get("birth_city")
        provided_tz = birth_data.get("birth_timezone")
        
        if not all([birth_date_str, birth_time_str, country, province, city]):
            return {"error": "Missing required fields", "success": False}
        
        lat, lng = get_coordinates(country, province, city)
        if lat is None or lng is None:
            return {"error": f"Could not find coordinates for {city}", "success": False}
        
        timezone_str = provided_tz or get_timezone_from_location(country, province, city)
        if not timezone_str:
            return {"error": f"Could not detect timezone", "success": False}
        
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
            return {"error": f"Could not parse birth time", "success": False}
        
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
        
        return {
            "rising_sign": asc_sign, "rising_degree": round(asc_deg, 2),
            "moon_sign": moon_sign, "moon_degree": round(moon_deg, 2),
            "sun_sign": sun_sign, "sun_degree": round(sun_deg, 2),
            "latitude": round(lat, 2), "longitude": round(lng, 2),
            "timezone": timezone_str, "utc_time": utc_dt.isoformat(), "success": True
        }
    except Exception as e:
        return {"error": str(e), "success": False}

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
            longitude = planet_pos[0]
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
