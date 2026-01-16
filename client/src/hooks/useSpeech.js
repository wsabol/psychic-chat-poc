import { useState, useCallback, useRef } from 'react';
import { logErrorFromCatch } from '../shared/errorLogger.js';

// Voice greetings in multiple languages
const voiceGreetings = {
  sophia: {
    'en-US': (name) => `Hello ${name}, I'm Sophia, your intuitive energy reader. Ready to explore your journey?`,
    'en-GB': (name) => `Hello ${name}, I'm Sophia, your intuitive energy reader. Ready to explore your journey?`,
    'es-ES': (name) => `Hola ${name}, soy Sophia, tu lectora de energía intuitiva. ¿Lista para explorar tu camino?`,
    'fr-FR': (name) => `Bonjour ${name}, je suis Sophia, votre lectrice d'énergie intuitive. Prêt à explorer votre chemin?`,
    'de-DE': (name) => `Hallo ${name}, ich bin Sophia, deine intuitive Energieleserin. Bereit, deine Reise zu erkunden?`,
    'it-IT': (name) => `Ciao ${name}, sono Sophia, la tua lettrice di energia intuitiva. Pronto a esplorare il tuo percorso?`,
    'pt-BR': (name) => `Olá ${name}, sou Sophia, sua leitora intuitiva de energia. Pronto para explorar sua jornada?`,
    'ja-JP': (name) => `こんにちは${name}、ソフィアです。あなたの直感的なエネルギーリーダー。準備はいいですか？`,
    'zh-CN': (name) => `你好${name}，我是索菲亚，你的直觉能量读者。准备探索你的旅程吗？`
  },
  cassandra: {
    'en-US': (name) => `Greetings ${name}, I am Cassandra, keeper of deep oracle wisdom. Let us begin.`,
    'en-GB': (name) => `Greetings ${name}, I am Cassandra, keeper of deep oracle wisdom. Let us begin.`,
    'es-ES': (name) => `Saludos ${name}, soy Cassandra, guardiana de la sabiduría profunda del oráculo. Comencemos.`,
    'fr-FR': (name) => `Salutations ${name}, je suis Cassandra, gardienne de la sagesse profonde de l'oracle. Commençons.`,
    'de-DE': (name) => `Grüße ${name}, ich bin Cassandra, Hüterin der tiefsten Orakelweisheit. Lassen Sie uns beginnen.`,
    'it-IT': (name) => `Saluti ${name}, sono Cassandra, custode della profonda saggezza dell'oracolo. Iniziamo.`,
    'pt-BR': (name) => `Saudações ${name}, sou Cassandra, guardiã da profunda sabedoria do oráculo. Vamos começar.`,
    'ja-JP': (name) => `ご挨拶${name}、カッサンドラです。深いオラクルの知恵の守り手。始めましょう。`,
    'zh-CN': (name) => `问候${name}，我是卡桑德拉，深层神谕智慧的守护者。让我们开始。`
  },
  meridian: {
    'en-US': (name) => `Welcome ${name}, I'm Meridian, your celestial alignment expert. Let's align your cosmic energy.`,
    'en-GB': (name) => `Welcome ${name}, I'm Meridian, your celestial alignment expert. Let's align your cosmic energy.`,
    'es-ES': (name) => `Bienvenido ${name}, soy Meridian, tu experta en alineación celestial. Alineemos tu energía cósmica.`,
    'fr-FR': (name) => `Bienvenue ${name}, je suis Meridian, votre experte en alignement céleste. Alignons votre énergie cosmique.`,
    'de-DE': (name) => `Willkommen ${name}, ich bin Meridian, deine Expertin für himmlische Ausrichtung. Lass uns deine kosmische Energie ausrichten.`,
    'it-IT': (name) => `Benvenuto ${name}, sono Meridian, la tua esperta di allineamento celeste. Allineiamo la tua energia cosmica.`,
    'pt-BR': (name) => `Bem-vindo ${name}, sou Meridian, sua especialista em alinhamento celestial. Vamos alinhar sua energia cósmica.`,
    'ja-JP': (name) => `ようこそ${name}、メリディアンです。天体配置の専門家。あなたの宇宙エネルギーを調和させましょう。`,
    'zh-CN': (name) => `欢迎${name}，我是Meridian，你的天体对齐专家。让我们对齐你的宇宙能量。`
  },
  leo: {
    'en-US': (name) => `Hello ${name}, Leo speaking. I'm your stellar mystic. What insights do you seek?`,
    'en-GB': (name) => `Hello ${name}, Leo speaking. I'm your stellar mystic. What insights do you seek?`,
    'es-ES': (name) => `Hola ${name}, Leo aquí. Soy tu místico estelar. ¿Qué perspectivas buscas?`,
    'fr-FR': (name) => `Bonjour ${name}, c'est Leo. Je suis votre mystique stellaire. Quels aperçus cherchez-vous?`,
    'de-DE': (name) => `Hallo ${name}, Leo hier. Ich bin dein Sternenmystiker. Welche Erkenntnisse suchst du?`,
    'it-IT': (name) => `Ciao ${name}, sono Leo. Sono il tuo mistico stellare. Quali intuizioni cerchi?`,
    'pt-BR': (name) => `Olá ${name}, Leo aqui. Sou seu místico estelar. Que perspectivas você procura?`,
    'ja-JP': (name) => `こんにちは${name}、レオです。あなたの星の神秘家。どんな洞察を求めていますか？`,
    'zh-CN': (name) => `你好${name}，我是Leo。你的星辰神秘家。你寻求什么洞察？`
  }
};

