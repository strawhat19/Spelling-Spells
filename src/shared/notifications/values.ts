import type { NotificationDraft, NotificationRecord } from './types';

export const notificationFeedLimit = 100;
export const notificationManagerLimit = 50;
export const notificationColumns = `id,number,slug,title,body,suffix,kind,status,link_url,link_label,created_at,updated_at`;
export const notificationIdPattern = /^Notification_([1-9][0-9]*)_Announcement_\d{4}-\d{2}-\d{2}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const normalizeNotificationDraft = (input: NotificationDraft): NotificationDraft => {
  const slug = input.slug.trim().toLowerCase();
  const body = input.body.trim();
  const title = input.title.trim();
  const suffix = input.suffix?.trim() || null;
  const linkUrl = input.linkUrl?.trim() || null;
  const linkLabel = input.linkLabel?.trim() || null;
  if (!slug || slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Use A Slug Of Up To 120 Lowercase Letters, Numbers And Hyphens`);
  if (!title || title.length > 160 || /[\u0000-\u001f\u007f]/.test(title)) throw new Error(`Use A Title Of 1–160 Characters Without Control Characters`);
  if (!body || body.length > 10_000 || /\u0000/.test(body)) throw new Error(`Use A Message Of 1–10,000 Characters`);
  if (suffix && (suffix.length > 80 || /[\u0000-\u001f\u007f]/.test(suffix))) throw new Error(`Use A Suffix Of Up To 80 Characters`);
  if (![`development`, `announcement`].includes(input.kind)) throw new Error(`Choose A Supported Notification Kind`);
  if (![`draft`, `published`].includes(input.status)) throw new Error(`Choose Draft Or Published`);
  if (linkUrl) {
    if (linkUrl.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(linkUrl)) throw new Error(`Use A Valid Link Of Up To 2,048 Characters`);
    if (!linkUrl.startsWith(`/`) || linkUrl.startsWith(`//`)) {
      let url: URL;
      try { url = new URL(linkUrl); } catch { throw new Error(`Use An Internal Path Or HTTPS Link`); }
      if (url.protocol !== `https:` || !url.hostname || url.username || url.password) throw new Error(`Use An Internal Path Or HTTPS Link Without Credentials`);
    }
    if (!linkLabel || linkLabel.length > 120 || /[\u0000-\u001f\u007f]/.test(linkLabel)) throw new Error(`Add A Link Label Of 1–120 Characters`);
  } else if (linkLabel) throw new Error(`Add A Link Before Its Label`);
  return { slug, body, title, suffix, linkUrl, linkLabel, kind: input.kind, status: input.status };
};

export const readNotification = (value: unknown): NotificationRecord => {
  if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`The Notification Record Is Unavailable`);
  const row = value as Record<string, unknown>;
  const match = typeof row.id === `string` ? notificationIdPattern.exec(row.id) : null;
  if (!match || !Number.isSafeInteger(row.number) || row.number !== Number(match[1]) ||
    typeof row.slug !== `string` || typeof row.body !== `string` || typeof row.title !== `string` ||
    (row.suffix !== null && typeof row.suffix !== `string`) ||
    (row.link_url !== null && typeof row.link_url !== `string`) ||
    (row.link_label !== null && typeof row.link_label !== `string`) ||
    typeof row.created_at !== `string` || !Number.isFinite(Date.parse(row.created_at)) ||
    typeof row.updated_at !== `string` || !Number.isFinite(Date.parse(row.updated_at))) throw new Error(`The Notification Record Has An Unsupported Format`);
  const draft = normalizeNotificationDraft({
    slug: row.slug,
    body: row.body,
    title: row.title,
    suffix: row.suffix as string | null,
    linkUrl: row.link_url as string | null,
    linkLabel: row.link_label as string | null,
    kind: row.kind as NotificationRecord[`kind`],
    status: row.status as NotificationRecord[`status`],
  });
  return { ...draft, id: row.id as string, number: row.number as number, createdAt: row.created_at, updatedAt: row.updated_at };
};
