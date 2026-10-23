begin;
do $$
declare plan public.pricing_plans%rowtype;
begin
  select * into plan from public.pricing_plans where id = 'Plan_2_Starter_2026-10-23_b8b93b7a-130c-4210-9fe6-7aa9c1c79b1d' for update;
  if not found or plan.slug <> 'starter' or plan.price_cents <> 100 or plan.currency <> 'USD' or plan.interval <> 'month' then
    raise exception 'The Approved Starter Offer Changed';
  end if;
  if plan.description = 'Create private spell collections, save personal notes, practice with flashcards, and export your grimoire.' and not plan.removes_ads then return; end if;
  if plan.revision <> 2 or plan.description <> 'Make the spellbook your own with custom collections, notes, flashcard practice and grimoire export. Ad-free reading arrives when subscriptions launch.' then
    raise exception 'The Starter Copy Revision Changed. Review Before Updating';
  end if;
  update public.pricing_plans set removes_ads = false, revision = revision + 1, updated_at = now(),
    description = 'Create private spell collections, save personal notes, practice with flashcards, and export your grimoire.' where id = plan.id;
end; $$;
commit;
