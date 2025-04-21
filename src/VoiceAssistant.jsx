import React, { useState } from 'react';

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
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 to-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white shadow-lg rounded-3xl p-6 md:p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">🎙️ Vimar Voice Assistant</h1>
          <p className="text-sm text-gray-500">Tap below and start speaking!</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            className={`w-full py-3 rounded-full text-white font-semibold text-lg transition ${
              isListening ? 'bg-red-500' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={startListening}
            disabled={isListening}
          >
            {isListening ? '🎧 Listening…' : '🎤 Tap to Speak'}
          </button>

          <button
            className="w-full py-3 rounded-full text-white font-semibold text-lg bg-green-600 hover:bg-green-700"
            onClick={() => sendToWebhook('This is a test workflow input', true)}
          >
            🧪 Run Test Workflow
          </button>

          <button
            className="w-full py-3 rounded-full text-gray-800 bg-yellow-100 font-semibold text-sm hover:bg-yellow-200"
            onClick={toggleLanguage}
          >
            🌐 Switch to {lang === 'en-US' ? 'French' : 'English'}
          </button>
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-600 font-medium">🗣️ You said:</label>
          <div className="bg-gray-50 border rounded-md p-3 text-gray-800 text-sm mt-1 min-h-[40px]">
            {transcript || <span className="italic text-gray-400">Nothing yet</span>}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600 font-medium">🤖 Assistant says:</label>
          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-green-700 text-sm mt-1 min-h-[40px]">
            {isLoading ? <span className="italic text-yellow-600 animate-pulse">Thinking…</span> : response || <span className="italic text-gray-400">Waiting for a response…</span>}
          </div>
        </div>

        {history.length > 0 && (
          <div className="pt-4 border-t text-left">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">📜 Conversation History:</h2>
            <ul className="space-y-2 max-h-48 overflow-auto text-sm">
              {history.map((entry, i) => (
                <li key={i} className="bg-gray-50 border rounded-md p-2">
                  <p><span className="font-semibold">You:</span> {entry.input}</p>
                  <p><span className="font-semibold">Assistant:</span> {entry.output}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}