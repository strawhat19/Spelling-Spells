import './styles.scss';
import Icon from '../Icon';
import AppLink from '../AppLink';
import TextReveal from '../TextReveal';
import { useEffect, useRef } from 'react';
import { useSubmissionPage } from './useSubmissionPage';
import { draftLimits } from '../../shared/submissions/service';
import type { SubmissionField } from '../../shared/submissions/types';

const fields: { key: SubmissionField; label: string; hint: string; url?: boolean; required?: boolean; multiline?: boolean }[] = [
  { key: `name`, label: `Spell name`, hint: `The exact spelling, including any accents`, required: true },
  { key: `world`, label: `Story or world`, hint: `Book, film, game, or fictional universe`, required: true },
  { key: `pronunciation`, label: `Pronunciation`, hint: `Optional. Add a sound guide and distinguish it from a canonical pronunciation` },
  { key: `definition`, label: `What does it do?`, hint: `Use your own words and keep it grounded in the story`, required: true, multiline: true },
  { key: `sourceUrl`, label: `Source link`, hint: `An HTTPS link to the original work, publisher, creator, or reliable reference`, url: true, required: true },
  { key: `mediaUrl`, label: `Public image or media URL`, hint: `Optional. A public HTTPS link to an image, video, or other media for this spell`, url: true },
  { key: `notes`, label: `Notes for the editor`, hint: `Optional. Edition, chapter, correction, or why this entry belongs here`, multiline: true },
];

