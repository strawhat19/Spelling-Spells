import './styles.scss';
import Icon from '../Icon';
import AppLink from '../AppLink';
import TextReveal from '../TextReveal';
import { useEffect, useRef } from 'react';
import PageMetadata from '../PageMetadata';
import { useContactPage } from './useContactPage';
import { contactLimits } from '../../shared/contacts/values';

const fields = [
  { key: `name`, label: `Your name`, complete: `name`, hint: `What should we call you?` },
  { key: `email`, label: `Email address`, complete: `email`, hint: `A contact address for your request` },
  { key: `subject`, label: `Subject`, complete: `off`, hint: `A few words about your message` },
  { key: `message`, label: `Your message`, complete: `off`, hint: `Include a spell name, source, or page link when useful` },
] as const;

const ContactPage = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const { input, busy, errors, error, receipt, allowed, loading, editable, configured, update, submit, retryAccess, accessMessage } = useContactPage();

  useEffect(() => {
    const field = fields.find((item) => errors[item.key]);
    if (field) formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#contact-${field.key}`)?.focus();
  }, [errors]);

  return (
    <article id='contact-page' className='ss-contact page-container' aria-labelledby='contact-title'>
      <PageMetadata title='Contact' canonicalPath='/contact' description='Send Spelling Spells a private message about the spellbook, a correction, credit, or support.' />
      <header id='contact-heading' className='ss-contact-heading'>
        <span className='ss-contact-kicker'><Icon name='mail' size={17} />A conversation beyond the spellbook</span>
        <h1 id='contact-title'><TextReveal id='contact-title-copy' text={`A little note. A new connection.`} /></h1>
        <p>Questions, corrections and concerns about credit, privacy or billing belong with the people behind Spelling Spells.</p>
      </header>
      <div id='contact-workspace' className='ss-contact-workspace'>
        {allowed ? <form noValidate ref={formRef} id='contact-form' className='ss-contact-form' aria-labelledby='contact-form-title' aria-busy={busy} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <div id='contact-form-heading' className='ss-contact-form-heading'><span className='ss-contact-step'>01 / Your message</span><h2 id='contact-form-title'>Leave a little ink.</h2><p>Messages are stored privately for review.</p></div>
          {!configured ? <div id='contact-unavailable' className='ss-contact-feedback is-error' role='status'><Icon name='lock' size={18} /><div><strong>Contact Unavailable</strong><p>Messages cannot be saved right now. Please try again later.</p></div></div> : null}
          <fieldset id='contact-fields' className='ss-contact-fields' disabled={!editable}>
            <legend className='sr-only'>Contact details</legend>
            {fields.map((field) => (
              <div key={field.key} id={`contact-field-${field.key}`} className={`ss-contact-field${field.key === `message` || field.key === `subject` ? ` is-wide` : ``}`}>
                <label htmlFor={`contact-${field.key}`}>{field.label}<span aria-hidden='true'> *</span></label>
                {field.key === `message` ? (
                  <textarea required rows={7} id='contact-message' name='message' value={input.message} maxLength={contactLimits.message} aria-invalid={Boolean(errors.message)} aria-describedby={`contact-message-hint${errors.message ? ` contact-message-error` : ``}`} onChange={(event) => update(`message`, event.target.value)} />
                ) : (
                  <input required id={`contact-${field.key}`} name={field.key} value={input[field.key]} autoComplete={field.complete} type={field.key === `email` ? `email` : `text`} inputMode={field.key === `email` ? `email` : `text`} autoCapitalize={field.key === `email` ? `none` : `sentences`} maxLength={contactLimits[field.key]} aria-invalid={Boolean(errors[field.key])} aria-describedby={`contact-${field.key}-hint${errors[field.key] ? ` contact-${field.key}-error` : ``}`} onChange={(event) => update(field.key, event.target.value)} />
                )}
                <p id={`contact-${field.key}-hint`} className='ss-contact-hint'>{field.hint}</p>
                {errors[field.key] ? <p id={`contact-${field.key}-error`} className='ss-contact-field-error'>{errors[field.key]}</p> : null}
              </div>
            ))}
            <div id='contact-website-field' className='ss-contact-honeypot' aria-hidden='true'><label htmlFor='contact-website'>Website</label><input id='contact-website' name='website' type='text' value={input.website} tabIndex={-1} maxLength={contactLimits.website} autoComplete='off' onChange={(event) => update(`website`, event.target.value)} /></div>
            <div id='contact-actions' className='ss-contact-actions'><button id='contact-submit' type='submit' className='primary-button' disabled={!editable}><Icon name={busy ? `refresh` : `mail`} size={18} />{busy ? `Saving Message…` : loading ? `Getting Ready…` : `Send Message`}<Icon name='arrow' size={16} /></button><p>Required fields are marked *. Please leave passwords and other private credentials out of your message.</p></div>
          </fieldset>
          {error ? <div id='contact-save-error' className='ss-contact-feedback is-error' role='alert'><Icon name='shield' size={19} /><div><strong>Message Not Confirmed</strong><p>{error}</p><p>Your entries are still here. You can retry.</p></div></div> : null}
          {receipt ? <div id='contact-save-success' className='ss-contact-feedback' role='status'><Icon name='check' size={22} /><div><strong>Message Saved</strong><p>Thank you. Your message was received and is stored privately for review.</p></div></div> : null}
        </form> : <section id='contact-access' className='ss-contact-form' aria-labelledby='contact-access-title'><h2 id='contact-access-title'>{loading ? `Opening Contact` : `Contact Unavailable`}</h2><p id='contact-access-message' role='status'>{accessMessage}</p><button id='contact-access-reload' type='button' className='primary-button' onClick={retryAccess}><Icon name='refresh' size={17} />Reload Access</button></section>}
        <aside id='contact-guidance' className='ss-contact-guidance' aria-labelledby='contact-guidance-title'>
          <span className='ss-contact-seal'><Icon name='spark' size={32} /></span>
          <span className='ss-contact-step'>A note from the archive</span>
          <h2 id='contact-guidance-title'>Every good story starts with a word.</h2>
          <p>Questions about an entry, a missing credit, or something that feels out of place are all welcome here.</p>
          <div id='contact-reference-tip' className='ss-contact-tip'><Icon name='book' size={20} /><div><h3>Keep the source close.</h3><p>For corrections, include the spell’s exact name and a link or reference to the original work.</p></div></div>
          <div id='contact-privacy-tip' className='ss-contact-tip'><Icon name='shield' size={20} /><div><h3>A private conversation.</h3><p>Saved messages are private to the site owner. Wait for Message Saved before treating a message as received; no automated email is sent.</p></div></div>
          <nav id='contact-help-links' className='ss-contact-links' aria-label='More About Spelling Spells'><AppLink id='contact-about-link' href='/about'><Icon name='book' size={16} />About the project<Icon name='arrow' size={15} /></AppLink><AppLink id='contact-guidelines-link' href='/guidelines'><Icon name='edit' size={16} />Editorial Guidelines<Icon name='arrow' size={15} /></AppLink><AppLink id='contact-privacy-link' href='/privacy'><Icon name='shield' size={16} />Privacy Policy<Icon name='arrow' size={15} /></AppLink></nav>
        </aside>
      </div>
    </article>
  );
};

export default ContactPage;
