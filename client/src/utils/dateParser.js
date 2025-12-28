/**
 * Parse date string in multiple formats and return as YYYY-MM-DD
 * Supports: "01 Jan 2000", "01-Jan-2000", "01/Jan/2000", "01 jan 2000", etc.
 */
export function parseDateForStorage(dateString) {
    if (!dateString) return '';
    try {
        const months = { 
            'jan': '01', 'january': '01',
            'feb': '02', 'february': '02',
            'mar': '03', 'march': '03',
            'apr': '04', 'april': '04',
            'may': '05',
            'jun': '06', 'june': '06',
            'jul': '07', 'july': '07',
            'aug': '08', 'august': '08',
            'sep': '09', 'sept': '09', 'september': '09',
            'oct': '10', 'october': '10',
            'nov': '11', 'november': '11',
            'dec': '12', 'december': '12'
        };
        
        const normalized = dateString.trim();
        let day, monthStr, year;
        const separators = ['-', ' ', '/'];
        
        for (const sep of separators) {
            if (normalized.includes(sep)) {
                const parts = normalized.split(sep).filter(p => p.trim().length > 0);
                if (parts.length === 3) {
                    day = parts[0].trim();
                    monthStr = parts[1].trim().toLowerCase();
                    year = parts[2].trim();
                    break;
                }
            }
        }
        
        if (!day || !monthStr || !year) {
            console.error('[DATE] Could not parse:', dateString);
            return dateString;
        }
        
        const month = months[monthStr];
        if (!month) {
            console.error('[DATE] Unknown month:', monthStr);
            return dateString;
        }
        
        const dayNum = parseInt(day, 10);
        const yearNum = parseInt(year, 10);
        
        if (isNaN(dayNum) || isNaN(yearNum)) {
            console.error('[DATE] NaN parsing day/year');
            return dateString;
        }
        
        if (dayNum < 1 || dayNum > 31) {
            console.error('[DATE] Day out of range:', dayNum);
            return dateString;
        }
        
        if (yearNum < 1800 || yearNum > 2100) {
            console.error('[DATE] Year out of range:', yearNum);
            return dateString;
        }
        
        const paddedDay = dayNum.toString().padStart(2, '0');
        const result = `${yearNum}-${month}-${paddedDay}`;
        console.log('[DATE] Parsed successfully:', dateString, '→', result);
        return result;
    } catch (e) {
        console.error('[DATE] Exception:', e.message);
        return dateString;
    }
}
