export const billingNavigationAvailable = false;
export const billingEndpoint = (path: string): string => `https://spellingspells.com/api/billing/${path}`;
export const openBillingUrl = (_value: string): void => { throw new Error(`Manage Your Subscription On The Spelling Spells Website`); };
