import Constants from 'expo-constants';

// Set expo.extra.siteUrl only after a public deployment origin is confirmed.
export const getPublicPageUrl = (path: string, fallbackOrigin?: string): string | undefined => {
  const configured = Constants.expoConfig?.extra?.siteUrl;
  const origin = typeof configured === `string` && configured.trim() ? configured : fallbackOrigin;
  if (!origin) return undefined;
  try {
    const url = new URL(origin);
    if (url.protocol !== `https:` && url.protocol !== `http:`) return undefined;
    return new URL(path, url.origin).href;
  } catch {
    return undefined;
  }
};
