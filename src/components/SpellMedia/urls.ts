export const getMediaUrl = (value?: string): string | undefined => {
  if (!value) return undefined;
  if (/^\/visuals\/[a-z0-9/_-]+\.(?:png|jpe?g|webp|avif|gif|mp4|webm|ogg)$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === `https:` && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
};
