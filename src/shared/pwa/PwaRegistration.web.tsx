import { useEffect } from 'react';

const PwaRegistration = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== `production` || !(`serviceWorker` in navigator)) return;
    void navigator.serviceWorker.register(`/sw.js`, { scope: `/`, updateViaCache: `none` }).catch((error: unknown) => {
      console.warn(`PWA Registration Unavailable`, error);
    });
  }, []);
  return null;
};

export default PwaRegistration;
