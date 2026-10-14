import { useEffect, useRef, useState } from 'react';
import type { Spell } from '../../shared/models/Spell';
import { getPublicPageUrl } from '../PageMetadata/urls';
import { getSpellPath } from '../../shared/catalog/routes';

export const useSpellShare = (spell?: Spell) => {
  const active = useRef(false);
  const requestVersion = useRef(0);
  const currentSpellId = useRef(spell?.id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(``);
  const [manualUrl, setManualUrl] = useState(``);
  currentSpellId.current = spell?.id;

  useEffect(() => {
    active.current = false;
    setBusy(false);
    setMessage(``);
    setManualUrl(``);
    return () => { requestVersion.current += 1; };
  }, [spell?.id]);

  const share = async () => {
    if (!spell || active.current || typeof window === `undefined`) return;
    const url = getPublicPageUrl(getSpellPath(spell), window.location.origin);
    if (!url) {
      setMessage(`A web link is unavailable here. Open this spell on the website to share its page.`);
      return;
    }
    const version = ++requestVersion.current;
    const isCurrent = () => version === requestVersion.current && currentSpellId.current === spell.id;
    active.current = true;
    setBusy(true);
    setMessage(``);
    setManualUrl(``);
    try {
      if (typeof navigator.share === `function`) {
        await navigator.share({ url, title: `${spell.name} · Spelling Spells`, text: spell.definition });
        if (isCurrent()) setMessage(`Share sheet closed.`);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        if (isCurrent()) setMessage(`Spell link copied. Paste it wherever you’d like to share.`);
      } else if (isCurrent()) {
        setManualUrl(url);
        setMessage(`Automatic sharing isn’t available in this browser. Select and copy the link below.`);
      }
    } catch (failure) {
      if (!isCurrent()) return;
      if (failure instanceof Error && failure.name === `AbortError`) {
        setMessage(`Sharing canceled.`);
      } else {
        setManualUrl(url);
        setMessage(`The link wasn’t shared or copied. Select and copy it below instead.`);
      }
    } finally {
      if (isCurrent()) {
        active.current = false;
        setBusy(false);
      }
    }
  };

  return { busy, share, message, manualUrl };
};
