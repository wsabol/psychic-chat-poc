import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Text style={styles.icon}>🎉</Text>
              <Text style={styles.title}>Welcome to Starship Psychics!</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ Your Journey Begins</Text>
              <Text style={styles.text}>
                Thank you for joining our cosmic community. Your personal information has been saved,
                and you're all set to explore the mystical universe of psychic guidance and astrology.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔮 What's Next?</Text>
              <View style={styles.featureList}>
                <View style={styles.feature}>
                  <Text style={styles.featureIcon}>💬</Text>
                  <Text style={styles.featureText}>
                    Start chatting with our Oracle for instant psychic guidance
                  </Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureIcon}>⭐</Text>
                  <Text style={styles.featureText}>
                    Check your personalized daily horoscope
                  </Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureIcon}>🌟</Text>
                  <Text style={styles.featureText}>
                    Explore your detailed birth chart and astrological insights
                  </Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureIcon}>👤</Text>
                  <Text style={styles.featureText}>
                    Update your profile anytime from the Profile tab
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.footerText}>
                We're excited to guide you on this mystical journey! 🌙
              </Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Start Exploring</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#9d4edd',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9d4edd',
    marginBottom: 12,
  },
  text: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  featureList: {
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  footerText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#9d4edd',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default WelcomeModal;
