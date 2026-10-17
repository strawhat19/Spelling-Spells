import { contactsAPI } from '../../api/contacts';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../shared/authContext/useAuth';
import type { ContactInput, ContactErrors, ContactReceipt } from '../../shared/contacts/types';
import { emptyContactInput, validateContactInput, createContactRequestId } from '../../shared/contacts/values';

type ContactState = {
  scope: string;
  busy: boolean;
  error: string;
  input: ContactInput;
  errors: ContactErrors;
  receipt: ContactReceipt | null;
};

const emptyState = (scope: string): ContactState => ({ scope, busy: false, error: ``, errors: {}, receipt: null, input: emptyContactInput() });

export const useContactPage = () => {
  const auth = useAuth();
  const scope = auth.identity?.authUid ?? auth.account?.authUid ?? (auth.loading ? `loading` : `guest`);
  const mounted = useRef(true);
  const operation = useRef(0);
  const pending = useRef(false);
  const scopeRef = useRef(scope);
  const attempt = useRef<{ id: string; signature: string } | null>(null);
  const [state, setState] = useState<ContactState>(() => emptyState(scope));
  const form = state.scope === scope ? state : emptyState(scope);
  const loading = auth.loading || auth.status === `loading`;
  const configured = contactsAPI.configured;
  const editable = configured && !loading && !form.busy;

  if (scopeRef.current !== scope) {
    scopeRef.current = scope;
    operation.current += 1;
    pending.current = false;
    attempt.current = null;
  }

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; operation.current += 1; };
  }, []);

  useEffect(() => { setState((current) => current.scope === scope ? current : emptyState(scope)); }, [scope]);

  const update = (field: keyof ContactInput, value: string) => {
    if (!editable || pending.current || form.input[field] === value) return;
    attempt.current = null;
    setState((current) => {
      const previous = current.scope === scope ? current : emptyState(scope);
      return { ...previous, error: ``, errors: {}, receipt: null, input: { ...previous.input, [field]: value } };
    });
  };

  const submit = async () => {
    if (!editable || pending.current) return;
    const errors = validateContactInput(form.input);
    if (Object.keys(errors).length) {
      const { website, ...fieldErrors } = errors;
      setState({ ...form, errors: fieldErrors, error: website ?? ``, receipt: null });
      return;
    }
    const currentOperation = ++operation.current;
    const currentScope = scope;
    const isCurrent = () => mounted.current && operation.current === currentOperation && scopeRef.current === currentScope;
    pending.current = true;
    setState({ ...form, busy: true, errors: {}, error: ``, receipt: null });
    try {
      const signature = JSON.stringify(form.input);
      const submission = attempt.current?.signature === signature ? attempt.current : { signature, id: createContactRequestId() };
      attempt.current = submission;
      const receipt = await contactsAPI.submit(form.input, submission.id);
      if (!isCurrent()) return;
      attempt.current = null;
      setState({ ...emptyState(currentScope), receipt });
    } catch (error) {
      if (isCurrent()) setState((current) => ({ ...current, busy: false, error: error instanceof Error ? error.message : `Your message could not be saved. Please try again.` }));
    } finally {
      if (isCurrent()) pending.current = false;
    }
  };

  return { ...form, loading, editable, configured, update, submit };
};
