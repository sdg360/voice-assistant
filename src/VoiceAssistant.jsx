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

  const sendToWebhook = async (text) => {
    try {
      const res = await fetch(import.meta.env.VITE_WEBHOOK_URL, {
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

  const sendTestWorkflow = async () => {
    const testText = 'This is a test workflow input';
    try {
      const res = await fetch(import.meta.env.VITE_WEBHOOK_TEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testText })
      });
      const data = await res.json();
      const reply = data.response || data || 'Test complete!';
      setResponse(reply);
      speak(reply);
    } catch (error) {
      console.error('Test webhook error:', error);
      const fallback = 'Test webhook failed.';
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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <h1 className="text-xl font-bold mb-4">🎤 Vimar Voice Assistant</h1>
        <button
          className={`px-6 py-3 rounded-full text-white text-lg font-medium shadow transition duration-300 ${isListening ? 'bg-red-500' : 'bg-blue-600 hover:bg-blue-700'}`}
          onClick={startListening}
          disabled={isListening}
        >
          {isListening ? 'Listening…' : 'Tap to Speak'}
        </button>
        <button
          className="mt-4 px-6 py-3 rounded-full text-white text-lg font-medium shadow bg-green-600 hover:bg-green-700"
          onClick={sendTestWorkflow}
        >
          Send Test Workflow
        </button>
        <div className="mt-6">
          <p className="text-gray-600 text-sm">You said:</p>
          <p className="font-medium">{transcript}</p>
        </div>
        <div className="mt-4">
          <p className="text-gray-600 text-sm">Assistant says:</p>
          <p className="font-medium text-green-600">{response}</p>
        </div>
      </div>
    </div>
  );
}