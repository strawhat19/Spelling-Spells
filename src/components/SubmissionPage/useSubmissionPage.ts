import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../shared/authContext';
import { canAccessAccount } from '../../shared/authentication/types';
import type { SubmissionDraft, SubmissionErrors } from '../../shared/submissions/types';
import { draftService, emptyDraft, validateDraft, submissionService, createSubmissionRequestId } from '../../shared/submissions/service';

export const useSubmissionPage = () => {
  const auth = useAuth();
  const router = useRouter();
  const identity = auth.account?.id ?? `guest`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const mounted = useRef(true);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [notice, setNotice] = useState(``);
  const [errors, setErrors] = useState<SubmissionErrors>({});
  useEffect(() => { attempt.current = null; }, [identity]);

  useEffect(() => {
    mounted.current = true;
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
    return () => { active = false; mounted.current = false; };
  }, []);

  const update = <K extends keyof SubmissionDraft>(key: K, value: SubmissionDraft[K]) => {
    if (pending.current) return;
    attempt.current = null;
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

  const submit = async () => {
    if (pending.current || loading || auth.loading) return;
    if (!canAccessAccount(auth.account)) { router.push(`/signin`); return; }
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const owner = identity;
    const signature = JSON.stringify(draft);
    const request = attempt.current?.signature === signature ? attempt.current : { signature, id: createSubmissionRequestId() };
    attempt.current = request;
    pending.current = true;
    setBusy(true);
    try {
      const result = await submissionService.submit(draft, request.id);
      if (!mounted.current || currentIdentity.current !== owner) return;
      setNotice(result.message);
      if (result.state !== `committed` || !result.record) return;
      attempt.current = null;
      try {
        await draftService.clear();
        if (!mounted.current || currentIdentity.current !== owner) return;
        setDraft(emptyDraft());
        setPreview(false);
        setDirty(false);
      } catch { setNotice(`${result.message}. The Device Draft Could Not Be Cleared`); }
    } catch { if (mounted.current && currentIdentity.current === owner) setNotice(`Submission Was Not Confirmed. Keep Your Draft And Retry`); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  };

  return { draft, loading, busy, dirty, preview, persisted, notice, errors, update, save, clear, showPreview, submit,
    signedIn: canAccessAccount(auth.account), configured: submissionService.configured, authLoading: auth.loading };
};
