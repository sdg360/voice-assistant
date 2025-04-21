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
  const [voiceReady, setVoiceReady] = useState(false);

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
      notSupported: 'Speech recognition is not supported in your browser.',
      startVoice: '🔊 Tap to enable speech'
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
      notSupported: 'La reconnaissance vocale n’est pas prise en charge dans votre navigateur.',
      startVoice: '🔊 Appuyez pour activer la parole'
    }
  };

  const t = translations[lang];

  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length === 0) return;
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
    if (!('speechSynthesis' in window)) {
      alert("Speech synthesis is not supported in this browser.");
    }
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setSpeechSupported(false);
      console.warn("Speech recognition is not supported in this browser.");
    }
  }, []);

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    if (selectedVoice) utter.voice = selectedVoice;
    synth.speak(utter);
  };

  const triggerGreeting = () => {
    const utter = new SpeechSynthesisUtterance("Hello from the assistant!");
    utter.lang = lang;
    if (selectedVoice) utter.voice = selectedVoice;
    window.speechSynthesis.speak(utter);
    setVoiceReady(true);
  };

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

      {!voiceReady && (
        <button
          className="voice-button"
          onClick={triggerGreeting}
        >
          {t.startVoice}
        </button>
      )}

      {voiceReady && speechSupported ? (
        <button
          className="voice-button"
          onClick={startListening}
          disabled={isListening}
        >
          {isListening ? t.listening : t.tapToSpeak}
        </button>
      ) : null}

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
