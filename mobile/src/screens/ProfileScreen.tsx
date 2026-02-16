import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  // Check if user has a temporary email
  const isTempUser = user?.email?.startsWith('temp_');
  const displayEmail = isTempUser ? '' : user?.email;
  const emailPlaceholder = isTempUser ? 'Add your email address' : 'User';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayEmail?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.email}>{displayEmail || emailPlaceholder}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Subscription' as never)}
          >
            <Text style={styles.cardTitle}>⭐ Manage Subscription</Text>
            <Text style={styles.cardSubtitle}>View plans and billing</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📧 Email</Text>
            <Text style={isTempUser ? styles.cardPlaceholder : styles.cardValue}>
              {displayEmail || 'Not set - Add your email'}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔔 Notifications</Text>
            <Text style={styles.cardSubtitle}>Manage your notification preferences</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Astrology Profile</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>♈ Zodiac Sign</Text>
            <Text style={styles.cardSubtitle}>Tap to set your sign</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🌟 Birth Chart</Text>
            <Text style={styles.cardSubtitle}>Create your personalized birth chart</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9d4edd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
  },
  email: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  cardValue: {
    fontSize: 14,
    color: '#9d4edd',
    fontWeight: '500',
  },
  cardPlaceholder: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default ProfileScreen;
