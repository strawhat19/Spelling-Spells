import type { PlanDraft, PlanRecord } from './types';

export const planCatalogLimit = 100;
export const planColumns = `id,number,slug,name,description,features,price_cents,currency,interval,active,highlighted,removes_ads,display_order,revision,created_at,updated_at`;
const planIdPattern = /^Plan_([1-9][0-9]*)_[^_]+_\d{4}-\d{2}-\d{2}_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const hasControlCharacters = (value: string) => /[\u0000-\u001f\u007f]/.test(value);

export const createPlanDraft = (record?: PlanRecord): PlanDraft => ({
  name: record?.name ?? ``,
  slug: record?.slug ?? ``,
  active: record?.active ?? false,
  interval: record?.interval ?? `month`,
  currency: record?.currency ?? `USD`,
  priceCents: record?.priceCents ?? 100,
  features: [...(record?.features ?? [])],
  removesAds: record?.removesAds ?? false,
  highlighted: record?.highlighted ?? false,
  displayOrder: record?.displayOrder ?? 0,
  description: record?.description ?? ``,
});

export const normalizePlanDraft = (input: PlanDraft): PlanDraft => {
  if (!input || typeof input !== `object` || Array.isArray(input)) throw new Error(`Use A Complete Plan`);
  if (typeof input.slug !== `string` || typeof input.name !== `string` || typeof input.description !== `string`) throw new Error(`Add A Plan Name, Slug And Description`);
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const description = input.description.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) throw new Error(`Use A Slug Of Up To 80 Lowercase Letters, Numbers And Hyphens`);
  if (!name || name.length > 80 || hasControlCharacters(name)) throw new Error(`Use A Plan Name Of 1–80 Characters`);
  if (!description || description.length > 600 || hasControlCharacters(description)) throw new Error(`Use A Description Of 1–600 Characters`);
  if (!Array.isArray(input.features) || input.features.length > 16 || input.features.some((feature) => typeof feature !== `string` || !feature.trim() || feature.trim().length > 160 || hasControlCharacters(feature))) throw new Error(`Use Up To 16 Benefits Of 1–160 Characters Each`);
  if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 100_000_000) throw new Error(`Use A Price From $0 To $1,000,000 With At Most Two Decimal Places`);
  if (!Number.isSafeInteger(input.displayOrder) || input.displayOrder < 0 || input.displayOrder > 10_000) throw new Error(`Use A Display Order From 0 To 10,000`);
  if (input.currency !== `USD` || ![`month`, `year`, `one-time`].includes(input.interval)) throw new Error(`Choose USD And A Supported Billing Interval`);
  if ([input.active, input.highlighted, input.removesAds].some((value) => typeof value !== `boolean`)) throw new Error(`Choose Valid Visibility, Highlight And Ad Settings`);
  return { name, slug, description, currency: input.currency, interval: input.interval, active: input.active, priceCents: input.priceCents, removesAds: input.removesAds, highlighted: input.highlighted, displayOrder: input.displayOrder, features: input.features.map((feature) => feature.trim()) };
};

export const readPlanRecord = (value: unknown): PlanRecord => {
  if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`The Plan Record Is Unavailable`);
  const row = value as Record<string, unknown>;
  const match = typeof row.id === `string` ? planIdPattern.exec(row.id) : null;
  if (!match || !Number.isSafeInteger(row.number) || row.number !== Number(match[1]) || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1 || typeof row.created_at !== `string` || !Number.isFinite(Date.parse(row.created_at)) || typeof row.updated_at !== `string` || !Number.isFinite(Date.parse(row.updated_at))) throw new Error(`The Plan Record Has An Unsupported Identity`);
  const draft = normalizePlanDraft({
    name: row.name as string,
    slug: row.slug as string,
    active: row.active as boolean,
    features: row.features as string[],
    priceCents: row.price_cents as number,
    currency: row.currency as PlanDraft[`currency`],
    interval: row.interval as PlanDraft[`interval`],
    description: row.description as string,
    removesAds: row.removes_ads as boolean,
    highlighted: row.highlighted as boolean,
    displayOrder: row.display_order as number,
  });
  return { ...draft, id: row.id as string, number: row.number as number, revision: row.revision as number, createdAt: row.created_at, updatedAt: row.updated_at };
};

export const formatPlanAmount = (plan: Pick<PlanDraft, `priceCents` | `currency`>): string => new Intl.NumberFormat(`en-US`, { style: `currency`, currency: plan.currency, maximumFractionDigits: 2, minimumFractionDigits: plan.priceCents % 100 ? 2 : 0 }).format(plan.priceCents / 100);
export const planIntervalLabel = (plan: Pick<PlanDraft, `interval` | `priceCents`>): string => plan.priceCents === 0 ? `forever` : plan.interval === `year` ? `/ year` : plan.interval === `one-time` ? `one time` : `/ month`;
