update public.pricing_plans
set description = 'Make the spellbook your own with custom collections, notes, flashcard practice and grimoire export. Ad-free reading arrives when subscriptions launch.',
    features = '["Everything In Free","Custom Spell Collections","Personal Notes For Every Spell","Flashcards And Mastery Tracking","Export Collections, Notes And Progress","Support The Growing Archive"]'::jsonb,
    revision = revision + 1,
    updated_at = clock_timestamp()
where slug = 'starter' and revision = 1 and price_cents = 100
returning id, slug, description, features, price_cents, revision, updated_at;
