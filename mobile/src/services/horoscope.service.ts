import apiService from './api.service';

export interface Horoscope {
  sign: string;
  date: string;
  horoscope: string;
  mood: string;
  color: string;
  luckyNumber: number;
}

export interface AstrologyInsight {
  id: string;
  title: string;
  content: string;
  date: string;
  category: string;
}

export type ZodiacSign = 
  | 'aries' | 'taurus' | 'gemini' | 'cancer' 
  | 'leo' | 'virgo' | 'libra' | 'scorpio' 
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

class HoroscopeService {
  async getDailyHoroscope(sign: ZodiacSign): Promise<Horoscope> {
    try {
      const response = await apiService.get<{ horoscope: Horoscope }>(`/horoscope/${sign}/daily`);
      return response.horoscope;
    } catch (error) {
      console.error('Error fetching daily horoscope:', error);
      throw error;
    }
  }

  async getWeeklyHoroscope(sign: ZodiacSign): Promise<Horoscope> {
    try {
      const response = await apiService.get<{ horoscope: Horoscope }>(`/horoscope/${sign}/weekly`);
      return response.horoscope;
    } catch (error) {
      console.error('Error fetching weekly horoscope:', error);
      throw error;
    }
  }

  async getMonthlyHoroscope(sign: ZodiacSign): Promise<Horoscope> {
    try {
      const response = await apiService.get<{ horoscope: Horoscope }>(`/horoscope/${sign}/monthly`);
      return response.horoscope;
    } catch (error) {
      console.error('Error fetching monthly horoscope:', error);
      throw error;
    }
  }

  async getAstrologyInsights(): Promise<AstrologyInsight[]> {
    try {
      const response = await apiService.get<{ insights: AstrologyInsight[] }>('/astrology/insights');
      return response.insights || [];
    } catch (error) {
      console.error('Error fetching astrology insights:', error);
      return [];
    }
  }

  async getMoonPhase(): Promise<{ phase: string; description: string; date: string }> {
    try {
      const response = await apiService.get<{ moon: any }>('/moon-phase');
      return response.moon;
    } catch (error) {
      console.error('Error fetching moon phase:', error);
      throw error;
    }
  }

  async getBirthChart(birthDate: string, birthTime: string, birthPlace: string): Promise<any> {
    try {
      const response = await apiService.post('/astrology/birth-chart', {
        birthDate,
        birthTime,
        birthPlace,
      });
      return response;
    } catch (error) {
      console.error('Error fetching birth chart:', error);
      throw error;
    }
  }
}

export default new HoroscopeService();
