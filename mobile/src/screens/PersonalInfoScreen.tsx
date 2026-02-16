import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import profileService, { PersonalInfo } from '../services/profile.service';
import WelcomeModal from '../components/WelcomeModal';

const PersonalInfoScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { updateOnboardingStep, onboardingStatus } = useOnboarding();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  
  const [formData, setFormData] = useState<Partial<PersonalInfo>>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    birthDate: '',
    birthTime: '',
    birthCity: '',
    birthState: '',
    birthCountry: '',
    phoneNumber: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadPersonalInfo();
  }, [user?.uid]);

  const loadPersonalInfo = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const data = await profileService.getPersonalInfo(user.uid);
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || user.email || '',
        birthDate: data.birthDate || '',
        birthTime: data.birthTime || '',
        birthCity: data.birthCity || '',
        birthState: data.birthState || '',
        birthCountry: data.birthCountry || '',
        phoneNumber: data.phoneNumber || '',
      });
    } catch (err: any) {
      console.error('Failed to load personal info:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.birthDate?.trim()) {
      newErrors.birthDate = 'Birth date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (!user?.uid) return;

    try {
      setSaving(true);
      await profileService.savePersonalInfo(user.uid, formData);

      // Trigger astrology sync if we have birth info
      if (formData.birthDate && formData.birthCity) {
        try {
          await profileService.triggerAstrologySync(user.uid);
        } catch (err) {
          console.error('Astrology sync failed:', err);
        }
      }

      // Update onboarding step
      if (onboardingStatus?.isOnboarding) {
        await updateOnboardingStep('personal_info');
        // Show welcome modal
        setShowWelcome(true);
      } else {
        Alert.alert('Success', 'Your information has been saved');
      }
    } catch (err: any) {
      console.error('Failed to save personal info:', err);
      Alert.alert('Error', err.message || 'Failed to save personal information');
    } finally {
      setSaving(false);
    }
  };

  const handleWelcomeClose = async () => {
    setShowWelcome(false);
    
    // Update welcome step
    try {
      await updateOnboardingStep('welcome');
    } catch (err) {
      console.error('Failed to update welcome step:', err);
    }

    // Navigate to Chat
    (navigation as any).navigate('MainTabs', { screen: 'Chat' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9d4edd" />
        <Text style={styles.loadingText}>Loading your information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Personal Information</Text>
          <Text style={styles.headerSubtitle}>
            Help us personalize your experience
          </Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={[styles.input, errors.firstName && styles.inputError]}
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              placeholder="John"
              placeholderTextColor="#666"
            />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={[styles.input, errors.lastName && styles.inputError]}
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              placeholder="Doe"
              placeholderTextColor="#666"
            />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="you@example.com"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
        </View>

        {/* Birth Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Birth Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Birth Date * (DD-MMM-YYYY)</Text>
            <TextInput
              style={[styles.input, errors.birthDate && styles.inputError]}
              value={formData.birthDate}
              onChangeText={(text) => setFormData({ ...formData, birthDate: text })}
              placeholder="01-Jan-2000"
              placeholderTextColor="#666"
            />
            <Text style={styles.hint}>Example: 15-Mar-1990</Text>
            {errors.birthDate && <Text style={styles.errorText}>{errors.birthDate}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Birth Time (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.birthTime}
              onChangeText={(text) => setFormData({ ...formData, birthTime: text })}
              placeholder="14:30"
              placeholderTextColor="#666"
            />
            <Text style={styles.hint}>24-hour format (HH:MM)</Text>
          </View>
        </View>

        {/* Birth Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Birth Location</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.birthCity}
              onChangeText={(text) => setFormData({ ...formData, birthCity: text })}
              placeholder="New York"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>State/Province</Text>
            <TextInput
              style={styles.input}
              value={formData.birthState}
              onChangeText={(text) => setFormData({ ...formData, birthState: text })}
              placeholder="NY"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              value={formData.birthCountry}
              onChangeText={(text) => setFormData({ ...formData, birthCountry: text })}
              placeholder="United States"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Contact</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
              placeholder="+1 234 567 8900"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Information</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <WelcomeModal visible={showWelcome} onClose={handleWelcomeClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9d4edd',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#f72585',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#f72585',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#9d4edd',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PersonalInfoScreen;
