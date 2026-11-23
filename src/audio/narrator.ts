// Brazilian Portuguese live match commentary + optional Web Speech API (pt-BR)

class MatchNarrator {
  private voiceEnabled = true;
  private lastSpeakTime = 0;

  setVoiceEnabled(v: boolean) {
    this.voiceEnabled = v;
    if (!v && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    return this.voiceEnabled;
  }

  isVoiceEnabled() {
    return this.voiceEnabled;
  }

  speak(text: string, priority = false) {
    if (!this.voiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const now = performance.now();
    if (!priority && now - this.lastSpeakTime < 2600) return;

    try {
      if (priority) {
        window.speechSynthesis.cancel();
      } else if (window.speechSynthesis.speaking) {
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'pt-BR';
      utter.rate = priority ? 1.18 : 1.1;
      utter.pitch = priority ? 1.2 : 1.05;
      utter.volume = 0.72;
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find((v) => v.lang.toLowerCase().startsWith('pt'));
      if (ptVoice) utter.voice = ptVoice;
      this.lastSpeakTime = now;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis errors in restricted environments
    }
  }

  stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }
}

export const Narrator = new MatchNarrator();
