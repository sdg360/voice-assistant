import React, { useState, useEffect } from 'react';
import './index.css';

export default function VoiceAssistant() {
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState(() => {
    const stored = localStorage.getItem('voiceHistory');
    return stored ? JSON.parse(stored) : [];
  });
  const [lang, setLang] = useState('en-US');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const translations = {
    'en-US': {
      title: '🎙️ SDG360 Voice Assistant',
      subtitle: 'Tap below and start speaking!',
      tapToSpeak: '🎤 Tap to Speak',
      listening: '🎧 Listening…',
      switchTo: 'Switch to French',
      voicePreference: 'Voice Preference',
      youSaid: '🗣️ You said:',
      assistantSays: '🤖 Assistant says:',
      thinking: 'Thinking…',
      waiting: 'Waiting for a response…',
      conversationHistory: '📜 Conversation History:',
      clear: 'Clear',
      notSupported: 'Speech recognition is not supported in your browser.'
    },
    'fr-CA': {
      title: '🎙️ Assistant vocal SDG360',
      subtitle: 'Appuyez ci-dessous et commencez à parler!',
      tapToSpeak: '🎤 Appuyez pour parler',
      listening: '🎧 Écoute en cours…',
      switchTo: 'Passer à l’anglais',
      voicePreference: 'Préférence de voix',
      youSaid: '🗣️ Vous avez dit :',
      assistantSays: '🤖 L’assistant dit :',
      thinking: 'Réflexion…',
      waiting: 'En attente de réponse…',
      conversationHistory: '📜 Historique des conversations :',
      clear: 'Effacer',
      notSupported: 'La reconnaissance vocale n’est pas prise en charge dans votre navigateur.'
    }
  };

  const t = translations[lang];

  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
      const defaultVoice = allVoices.find(v => v.lang === lang && /female/i.test(v.name)) || allVoices[0];
      setSelectedVoice(defaultVoice);
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('voiceHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const handleVoicesReady = () => {
      const utter = new SpeechSynthesisUtterance("Hello from the assistant!");
      utter.lang = 'en-US';

      const availableVoices = window.speechSynthesis.getVoices();
      const preferred = availableVoices.find(v =>
        v.lang === 'en-US' && v.name.toLowerCase().includes('female')
      );
      if (preferred) utter.voice = preferred;

      window.speechSynthesis.speak(utter);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = handleVoicesReady;
    } else {
      handleVoicesReady();
    }
  }, []);

  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setSpeechSupported(false);
      console.warn("Speech recognition is not supported in this browser.");
    }
  }, []);

  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      console.warn("Speech recognition is not supported.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const voiceInput = event.results[0][0].transcript;
      setTranscript(voiceInput);
      sendToWebhook(voiceInput);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const sendToWebhook = async (text, isTest = false) => {
    try {
      setIsLoading(true);
      const url = isTest ? import.meta.env.VITE_WEBHOOK_TEST_URL : import.meta.env.VITE_WEBHOOK_URL;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      });

      const data = await res.json();
      const reply = data.response || data || 'Done!';
      setResponse(reply);
      speak(reply);
      setHistory(prev => [...prev, { input: text, output: reply }]);
    } catch (error) {
      console.error('Webhook error:', error);
      const fallback = 'Sorry, something went wrong.';
      setResponse(fallback);
      speak(fallback);
      setHistory(prev => [...prev, { input: text, output: fallback }]);
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text) => {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    if (selectedVoice) utter.voice = selectedVoice;
    synth.speak(utter);
  };

  const toggleLanguage = () => {
    setLang(prev => (prev === 'en-US' ? 'fr-CA' : 'en-US'));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('voiceHistory');
  };

  return (
    <div className="voice-wrapper">
      <h1 className="voice-title">{t.title}</h1>
      <p className="voice-subtitle">{t.subtitle}</p>

      {speechSupported ? (
        <button
          className="voice-button"
          onClick={startListening}
          disabled={isListening}
        >
          {isListening ? t.listening : t.tapToSpeak}
        </button>
      ) : (
        <p style={{ color: 'red', textAlign: 'center' }}>{t.notSupported}</p>
      )}

      <button
        style={{ display: 'none' }}
        className="voice-button secondary"
        onClick={() => sendToWebhook('This is a test workflow input', true)}
      >
        🧪 Run Test Workflow
      </button>

      <button
        className="voice-button lang-toggle"
        onClick={toggleLanguage}
      >
        🌐 {t.switchTo}
      </button>

      <div style={{ display: 'none', margin: '1rem 0' }}>
        <label className="voice-label">{t.voicePreference}:</label>
        <select
          className="voice-log"
          value={selectedVoice?.name || ''}
          onChange={(e) => setSelectedVoice(voices.find(v => v.name === e.target.value))}
        >
          {voices.map((v, i) => (
            <option key={i} value={v.name}>{v.name}</option>
          ))}
        </select>
      </div>

      <label className="voice-label">{t.youSaid}</label>
      <div className="voice-log">
        {transcript || <span className="italic">Nothing yet</span>}
      </div>

      <label className="voice-label">{t.assistantSays}</label>
      <div className="voice-response">
        {isLoading ? <span className="italic">{t.thinking}</span> : (response || <span className="italic">{t.waiting}</span>)}
      </div>

      {history.length > 0 && (
        <div className="voice-history">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{t.conversationHistory}</h2>
            <button
              onClick={clearHistory}
              style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', background: '#f87171', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              {t.clear}
            </button>
          </div>
          {history.map((entry, i) => (
            <div className="voice-history-entry" key={i}>
              <p><strong>You:</strong> {entry.input}</p>
              <p><strong>Assistant:</strong> {entry.output}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
