import apiService from './api.service';

export interface PersonalInfo {
  firstName?: string;
  lastName?: string;
  email: string;
  birthDate: string;
  birthTime?: string;
  birthCity?: string;
  birthState?: string;
  birthCountry?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  addressPreference?: string;
}

class ProfileService {
  /**
   * Get user's personal information
   */
  async getPersonalInfo(userId: string): Promise<PersonalInfo> {
    const response = await apiService.get<PersonalInfo>(`/user-profile/${userId}`);
    return response;
  }

  /**
   * Save user's personal information
   */
  async savePersonalInfo(userId: string, data: Partial<PersonalInfo>): Promise<void> {
    await apiService.put<void>(`/user-profile/${userId}`, data);
  }

  /**
   * Trigger astrology sync (calculate birth chart)
   */
  async triggerAstrologySync(userId: string): Promise<{ success: boolean }> {
    return await apiService.post<{ success: boolean }>(`/astrology/sync/${userId}`, {});
  }
}

export default new ProfileService();
