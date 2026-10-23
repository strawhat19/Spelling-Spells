export const billingNavigationAvailable = true;
export const billingEndpoint = (path: string): string => `/api/billing/${path}`;
export const openBillingUrl = (value: string): void => {
  const url = new URL(value);
  if (url.protocol !== `https:` || url.username || url.password || url.port || ![`checkout.stripe.com`, `billing.stripe.com`].includes(url.hostname)) throw new Error(`The Billing Destination Could Not Be Verified`);
  window.location.assign(url.href);
};
