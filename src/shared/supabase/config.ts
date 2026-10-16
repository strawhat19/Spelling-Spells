export const supabaseProjectRef = `qtfajiuilwdtywkklbjq`;

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? ``;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ``;
const expectedUrl = `https://${supabaseProjectRef}.supabase.co`;

export const supabaseConfigurationMessage = !url && !publishableKey
  ? `Account services need Supabase configuration. You can still explore the archive and keep a collection on this device.`
  : url.replace(/\/$/, ``) !== expectedUrl
    ? `Account services require the approved Spelling Spells Supabase project URL.`
    : !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)
      ? `Account services require a Supabase publishable key. Secret and service-role keys are never accepted by this app.`
      : null;

export const supabaseConfigured = supabaseConfigurationMessage === null;
export const getSupabaseConfig = (): { url: string; publishableKey: string } | null =>
  supabaseConfigured ? { publishableKey, url: expectedUrl } : null;
