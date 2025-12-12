import { useState, useEffect, useCallback } from "react";
import { fetchWithTokenRefresh } from "../utils/fetchWithTokenRefresh.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export function usePersonalInfo(userId, token) {
    const [birthDate, setBirthDate] = useState(null);
    const [birthTime, setBirthTime] = useState(null);
    const [birthCity, setBirthCity] = useState(null);
    const [birthState, setBirthState] = useState(null);
    const [birthCountry, setBirthCountry] = useState(null);
    const [firstName, setFirstName] = useState(null);
    const [lastName, setLastName] = useState(null);
    const [horoscope, setHoroscope] = useState(null);
    
    const fetchPersonalInfo = useCallback(async () => {
        try {
            if (!userId || !token) {
                console.warn('[PERSONAL-INFO] Missing userId or token');
                return;
            }
            const headers = { 'Authorization': `Bearer ${token}` };
            const res = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, { headers });
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            const data = await res.json();
            
            if (data.first_name) setFirstName(data.first_name);
            if (data.last_name) setLastName(data.last_name);
            if (data.birth_date) setBirthDate(data.birth_date);
            if (data.birth_time) setBirthTime(data.birth_time);
            if (data.birth_city) setBirthCity(data.birth_city);
            if (data.birth_state) setBirthState(data.birth_state);
            if (data.birth_country) setBirthCountry(data.birth_country);
            if (data.horoscope) setHoroscope(data.horoscope);
        } catch (err) {
            console.error('[PERSONAL-INFO] Error fetching:', err);
        }
    }, [userId, token]);
    
    // Load on mount or userId change
    useEffect(() => {
        if (userId && token) {
            fetchPersonalInfo();
        }
    }, [userId, token, fetchPersonalInfo]);
    
    return {
        birthDate,
        birthTime,
        birthCity,
        birthState,
        birthCountry,
        firstName,
        lastName,
        horoscope,
        fetchPersonalInfo,
    };
}
