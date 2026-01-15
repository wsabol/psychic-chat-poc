/**
 * Zodiac Sign Calculations
 * Based on birth date (month/day only - no time/location needed)
 */

const ZODIAC_SIGNS = [
    { name: 'Capricorn', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
    { name: 'Aquarius', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
    { name: 'Pisces', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
    { name: 'Aries', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
    { name: 'Taurus', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
    { name: 'Gemini', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
    { name: 'Cancer', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
    { name: 'Leo', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
    { name: 'Virgo', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
    { name: 'Libra', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
    { name: 'Scorpio', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
    { name: 'Sagittarius', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 }
];

/**
 * Calculate sun sign from birth date (YYYY-MM-DD format)
 * @param {string} birthDateStr - Birth date in ISO format
 * @returns {string|null} Zodiac sign name
 */
export function calculateSunSignFromDate(birthDateStr) {
    if (!birthDateStr) return null;
    
    try {
        const [year, month, day] = birthDateStr.split('-').map(Number);
        
        if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }
        
        for (const sign of ZODIAC_SIGNS) {
            if (sign.startMonth < sign.endMonth) {
                // Normal case (e.g., Aries: 3/21 - 4/19)
                if ((month === sign.startMonth && day >= sign.startDay) ||
                    (month === sign.endMonth && day <= sign.endDay)) {
                    return sign.name;
                }
            } else {
                // Year-crossing case (e.g., Capricorn: 12/22 - 1/19)
                if ((month === sign.startMonth && day >= sign.startDay) ||
                    (month === sign.endMonth && day <= sign.endDay)) {
                    return sign.name;
                }
            }
        }
        
        return null;
    } catch (err) {
        return null;
    }
}
