/**
 * Debug utility to list all available system voices
 * Open browser console and run: getAvailableVoices()
 */

export function getAvailableVoices() {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  
  console.log('=== AVAILABLE VOICES ===');
  console.log(`Total voices: ${voices.length}\n`);
  
  voices.forEach((voice, index) => {
    console.log(`${index + 1}. ${voice.name}`);
    console.log(`   Lang: ${voice.lang}`);
    console.log(`   Default: ${voice.default}`);
    console.log(`   Local Service: ${voice.localService}`);
    console.log('');
  });
  
  return voices;
}

// Make available in window for console access
if (typeof window !== 'undefined') {
  window.getAvailableVoices = getAvailableVoices;
}
