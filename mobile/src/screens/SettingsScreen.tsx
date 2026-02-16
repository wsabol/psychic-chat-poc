import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { auth } from '../config/firebase';

const SettingsScreen = () => {
  const handleLogout = async () => {
    await auth().signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings Screen</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1e', justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { fontSize: 24, color: '#fff', fontWeight: 'bold', marginBottom: 20 },
  button: { backgroundColor: '#7c63d8', borderRadius: 10, padding: 15, width: 200, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default SettingsScreen;