const SubmissionPage = () => {
  const model = useSubmissionPage();
  const formRef = useRef<HTMLFormElement>(null);
  const { draft, loading, busy, dirty, preview, persisted, notice, errors, update, save, clear, showPreview, submit } = model;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ``; };
    window.addEventListener(`beforeunload`, warn);
    return () => window.removeEventListener(`beforeunload`, warn);
  }, [dirty]);

  useEffect(() => {
    const field = Object.keys(errors)[0];
    if (field) formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#contribution-${field}`)?.focus();
  }, [errors]);

  return (
    <article id='contribution-page' className='contribution-page page-container'>
      <header id='contribution-heading' className='contribution-heading'>
        <span className='contribution-kicker'><Icon name='edit' size={17} />Add a page to the archive</span>
        <h1 id='contribution-title'><TextReveal id='contribution-title-opening' text={`A good spell starts`} /><br /><TextReveal id='contribution-title-ending' text={`with a good source.`} /></h1>
        <p>Know a magical word we have missed? Prepare a carefully sourced suggestion or help us correct an existing entry.</p>
      </header>
      <div id='contribution-connection' className='contribution-connection' role='status'>
        <Icon name='lock' size={21} />
        <div><strong>{model.configured ? `Sourced Suggestions Go To Private Owner Review` : `The Submission Service Needs Configuration`}</strong><p>Prepare and preview a draft here. Sign in to submit it; saving a device draft sends nothing. Submission does not publish an entry.</p></div>
      </div>
      <div id='contribution-workspace' className='contribution-workspace'>
        <form
          noValidate
          ref={formRef}
          id='contribution-form'
          className='contribution-form'
          onSubmit={(event) => { event.preventDefault(); showPreview(); }}
        >
          <div className='contribution-form-heading'><div><span className='contribution-step'>01 / Your contribution</span><h2 id='contribution-form-title'><TextReveal id='contribution-form-title-copy' text={`Leave a little knowledge.`} /></h2></div><span className='contribution-storage'>{loading ? `Loading Draft` : dirty ? `Unsaved Changes` : persisted ? `On This Device` : `Session Only`}</span></div>
          {loading ? <div className='contribution-skeleton' role='status' aria-label='Loading saved draft'><span /><span /><span /></div> : (
            <fieldset disabled={busy} className='contribution-fields'>
              <legend className='sr-only'>Contribution details</legend>
              <div className='contribution-kind' role='group' aria-label='Contribution type'>
                <button type='button' id='contribution-kind-new' aria-pressed={draft.kind === `new-spell`} onClick={() => update(`kind`, `new-spell`)}><Icon name='spark' size={17} />New Spell</button>
                <button type='button' id='contribution-kind-correction' aria-pressed={draft.kind === `correction`} onClick={() => update(`kind`, `correction`)}><Icon name='edit' size={17} />Correction</button>
              </div>
              {fields.map((field) => (
                <div id={`contribution-field-${field.key}`} className={`contribution-field ${field.multiline ? `is-wide` : ``}`} key={field.key}>
                  <label htmlFor={`contribution-${field.key}`}>{field.label}{field.required ? <span aria-hidden='true'> *</span> : null}</label>
                  {field.multiline ? (
                    <textarea
                      rows={field.key === `definition` ? 5 : 4}
                      id={`contribution-${field.key}`}
                      value={draft[field.key]}
                      required={field.required}
                      maxLength={draftLimits[field.key]}
                      aria-invalid={Boolean(errors[field.key])}
                      aria-describedby={`contribution-${field.key}-hint${errors[field.key] ? ` contribution-${field.key}-error` : ``}`}
                      onChange={(event) => update(field.key, event.target.value)}
                    />
                  ) : (
                    <input
                      id={`contribution-${field.key}`}
                      value={draft[field.key]}
                      required={field.required}
                      maxLength={draftLimits[field.key]}
                      type={field.url ? `url` : `text`}
                      autoComplete='off'
                      aria-invalid={Boolean(errors[field.key])}
                      aria-describedby={`contribution-${field.key}-hint${errors[field.key] ? ` contribution-${field.key}-error` : ``}`}
                      onChange={(event) => update(field.key, event.target.value)}
                    />
                  )}
                  <p id={`contribution-${field.key}-hint`} className='contribution-hint'>{field.hint}</p>
                  {errors[field.key] ? <p id={`contribution-${field.key}-error`} className='contribution-error'>{errors[field.key]}</p> : null}
                </div>
              ))}
              <div className='contribution-form-actions'>
                <button id='contribution-preview' type='submit' className='primary-button'><Icon name='book' size={18} />Preview Draft</button>
                <button id='contribution-save' type='button' className='secondary-button' onClick={() => void save()}><Icon name='bookmark' size={18} />{busy ? `Saving…` : `Save Draft`}</button>
              </div>
              <p className='contribution-local-note'><Icon name='shield' size={15} />Save Draft stores this text on the current device, not in a cloud account. Avoid personal information or credentials.</p>
            </fieldset>
          )}
          {notice ? <p id='contribution-feedback' className='contribution-feedback' role='status'>{notice}</p> : null}
        </form>
        <aside id='contribution-guidelines' className='contribution-guidelines'>
          <span className='contribution-seal'><Icon name='book' size={35} /></span>
          <p className='contribution-step'>A note from the archive</p>
          <h2 id='contribution-guidelines-title'><TextReveal id='contribution-guidelines-title-copy' text={`Wonder, with footnotes.`} /></h2>
          <p>Great entries make it easy to tell the story from the interpretation.</p>
          <ol><li><strong>Start with the original.</strong><span>Prefer an author, publisher, game, or primary reference.</span></li><li><strong>Write it in your words.</strong><span>Summarize instead of pasting a whole passage.</span></li><li><strong>Make uncertainty visible.</strong><span>A suggested origin or sound guide is not confirmed canon.</span></li></ol>
          <div className='contribution-review-note'><Icon name='shield' size={19} /><p>The Owner checks evidence and attribution before approving an entry. Approval and public publication are separate actions.</p></div>
          <AppLink id='contribution-examples' href='/spells' className='contribution-examples'>Explore existing entries<Icon name='arrow' size={17} /></AppLink>
        </aside>
      </div>
      {preview ? (
        <section id='contribution-preview-card' className='contribution-preview-card' aria-labelledby='contribution-preview-title'>
          <div className='contribution-preview-label'><Icon name='book' size={18} />02 / Draft preview · Not submitted</div>
          <h2 id='contribution-preview-title'>{draft.name}</h2>
          <p className='contribution-preview-world'>{draft.world} · {draft.kind === `correction` ? `Correction` : `New Spell`}</p>
          {draft.pronunciation ? <p className='contribution-preview-pronunciation'>{draft.pronunciation}</p> : null}
          <p className='contribution-preview-definition'>{draft.definition}</p>
          {draft.notes ? <p className='contribution-preview-notes'>{draft.notes}</p> : null}
          <div id='contribution-preview-links' className='contribution-preview-links'>
            <a id='contribution-preview-source' href={draft.sourceUrl.trim()} target='_blank' rel='noreferrer'>View source<Icon name='external' size={16} /></a>
            {draft.mediaUrl.trim() ? <a id='contribution-preview-media' href={draft.mediaUrl.trim()} target='_blank' rel='noreferrer'>View image or media<Icon name='external' size={16} /></a> : null}
          </div>
          <div className='contribution-send-row'><button id='contribution-send' type='button' className='primary-button' disabled={busy || model.authLoading || !model.configured} onClick={() => void submit()} aria-describedby='contribution-send-explanation'><Icon name={model.signedIn ? `check` : `user`} size={17} />{busy ? `Submitting…` : model.signedIn ? `Submit For Review` : `Sign In To Submit`}</button><p id='contribution-send-explanation'>A confirmed submission appears in your private <AppLink id='contribution-history' href='/submissions'>submission history</AppLink>. Your draft stays available if saving fails.</p></div>
        </section>
      ) : null}
      {!loading ? <button id='contribution-clear' type='button' className='contribution-clear' disabled={busy} onClick={() => { if (window.confirm(`Clear the contribution draft on this device? This also removes your current edits.`)) void clear(); }}><Icon name='trash' size={16} />Clear This Draft</button> : null}
    </article>
  );
};

export default SubmissionPage;
