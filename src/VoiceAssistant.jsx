import React, { useState } from 'react';

export default function VoiceAssistant() {
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'en-US';
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

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const sendToWebhook = async (text) => {
    try {
      const res = await fetch('https://your-n8n-domain.com/webhook/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      });
      const data = await res.json();
      const reply = data.response || 'Done!';
      setResponse(reply);
      speak(reply);
    } catch (error) {
      console.error('Error:', error);
      const fallback = 'Sorry, something went wrong.';
      setResponse(fallback);
      speak(fallback);
    }
  };

  const speak = (text) => {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    synth.speak(utter);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 0 12px rgba(0,0,0,0.1)', padding: '32px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h1>🎤 Vimar Voice Assistant</h1>
        <button
          style={{
            padding: '12px 24px',
            borderRadius: '999px',
            fontSize: '16px',
            color: '#fff',
            backgroundColor: isListening ? '#e53e3e' : '#3182ce',
            border: 'none',
            cursor: 'pointer',
            marginTop: '20px'
          }}
          onClick={startListening}
          disabled={isListening}
        >
          {isListening ? 'Listening…' : 'Tap to Speak'}
        </button>
        <div style={{ marginTop: '24px' }}>
          <p><strong>You said:</strong> {transcript}</p>
          <p><strong>Assistant says:</strong> {response}</p>
        </div>
      </div>
    </div>
  );
}