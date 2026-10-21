import { getSupabaseClient } from '../supabase/client';
import { canAccessOwner } from '../authentication/types';
import { requireCurrentAccount } from '../authentication/service';
import type { World } from '../models/Spell';
import { sourceFromRecord, spellFromRecord, worldFromRecord } from './records';
import type { OwnerCatalog, PublicCatalog, CatalogSpell, CatalogSource, CatalogStatus } from './types';

const listeners = new Set<() => void>();
let channelNumber = 0;
const invalidate = (): void => listeners.forEach((listener) => listener());
const unavailable = (error: unknown): Error => {
  const code = error && typeof error === `object` && `code` in error ? String(error.code) : ``;
  if ([`42P01`, `PGRST205`, `PGRST202`].includes(code)) return new Error(`The Database Catalog Has Not Been Installed. Its Migration And Import Still Need Approval`);
  return error instanceof Error ? error : new Error(error && typeof error === `object` && `message` in error ? String(error.message) : `The Database Catalog Could Not Be Reached`);
};
const readRows = async (table: string, published = false): Promise<unknown[]> => {
  const client = getSupabaseClient();
  const rows: unknown[] = [];
  for (let page = 0; page <= 20; page += 1) {
    const query = client.from(table).select(`*`).order(`id`).range(page * 200, page * 200 + (page === 20 ? 0 : 199));
    const { data, error } = await (published ? query.eq(`status`, `published`) : query);
    if (error) throw unavailable(error);
    if (!Array.isArray(data)) throw new Error(`The Database Catalog Returned An Unsupported Response`);
    rows.push(...data);
    if (rows.length > 4000) throw new Error(`The Catalog Exceeds This Reader's 4,000 Record Window. No Partial Catalog Was Substituted`);
    if (data.length < 200) return rows;
  }
  throw new Error(`The Catalog Exceeds This Reader's 4,000 Record Window. No Partial Catalog Was Substituted`);
};
const ownerAccess = () => {
  const access = requireCurrentAccount();
  if (!canAccessOwner(access.account)) throw new Error(`Owner Access Is Required`);
  return access;
};
const readCatalog = async (owner = false): Promise<OwnerCatalog> => {
  const access = owner ? ownerAccess() : null;
  const [entries, universeRows, sourceRows] = await Promise.all([
    readRows(`catalog_spells`, !owner), readRows(`catalog_universes`), readRows(`catalog_sources`),
  ]);
  if (access) requireCurrentAccount(access.account, access.revision);
  const sources = sourceRows.map(sourceFromRecord);
  return {
    sources,
    worlds: universeRows.map(worldFromRecord),
    spells: entries.map((row) => spellFromRecord(row, sources)).sort((left, right) => left.number - right.number),
  };
};
const save = async (kind: `spell` | `universe` | `source`, payload: Record<string, unknown>): Promise<unknown> => {
  const { client, account, revision } = ownerAccess();
  const { id, number, status, updatedAt, seedPlaceholder, importPlaceholder, revision: expectedRevision, ...content } = payload;
  const { data, error } = await client.rpc(`owner_save_catalog_${kind}`, { p_record: {
    payload: content,
    ...(id ? { id } : {}),
    name: content.name,
    slug: content.slug,
    label: content.label,
    url: content.url,
    kind: content.kind,
    universe_id: content.worldId,
    expectedAuthUid: account.authUid,
    ...(id ? { expectedRevision } : {}),
  } });
  requireCurrentAccount(account, revision);
  if (error) throw unavailable(error);
  const record = Array.isArray(data) ? data?.[0] : data;
  if (!record) throw new Error(`The Database Did Not Confirm The Saved Record`);
  invalidate();
  return record;
};

export const catalogService = {
  getPublicCatalog: async (): Promise<PublicCatalog> => {
    const { spells, worlds } = await readCatalog();
    return { spells, worlds: worlds.filter((world) => spells.some((spell) => spell.worldId === world.id)) };
  },
  getOwnerCatalog: (): Promise<OwnerCatalog> => readCatalog(true),
  getSpell: async (slug: string): Promise<CatalogSpell | null> => {
    const client = getSupabaseClient();
    const { data, error } = await client.from(`catalog_spells`).select(`*`).eq(`slug`, slug).eq(`status`, `published`).maybeSingle();
    if (error) throw unavailable(error);
    if (!data) return null;
    const sources = (await readRows(`catalog_sources`)).map(sourceFromRecord);
    return spellFromRecord(data, sources);
  },
  saveSpell: async (record: Partial<CatalogSpell>): Promise<CatalogSpell> => spellFromRecord(await save(`spell`, record)),
  saveUniverse: async (record: Partial<World>): Promise<World> => worldFromRecord(await save(`universe`, record)),
  saveSource: async (record: Partial<CatalogSource>): Promise<CatalogSource> => sourceFromRecord(await save(`source`, record)),
  setStatus: async (id: string, status: CatalogStatus, expectedRevision: number, note = ``): Promise<CatalogSpell> => {
    const { client, account, revision } = ownerAccess();
    const { data, error } = await client.rpc(`owner_set_catalog_status`, {
      p_id: id, p_status: status, p_review_note: note,
      p_expected_revision: expectedRevision, p_expected_auth_uid: account.authUid,
    });
    requireCurrentAccount(account, revision);
    if (error) throw unavailable(error);
    const row = Array.isArray(data) ? data?.[0] : data;
    if (!row) throw new Error(`The Database Did Not Confirm The Status Change`);
    invalidate();
    const sources = (await readRows(`catalog_sources`)).map(sourceFromRecord);
    requireCurrentAccount(account, revision);
    return spellFromRecord(row, sources);
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    let stop: () => void = () => undefined;
    try {
      const client = getSupabaseClient();
      const channel = client.channel(`public-catalog:${++channelNumber}`);
      [`catalog_feed_state`].forEach((table) => {
        channel.on(`postgres_changes`, { table, event: `*`, schema: `public` }, listener);
      });
      channel.subscribe();
      stop = () => { void client.removeChannel(channel); };
    } catch { /* The initial catalog read reports missing configuration. */ }
    return () => { listeners.delete(listener); stop(); };
  },
};
