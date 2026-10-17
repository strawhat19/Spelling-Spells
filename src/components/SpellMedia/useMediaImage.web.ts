import { useRef, useState, useEffect } from 'react';

export const useMediaImage = () => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<`loading` | `ready` | `error`>(`loading`);
  useEffect(() => {
    const element = imageRef.current;
    if (element?.complete) setStatus(element.naturalWidth > 0 ? `ready` : `error`);
  }, []);
  return { imageRef, status, onLoad: () => setStatus(`ready`), onError: () => setStatus(`error`) };
};