/**
 * useSpeech - Custom hook for text-to-speech functionality
 * Uses Web Speech API with fallback graceful degradation
 */
export function useSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentText, setCurrentText] = useState('');
  const [progress, setProgress] = useState(0);
  
  const utteranceRef = useRef(null);
  const synth = useRef(window.speechSynthesis);
  const cachedVoices = useRef({});
  const progressIntervalRef = useRef(null);

  const selectVoice = useCallback((voiceName = 'sophia') => {
    const voices = synth.current.getVoices();
    if (voices.length === 0) return null;

    if (cachedVoices.current[voiceName]) {
      return cachedVoices.current[voiceName];
    }

    let selectedVoice = null;

    if (voiceName === 'sophia') {
      selectedVoice = voices.find(v => v.name === 'Google UK English Female');
    } else if (voiceName === 'cassandra') {
      selectedVoice = voices.find(v => v.name === 'Microsoft Zira');
    } else if (voiceName === 'meridian') {
      selectedVoice = voices.find(v => v.name === 'Google US English');
    } else if (voiceName === 'leo') {
      selectedVoice = voices.find(v => v.name === 'Microsoft David');
    }

    if (!selectedVoice) {
      if (voiceName === 'leo') {
        selectedVoice = voices.find(v => v.name.includes('David') || v.name.includes('Mark'));
      } else {
        selectedVoice = voices.find(v => v.name.includes('Zira') || v.name.includes('Google')) ||
                       voices.find(v => !v.name.toLowerCase().includes('male'));
      }
    }

    if (!selectedVoice) {
      selectedVoice = voices[0];
    }

    if (selectedVoice) {
      cachedVoices.current[voiceName] = selectedVoice;
    }

    return selectedVoice;
  }, []);

  const isSupported = useCallback(() => {
    return 'speechSynthesis' in window;
  }, []);

  const clearProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    try {
      clearProgress();
      synth.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentText('');
      setProgress(0);
      setError(null);
    } catch (err) {
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [clearProgress]);

  const resume = useCallback(() => {
    try {
      synth.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
      
      // Restart progress interval
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 95));
      }, 100);
    } catch (err) {
      logErrorFromCatch('Resume error:', err);
    }
  }, [clearProgress]);

  const pause = useCallback(() => {
    try {
      synth.current.pause();
      clearProgress();
      setIsPaused(true);
      setIsPlaying(false);
    } catch (err) {
      logErrorFromCatch('Pause error:', err);
    }
  }, [clearProgress]);

  const speak = useCallback((text, options = {}) => {
    if (!isSupported()) {
      setError('Speech synthesis not supported');
      return;
    }

    stop();
    setError(null);
    setProgress(0);
    setIsLoading(true);

    try {
      const cleanText = text.replace(/<[^>]*>/g, ' ').trim();
      
      if (!cleanText) {
        setError('No text to speak');
        setIsLoading(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voice = selectVoice(options.voiceName);
      if (voice) utterance.voice = voice;

      utterance.rate = options.rate || 0.95;
      utterance.pitch = options.pitch || 1.2;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsLoading(false);
        setIsPlaying(true);
        setIsPaused(false);
        setCurrentText(cleanText);
        setProgress(0);
        
        // Start progress tracking
        clearProgress();
        progressIntervalRef.current = setInterval(() => {
          setProgress(prev => Math.min(prev + 2, 95));
        }, 100);
      };

      utterance.onend = () => {
        clearProgress();
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
      };

      utterance.onerror = (event) => {
        clearProgress();
        if (event.error !== 'interrupted') {
          setError(`Speech error: ${event.error}`);
        }
        setIsPlaying(false);
        setIsLoading(false);
      };

      utteranceRef.current = utterance;
      synth.current.speak(utterance);

    } catch (err) {
      setError(`Failed: ${err.message}`);
      setIsLoading(false);
    }
  }, [stop, selectVoice, isSupported, clearProgress]);

  return {
    speak,
    stop,
    pause,
    resume,
    isPlaying,
    isPaused,
    isLoading,
    error,
    isSupported: isSupported(),
    isSpeaking: isPlaying || isLoading,
    currentText,
    progress,
    voiceGreetings
  };
}
