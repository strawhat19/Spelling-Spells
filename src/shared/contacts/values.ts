import { randomUUID } from 'expo-crypto';
import type { ContactInput, ContactErrors, ContactReceipt, ContactRecord } from './types';

export const contactPageSize = 50;
export const contactLimits = { name: 80, email: 254, subject: 160, message: 5000, website: 200 } as const;
export const contactRequestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const contactIdPattern = /^Contact_([1-9][0-9]*)_Submission_\d{4}-\d{2}-\d{2}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const emptyContactInput = (): ContactInput => ({ name: ``, email: ``, subject: ``, message: ``, website: `` });
export const createContactRequestId = (): string => randomUUID();
export const normalizeContactInput = (input: ContactInput): ContactInput => ({
  name: input.name.trim(),
  email: input.email.trim().toLowerCase(),
  subject: input.subject.trim(),
  message: input.message.trim(),
  website: input.website,
});

export const validateContactInput = (input: ContactInput): ContactErrors => {
  const value = normalizeContactInput(input);
  const errors: ContactErrors = {};
  if (!value.name) errors.name = `Add Your Name`;
  if (!value.subject) errors.subject = `Add A Subject`;
  if (!value.message) errors.message = `Add Your Message`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = `Add A Valid Email Address`;
  for (const field of [`name`, `email`, `subject`, `message`] as const) {
    if (value[field].length > contactLimits[field]) errors[field] = `Use At Most ${contactLimits[field]} Characters`;
  }
  for (const field of [`name`, `email`, `subject`] as const) {
    if (/[\u0000-\u001f\u007f]/.test(value[field])) errors[field] = `Remove Unsupported Control Characters`;
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.message)) errors.message = `Remove Unsupported Control Characters`;
  if (value.website !== ``) errors.website = `This Submission Could Not Be Accepted`;
  return errors;
};

export const readContactReceipt = (value: unknown): ContactReceipt => {
  const row = value as Record<string, unknown> | null;
  const match = typeof row?.id === `string` ? contactIdPattern.exec(row.id) : null;
  if (!row || !match || !Number.isSafeInteger(row.number) || row.number !== Number(match[1]) ||
    typeof row.created_at !== `string` || !Number.isFinite(Date.parse(row.created_at))) throw new Error(`The Contact Save Could Not Be Confirmed`);
  return { id: row.id as string, number: row.number as number, createdAt: row.created_at };
};

export const readContact = (value: unknown): ContactRecord => {
  const receipt = readContactReceipt(value);
  const row = value as Record<string, unknown>;
  if (typeof row.name !== `string` || typeof row.email !== `string` || typeof row.subject !== `string` || typeof row.message !== `string` ||
    ![`new`, `read`, `archived`].includes(row.status as string) ||
    typeof row.updated_at !== `string` || !Number.isFinite(Date.parse(row.updated_at))) throw new Error(`The Contact Record Has An Unsupported Format`);
  for (const field of [`name`, `email`, `subject`, `message`] as const) {
    const length = Array.from(row[field] as string).length;
    if (length < (field === `email` ? 3 : 1) || length > contactLimits[field]) throw new Error(`The Contact Record Has Unsupported Fields`);
  }
  return { ...receipt, name: row.name, email: row.email, subject: row.subject, message: row.message, status: row.status as ContactRecord[`status`], updatedAt: row.updated_at };
};
