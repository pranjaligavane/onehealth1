/**
 * ONEHEALTH AI - Voice & Accessibility Engine
 * Text-to-Speech narration and Voice Dictation for low-literacy rural users.
 */

class OneHealthVoice {
  constructor() {
    this.synth = window.speechSynthesis;
    this.recognition = null;
    this.isListening = false;
    this.initRecognition();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }
  }

  speak(text) {
    if (!this.synth) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }

    this.synth.cancel(); // Stop any previous speech

    const utterance = new SpeechSynthesisUtterance(text);
    const lang = window.oneHealthI18n ? window.oneHealthI18n.currentLang : 'en';

    // Map language
    if (lang === 'mr') {
      utterance.lang = 'mr-IN';
    } else if (lang === 'hi') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.rate = 0.95; // Slightly slower for clear rural understanding
    utterance.pitch = 1.0;

    // Pick appropriate voice if available
    const voices = this.synth.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(utterance.lang.slice(0, 2)));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    this.synth.speak(utterance);
  }

  startDictation(onResultCallback, onEndCallback) {
    if (!this.recognition) {
      alert('Voice dictation is not supported on this browser. You can type directly.');
      if (onEndCallback) onEndCallback();
      return;
    }

    const lang = window.oneHealthI18n ? window.oneHealthI18n.currentLang : 'en';
    this.recognition.lang = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';

    this.isListening = true;

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResultCallback) {
        onResultCallback(transcript);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[Voice] Speech recognition error:', event.error);
      this.isListening = false;
      if (onEndCallback) onEndCallback();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEndCallback) onEndCallback();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error(e);
      this.isListening = false;
      if (onEndCallback) onEndCallback();
    }
  }

  stopDictation() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

window.oneHealthVoice = new OneHealthVoice();
