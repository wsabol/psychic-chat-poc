/**
 * Debug utility to list all available system voices
 * Open browser console and run: getAvailableVoices()
 */

export function getAvailableVoices() {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  
  
  voices.forEach((voice, index) => {
  });
  
  return voices;
}

// Make available in window for console access
if (typeof window !== 'undefined') {
  window.getAvailableVoices = getAvailableVoices;
}

