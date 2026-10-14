import { useEffect, useRef, useState } from 'react';
import { draftService, emptyDraft, validateDraft } from '../../shared/submissions/service';
import type { SubmissionDraft, SubmissionErrors } from '../../shared/submissions/types';

export const useSubmissionPage = () => {
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [notice, setNotice] = useState(``);
  const [errors, setErrors] = useState<SubmissionErrors>({});

  useEffect(() => {
    let active = true;
    void draftService.load().then((result) => {
      if (!active) return;
      setDraft(result.value);
      setDirty(result.dirty);
      setPersisted(result.persisted);
      setNotice(result.error ?? ``);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setNotice(`The saved draft could not be loaded. It has not been overwritten.`);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const update = <K extends keyof SubmissionDraft>(key: K, value: SubmissionDraft[K]) => {
    const nextDraft = { ...draft, [key]: value };
    draftService.stage(nextDraft);
    setDraft(nextDraft);
    setDirty(true);
    setPreview(false);
    setNotice(``);
    setErrors({});
  };

  const save = async () => {
    if (pending.current || loading) return;
    pending.current = true;
    setBusy(true);
    try {
      const result = await draftService.save(draft);
      setDirty(false);
      setPersisted(result.persisted);
      setNotice(result.persisted ? `Draft saved on this device. Nothing has been submitted.` : `Draft kept in session memory only. Nothing has been submitted.`);
    } catch (error) {
      setPersisted(false);
      setNotice(error instanceof Error ? error.message : `The draft could not be saved. Keep this page open to retain your edits.`);
    } finally { pending.current = false; setBusy(false); }
  };

  const clear = async () => {
    if (pending.current || loading) return;
    pending.current = true;
    setBusy(true);
    try {
      const result = await draftService.clear();
      setDraft(emptyDraft());
      setDirty(false);
      setPreview(false);
      setErrors({});
      setPersisted(result.persisted);
      setNotice(result.persisted ? `Draft cleared from this device` : `Draft cleared from session memory`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `The draft could not be cleared`);
    } finally { pending.current = false; setBusy(false); }
  };

  const showPreview = () => {
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    setPreview(Object.keys(nextErrors).length === 0);
  };

  return { draft, loading, busy, dirty, preview, persisted, notice, errors, update, save, clear, showPreview };
};
