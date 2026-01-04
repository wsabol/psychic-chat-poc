#!/usr/bin/env python3
"""Test script to check moon phase calculation for Jan 3, 2026"""
import json
from datetime import datetime
from zoneinfo import ZoneInfo

try:
    import swisseph as swe
except ImportError:
    print("swisseph not installed")
    exit(1)

# Test date: January 3, 2026
test_dates = [
    (2026, 1, 1),   # Jan 1
    (2026, 1, 2),   # Jan 2
    (2026, 1, 3),   # Jan 3 - TODAY (claimed to be full moon)
    (2026, 1, 4),   # Jan 4
    (2026, 1, 5),   # Jan 5
    (2026, 1, 10),  # Jan 10
    (2026, 1, 18),  # Jan 18
]

phase_names = ["newMoon", "waxingCrescent", "firstQuarter", "waxingGibbous", "fullMoon", "waningGibbous", "lastQuarter", "waningCrescent"]

print("=" * 80)
print("MOON PHASE CALCULATION TEST - January 2026")
print("=" * 80)

for year, month, day in test_dates:
    # Use noon UTC
    jd = swe.julday(year, month, day, 12.0)
    
    sun_pos = swe.calc_ut(jd, swe.SUN)
    moon_pos = swe.calc_ut(jd, swe.MOON)
    
    sun_lon = sun_pos[0][0]
    moon_lon = moon_pos[0][0]
    
    phase_angle = (moon_lon - sun_lon) % 360
    phase_index = int((phase_angle / 360) * 8) % 8
    phase = phase_names[phase_index]
    cycle_percentage = round((phase_angle / 360) * 100, 1)
    
    print(f"\n{year}-{month:02d}-{day:02d} (noon UTC):")
    print(f"  Sun longitude:   {sun_lon:.2f}°")
    print(f"  Moon longitude:  {moon_lon:.2f}°")
    print(f"  Phase angle:     {phase_angle:.2f}°")
    print(f"  Phase index:     {phase_index}")
    print(f"  Phase name:      {phase}")
    print(f"  Cycle %:         {cycle_percentage}%")
    
    # Determine if this looks like it's around full moon (180°)
    if 160 <= phase_angle <= 200:
        print(f"  ✓ THIS IS NEAR FULL MOON!")

print("\n" + "=" * 80)
print("PHASE ANGLE RANGES:")
print("=" * 80)
print("0-45°     = newMoon (index 0)")
print("45-90°    = waxingCrescent (index 1)")
print("90-135°   = firstQuarter (index 2)")
print("135-180°  = waxingGibbous (index 3)")
print("180-225°  = fullMoon (index 4)")
print("225-270°  = waningGibbous (index 5)")
print("270-315°  = lastQuarter (index 6)")
print("315-360°  = waningCrescent (index 7)")
print("=" * 80)
