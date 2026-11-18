// Read-aloud via the Web Speech API. Degrades to silence where unsupported.
const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let voice = null;

function pickVoice() {
  if (!supported) return;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return;
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const preferred = ['Google US English', 'Samantha', 'Microsoft Aria', 'Google UK English Female'];
  voice = en.find((v) => preferred.some((p) => v.name.includes(p))) || en.find((v) => v.default) || en[0] || voices[0];
}
if (supported) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export const speech = {
  supported,
  speak(text) {
    if (!supported) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = 0.9;   // a little slower for young listeners
    u.pitch = 1.1;
    speechSynthesis.speak(u);
  },
  stop() {
    if (supported) speechSynthesis.cancel();
  },
};
