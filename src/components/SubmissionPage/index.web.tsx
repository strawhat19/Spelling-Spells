import './styles.scss';
import Icon from '../Icon';
import AppLink from '../AppLink';
import TextReveal from '../TextReveal';
import { useEffect, useRef } from 'react';
import { useSubmissionPage } from './useSubmissionPage';
import { draftLimits } from '../../shared/submissions/service';
import type { SubmissionField } from '../../shared/submissions/types';

const fields: { key: SubmissionField; label: string; hint: string; required?: boolean; multiline?: boolean }[] = [
  { key: `name`, label: `Spell name`, hint: `The exact spelling, including any accents`, required: true },
  { key: `world`, label: `Story or world`, hint: `Book, film, game, or fictional universe`, required: true },
  { key: `pronunciation`, label: `Pronunciation`, hint: `Optional. Add a sound guide and distinguish it from a canonical pronunciation` },
  { key: `definition`, label: `What does it do?`, hint: `Use your own words and keep it grounded in the story`, required: true, multiline: true },
  { key: `sourceUrl`, label: `Source link`, hint: `An HTTPS link to the original work, publisher, creator, or reliable reference`, required: true },
  { key: `notes`, label: `Notes for the editor`, hint: `Optional. Edition, chapter, correction, or why this entry belongs here`, multiline: true },
];

const SubmissionPage = () => {
  const model = useSubmissionPage();
  const formRef = useRef<HTMLFormElement>(null);
  const { draft, loading, busy, dirty, preview, persisted, notice, errors, update, save, clear, showPreview } = model;

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
        <div><strong>Drafts are open. Online submissions are not connected yet.</strong><p>You can prepare, preview, and save a draft on this device. Nothing is sent to an editor or published.</p></div>
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
                      type={field.key === `sourceUrl` ? `url` : `text`}
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
          <div className='contribution-review-note'><Icon name='shield' size={19} /><p>When submissions launch, an editor will review them before anything reaches the public archive.</p></div>
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
          <a id='contribution-preview-source' href={draft.sourceUrl.trim()} target='_blank' rel='noreferrer'>View source<Icon name='external' size={16} /></a>
          <div className='contribution-send-row'><button id='contribution-send' type='button' className='secondary-button' disabled aria-describedby='contribution-send-explanation'><Icon name='lock' size={17} />Online Submission Unavailable</button><p id='contribution-send-explanation'>Save your draft for later. Account connection and editorial review will be enabled after setup.</p></div>
        </section>
      ) : null}
      {!loading ? <button id='contribution-clear' type='button' className='contribution-clear' disabled={busy} onClick={() => { if (window.confirm(`Clear the contribution draft on this device? This also removes your current edits.`)) void clear(); }}><Icon name='trash' size={16} />Clear This Draft</button> : null}
    </article>
  );
};

export default SubmissionPage;
