-- Authorized reference addition for the current spell-image/source goal.
-- Keeps the existing reference and draft status; no schema or deployment changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $reference_update$
declare
  target public.catalog_spells%rowtype;
  source_id text;
  source_number bigint;
  updated_payload jsonb;
  reference jsonb := jsonb_build_object('url', 'https://www.connotations.de/article/lynn-forest-hill-hey-dol-merry-dol-tom-bombadils-nonsense-or-tolkiens-creative-uncertainty-a-response-to-thomas-kullmann/', 'label', 'Connotations · Lynn Forest-Hill, Vol. 25.1 (2015/16), Page 95 (Secondary Reference)');
begin
  select * into target from public.catalog_spells
    where id = 'Spell_17_Shutting-Spell_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004017' for update;
  if not found or target.revision <> 1 or target.status <> 'draft' then
    raise exception 'Shutting-Spell Changed; Review Before Adding Its Reference';
  end if;
  select id into source_id from public.catalog_sources where url = reference ->> 'url' order by number limit 1;
  if source_id is null then
    update app_private.counters set number = greatest(number, (select coalesce(max(number), 0) from public.catalog_sources)) + 1
      where name = 'catalog_sources' returning number into source_number;
    if source_number is null then raise exception 'Catalog Source Counter Missing'; end if;
    source_id := app_private.catalog_id('Source', source_number, 'Reference');
    insert into public.catalog_sources (id, number, label, url, payload)
    values (source_id, source_number, reference ->> 'label', reference ->> 'url',
      reference || jsonb_build_object('kind', 'reference', 'publisher', 'www.connotations.de',
        'evidenceNote', 'Secondary journal reference names Gandalf''s shutting-spell on page 95; complete primary-text review remains pending'));
  end if;
  updated_payload := jsonb_set(jsonb_set(target.payload, '{sourceIds}',
    (target.payload -> 'sourceIds') || jsonb_build_array(source_id)), '{sources}',
    (target.payload -> 'sources') || jsonb_build_array(reference));
  perform app_private.validate_catalog_payload(updated_payload);
  insert into public.catalog_spell_sources (spell_id, source_id) values (target.id, source_id);
  update public.catalog_spells set payload = updated_payload, revision = revision + 1, updated_at = clock_timestamp()
    where id = target.id;
end;
$reference_update$;
commit;
select spell.id, spell.status, spell.revision, spell.payload -> 'sourceIds' as source_ids,
  source.id as added_source_id, source.number as added_source_number, source.label, source.url
from public.catalog_spells spell
join public.catalog_spell_sources link on link.spell_id = spell.id
join public.catalog_sources source on source.id = link.source_id
where spell.slug = 'shutting-spell' and source.url = 'https://www.connotations.de/article/lynn-forest-hill-hey-dol-merry-dol-tom-bombadils-nonsense-or-tolkiens-creative-uncertainty-a-response-to-thomas-kullmann/';
