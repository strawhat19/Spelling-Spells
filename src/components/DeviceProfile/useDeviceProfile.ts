import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../shared/themeContext/useTheme';
import { emptyDeviceProfile, loadDeviceProfile, saveDeviceProfile } from '../../shared/deviceProfile/service';

export const useDeviceProfile = () => {
  const theme = useTheme();
  const mounted = useRef(false);
  const pending = useRef(false);
  const [value, setValue] = useState(emptyDeviceProfile);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(``);
  useEffect(() => {
    mounted.current = true;
    void loadDeviceProfile().then((result) => {
      if (!mounted.current) return;
      setValue({ version: 1, nickname: result.value.nickname, readingNote: result.value.readingNote });
      setNotice(result.error ?? ``);
    }).catch(() => { if (mounted.current) setNotice(`The device profile could not be loaded. Existing saved data has not been changed.`); })
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, []);
  const persist = async (clear = false) => {
    if (loading || pending.current) return;
    pending.current = true;
    setBusy(true);
    const next = clear ? emptyDeviceProfile() : value;
    try {
      const persisted = await saveDeviceProfile(next);
      if (!mounted.current) return;
      setValue(next);
      setNotice(persisted ? clear ? `Device profile cleared.` : `Saved on this device only. No account was created.` : `Stored in session memory only; reloading can lose these changes.`);
    } catch (error) {
      if (mounted.current) setNotice(error instanceof Error ? error.message : `Device storage is unavailable. Your edits have not been saved.`);
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  const update = (field: `nickname` | `readingNote`, text: string) => {
    if (loading || pending.current) return;
    setValue((previous) => ({ ...previous, [field]: text.slice(0, field === `nickname` ? 80 : 500) }));
    setNotice(`Unsaved device changes`);
  };
  return { ...theme, value, loading, busy, notice, update, persist };
};
