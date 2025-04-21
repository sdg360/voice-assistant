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
    } catch (error) {
      console.error('Webhook error:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg text-center transition duration-300 ease-in-out">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🎙️ Vimar Voice Assistant</h1>

        <div className="flex flex-col gap-4 items-center">
          <button
            className={`w-60 px-6 py-3 rounded-full text-white text-lg font-semibold shadow transition duration-300 ${
              isListening ? 'bg-red-500' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={startListening}
            disabled={isListening}
          >
            {isListening ? '🎧 Listening…' : '🎤 Tap to Speak'}
          </button>

          <button
            className="w-60 px-6 py-3 rounded-full text-white text-lg font-semibold shadow bg-green-600 hover:bg-green-700"
            onClick={() => sendToWebhook('This is a test workflow input', true)}
          >
            🧪 Run Test Workflow
          </button>
        </div>

        <div className="mt-6 text-left">
          <p className="text-gray-600 text-sm">You said:</p>
          <div className="bg-gray-50 border rounded-md p-3 font-mono text-gray-800 mt-1">
            {transcript || <span className="italic text-gray-400">Nothing yet</span>}
          </div>
        </div>

        <div className="mt-4 text-left">
          <p className="text-gray-600 text-sm">Assistant says:</p>
          <div className="bg-green-50 border border-green-200 rounded-md p-3 font-mono text-green-700 mt-1">
            {response || <span className="italic text-gray-400">Waiting for a response…</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
