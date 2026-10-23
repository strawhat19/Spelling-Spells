export type PlanInterval = `month` | `year` | `one-time`;
export type PlanCurrency = `USD`;

export type PlanDraft = {
  slug: string;
  name: string;
  active: boolean;
  priceCents: number;
  removesAds: boolean;
  highlighted: boolean;
  displayOrder: number;
  description: string;
  features: string[];
  interval: PlanInterval;
  currency: PlanCurrency;
};

export type PlanRecord = PlanDraft & {
  id: string;
  number: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type PlansSnapshot = {
  plans: PlanRecord[];
  message: string | null;
  status: `loading` | `ready` | `error` | `unavailable`;
};
