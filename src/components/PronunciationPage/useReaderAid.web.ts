import { useEffect, useRef, useState } from 'react';

export const useReaderAid = () => {
  const reader = useRef<SpeechSynthesisUtterance | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState(``);
  const available = typeof window !== `undefined` && `speechSynthesis` in window && typeof SpeechSynthesisUtterance !== `undefined`;

  useEffect(() => () => {
    if (available && reader.current) window.speechSynthesis.cancel();
  }, [available]);

  const speak = (text: string) => {
    if (!available) {
      setMessage(`Your browser does not have a speech reader. Use the written sound guide below.`);
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = .72;
    utterance.lang = `en-US`;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => { setSpeaking(false); setMessage(`The speech reader is unavailable. Use the written sound guide.`); };
    reader.current = utterance;
    setMessage(`Computer voice · a reading aid, not an official performance or pronunciation.`);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return { speak, message, speaking, available };
};
