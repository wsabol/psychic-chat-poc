import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import horoscopeService, { Horoscope, ZodiacSign } from '../services/horoscope.service';

const zodiacSigns: { sign: ZodiacSign; name: string; emoji: string }[] = [
  { sign: 'aries', name: 'Aries', emoji: '♈' },
  { sign: 'taurus', name: 'Taurus', emoji: '♉' },
  { sign: 'gemini', name: 'Gemini', emoji: '♊' },
  { sign: 'cancer', name: 'Cancer', emoji: '♋' },
  { sign: 'leo', name: 'Leo', emoji: '♌' },
  { sign: 'virgo', name: 'Virgo', emoji: '♍' },
  { sign: 'libra', name: 'Libra', emoji: '♎' },
  { sign: 'scorpio', name: 'Scorpio', emoji: '♏' },
  { sign: 'sagittarius', name: 'Sagittarius', emoji: '♐' },
  { sign: 'capricorn', name: 'Capricorn', emoji: '♑' },
  { sign: 'aquarius', name: 'Aquarius', emoji: '♒' },
  { sign: 'pisces', name: 'Pisces', emoji: '♓' },
];

const HoroscopeScreen = () => {
  const [selectedSign, setSelectedSign] = useState<ZodiacSign>('aries');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [horoscope, setHoroscope] = useState<Horoscope | null>(null);
  const [loading, setLoading] = useState(false);
  const [moonPhase, setMoonPhase] = useState<any>(null);

  useEffect(() => {
    loadHoroscope();
    loadMoonPhase();
  }, [selectedSign, period]);

  const loadHoroscope = async () => {
    try {
      setLoading(true);
      let data: Horoscope;
      
      if (period === 'daily') {
        data = await horoscopeService.getDailyHoroscope(selectedSign);
      } else if (period === 'weekly') {
        data = await horoscopeService.getWeeklyHoroscope(selectedSign);
      } else {
        data = await horoscopeService.getMonthlyHoroscope(selectedSign);
      }
      
      setHoroscope(data);
    } catch (error) {
      console.error('Error loading horoscope:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoonPhase = async () => {
    try {
      const moon = await horoscopeService.getMoonPhase();
      setMoonPhase(moon);
    } catch (error) {
      console.error('Error loading moon phase:', error);
    }
  };

  const renderZodiacSelector = () => (
    <View style={styles.zodiacContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {zodiacSigns.map(({ sign, name, emoji }) => (
          <TouchableOpacity
            key={sign}
            style={[styles.zodiacButton, selectedSign === sign && styles.zodiacButtonActive]}
            onPress={() => setSelectedSign(sign)}
          >
            <Text style={styles.zodiacEmoji}>{emoji}</Text>
            <Text style={[styles.zodiacName, selectedSign === sign && styles.zodiacNameActive]}>
              {name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodContainer}>
      {(['daily', 'weekly', 'monthly'] as const).map(p => (
        <TouchableOpacity
          key={p}
          style={[styles.periodButton, period === p && styles.periodButtonActive]}
          onPress={() => setPeriod(p)}
        >
          <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Horoscope</Text>
      </View>

      {renderZodiacSelector()}
      {renderPeriodSelector()}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9d4edd" />
            <Text style={styles.loadingText}>Loading your horoscope...</Text>
          </View>
        ) : horoscope ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {zodiacSigns.find(z => z.sign === selectedSign)?.emoji} {zodiacSigns.find(z => z.sign === selectedSign)?.name}
              </Text>
              <Text style={styles.date}>{horoscope.date}</Text>
              <Text style={styles.horoscopeText}>{horoscope.horoscope}</Text>
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Mood</Text>
                <Text style={styles.detailValue}>{horoscope.mood}</Text>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Lucky Color</Text>
                <View style={[styles.colorCircle, { backgroundColor: horoscope.color }]} />
                <Text style={styles.detailValue}>{horoscope.color}</Text>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Lucky Number</Text>
                <Text style={styles.detailValue}>{horoscope.luckyNumber}</Text>
              </View>
            </View>

            {moonPhase && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🌙 Moon Phase</Text>
                <Text style={styles.moonPhase}>{moonPhase.phase}</Text>
                <Text style={styles.moonDescription}>{moonPhase.description}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.insightsButton}>
              <Text style={styles.insightsButtonText}>View Astrology Insights</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No horoscope available</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  zodiacContainer: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  zodiacButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  zodiacButtonActive: {
    backgroundColor: '#9d4edd',
  },
  zodiacEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  zodiacName: {
    color: '#999',
    fontSize: 12,
  },
  zodiacNameActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    padding: 10,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#2a2a3e',
  },
  periodButtonActive: {
    backgroundColor: '#9d4edd',
  },
  periodText: {
    color: '#999',
    fontSize: 14,
  },
  periodTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#999',
    marginTop: 10,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    color: '#999',
    fontSize: 14,
    marginBottom: 15,
  },
  horoscopeText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  detailLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  detailValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginVertical: 8,
  },
  moonPhase: {
    color: '#9d4edd',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moonDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  insightsButton: {
    backgroundColor: '#9d4edd',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  insightsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});

export default HoroscopeScreen;
