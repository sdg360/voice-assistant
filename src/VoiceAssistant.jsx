import React, { useState } from 'react';
import './index.css'; // make sure this points to where your custom CSS is

export default function VoiceAssistant() {
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [lang, setLang] = useState('en-US');

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const startListening = () => {
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
    synth.speak(utter);
  };

  const toggleLanguage = () => {
    setLang(prev => (prev === 'en-US' ? 'fr-CA' : 'en-US'));
  };

  return (
    <div className="voice-wrapper">
      <h1 className="voice-title">🎙️ Vimar Voice Assistant</h1>
      <p className="voice-subtitle">Tap below and start speaking!</p>

      <button
        className="voice-button"
        onClick={startListening}
        disabled={isListening}
      >
        {isListening ? '🎧 Listening…' : '🎤 Tap to Speak'}
      </button>

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
        🌐 Switch to {lang === 'en-US' ? 'French' : 'English'}
      </button>

      <label className="voice-label">🗣️ You said:</label>
      <div className="voice-log">
        {transcript || <span className="italic">Nothing yet</span>}
      </div>

      <label className="voice-label">🤖 Assistant says:</label>
      <div className="voice-response">
        {isLoading ? <span className="italic">Thinking…</span> : (response || <span className="italic">Waiting for a response…</span>)}
      </div>

      {history.length > 0 && (
        <div className="voice-history">
          <h2>📜 Conversation History:</h2>
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
