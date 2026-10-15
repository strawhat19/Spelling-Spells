import Icon from '../Icon';
import AppLink from '../AppLink';
import AccountLayout from '../AccountLayout';
import AccountGate from '../AccountLayout/AccountGate';
import { useProfilePage, type ProfilePageProps } from './useProfilePage';
import './styles.scss';

const ProfilePage = (props: ProfilePageProps) => {
  const page = useProfilePage(props);
  const busy = Boolean(page.busy) || page.loading || page.signingOut;
  const verificationActions = page.identity && !page.identity.emailVerified ? <div id='profile-verification-actions' className='profile-inline-actions'>
    <button id='profile-resend-verification' type='button' disabled={busy} onClick={() => void page.resendVerification()}><Icon name='mail' size={15} />{page.busy === `verify` ? `Requesting…` : `Resend verification`}</button>
    <button id='profile-refresh-verification' type='button' disabled={busy} onClick={() => void page.refreshVerification()}><Icon name='refresh' size={15} />{page.busy === `refresh` ? `Refreshing…` : `I verified my email`}</button>
  </div> : null;

  return <AccountLayout title={page.title} description={page.description}>
    {!page.allowed ? page.showRecovery ? <section id='profile-connection-recovery' className='profile-settings'>
      <div className='profile-status-note' role={page.loading ? `status` : `alert`}><Icon name='shield' size={20} /><div><strong>{page.loading ? `Connecting your private account` : `Private account unavailable`}</strong><p>{page.loading ? `Waiting for the server to confirm your private account. You can sign out without waiting.` : page.message ?? `Your identity is signed in, but the private account could not be loaded. Retry the connection or sign out before changing accounts.`}</p></div></div>
      <div className='profile-inline-actions'>
        <button id='profile-retry-connection' type='button' disabled={busy} onClick={() => void page.retryConnection()}><Icon name='refresh' size={15} />{page.busy === `retry` ? `Retrying…` : `Retry connection`}</button>
        {page.identity ? <button id='profile-reset-session' type='button' disabled={page.signingOut} onClick={() => void page.resetSession()}><Icon name='logout' size={15} />{page.signingOut ? `Signing out…` : `Sign out`}</button> : null}
      </div>
      {verificationActions ? <div className='profile-verification'><p>Your sign-in email is not verified. You can request a new verification email without access to this profile.</p>{verificationActions}</div> : null}
    </section> : <AccountGate returnTo={page.view === `connections` ? `/profile/connections` : `/profile`} /> : page.view === `connections` ? (
      <div id='profile-connections' className='profile-connections'>
        <div className='profile-status-note'><Icon name='shield' size={20} /><div><strong>Your account identity is connected.</strong><p>Each service has its own status. This page does not collect provider API keys, passwords, or tokens.</p></div></div>
        {page.connectionRequirements.map((item) => <article key={item.id} id={`connection-${item.id}`} className='profile-connection-card'>
          <span className='profile-connection-icon'><Icon name={item.icon} size={23} /></span>
          <div className='profile-connection-copy'><h2>{item.name}</h2><p>{item.detail}</p></div>
          {item.id === `sync` ? <AppLink id='connection-open-spellbook' href='/saved' className='profile-connection-status'><Icon name='arrow-right' size={15} />{item.status}</AppLink> : <span className={`profile-connection-status${item.connected ? ` profile-connection-status--connected` : ``}`}><i aria-hidden='true' />{item.status}</span>}
        </article>)}
        <p className='profile-footnote'>Your private profile is not published. External provider reporting and contribution review remain unavailable until their separate services are connected.</p>
      </div>
    ) : (
      <div id='profile-details' className='profile-layout'>
        <section id='profile-settings' className='profile-settings'>
          <div className='profile-identity'><span className='profile-large-avatar'>{page.avatarUrl ? <img id='profile-avatar-image' src={page.avatarUrl} alt='' referrerPolicy='no-referrer' onError={page.onAvatarError} /> : page.avatarInitial}</span><div><h2>{page.account?.displayName}</h2><p>Private account profile</p></div></div>
          <div className='profile-status-note'><Icon name='shield' size={18} /><p>Your name and avatar are editable. Email, account access, and identity are managed separately and cannot be changed by this form.</p></div>
          <form id='profile-settings-form' noValidate aria-busy={busy} onSubmit={(event) => { event.preventDefault(); void page.saveProfile(); }}>
            <div className='profile-field'><label htmlFor='profile-name'>Name</label><div>
              <input id='profile-name' value={page.displayName} disabled={!page.editable} maxLength={80} autoComplete='nickname' aria-invalid={Boolean(page.errors.displayName)} aria-describedby={page.errors.displayName ? `profile-name-error` : `profile-name-hint`} onChange={(event) => page.setField(`displayName`, event.target.value)} />
              {page.errors.displayName ? <small id='profile-name-error' className='profile-field-error'>{page.errors.displayName}</small> : <small id='profile-name-hint'>Display name, 1–80 characters</small>}
            </div></div>
            <div className='profile-field'><label htmlFor='profile-avatar'>Avatar</label><div>
              <input id='profile-avatar' type='url' value={page.avatarDraft} disabled={!page.editable} maxLength={2048} autoComplete='url' autoCapitalize='none' spellCheck={false} placeholder='https://example.com/avatar.jpg' aria-invalid={Boolean(page.errors.avatarUrl)} aria-describedby={page.errors.avatarUrl ? `profile-avatar-error` : `profile-avatar-hint`} onChange={(event) => page.setField(`avatarUrl`, event.target.value)} />
              {page.errors.avatarUrl ? <small id='profile-avatar-error' className='profile-field-error'>{page.errors.avatarUrl}</small> : <small id='profile-avatar-hint'>Use an HTTPS image URL, or leave blank for your initial. Images load from their host after saving; uploads are not supported.</small>}
            </div></div>
            <div className='profile-field'><label htmlFor='profile-email'>Email</label><div>
              <input readOnly id='profile-email' type='email' value={page.account?.email ?? ``} aria-describedby='profile-email-status' />
              <small id='profile-email-status'>{page.identity?.emailVerified ? `Verified email` : `Email not yet verified`}. Managed by your sign-in provider.</small>
              {verificationActions}
            </div></div>
            <div className='profile-field'><span>Privacy</span><div className='profile-privacy-value'><Icon name='shield' size={16} /><span>Private account<small>No public profile is published</small></span></div></div>
            <div className='profile-form-footer'>
              <span id='profile-save-state'>{page.busy === `save` ? `Waiting for confirmation…` : page.dirty ? `Unsaved changes` : `Showing your current account details`}</span>
              <div className='profile-form-actions'>
                {page.dirty ? <button id='profile-discard-changes' className='profile-discard-button' type='button' disabled={busy} onClick={page.discardChanges}><Icon name='close' size={15} />Discard</button> : null}
                <button id='profile-save' className='primary-button' type='submit' disabled={!page.editable || !page.dirty}><Icon name='check' size={16} />{page.busy === `save` ? `Saving…` : `Save changes`}</button>
              </div>
            </div>
          </form>
        </section>
        <aside id='profile-metadata' className='profile-metadata'>
          <h2>Your account</h2>
          <dl><div><dt>No.</dt><dd>{page.account?.number}</dd></div><div><dt>Access</dt><dd>{page.account?.roleVerified ? page.account.role : `Unverified`}</dd></div><div><dt>Profile</dt><dd>Private</dd></div><div><dt>Email</dt><dd>{page.identity?.emailVerified ? `Verified` : `Unverified`}</dd></div></dl>
          <AppLink id='profile-open-connections' href='/profile/connections' className='profile-metadata-link'><Icon name='link' size={15} /> Private connections<Icon name='arrow-right' size={14} /></AppLink>
          <AppLink id='profile-open-spellbook' href='/saved' className='profile-metadata-link'><Icon name='bookmark' size={15} /> Your spellbook<Icon name='arrow-right' size={14} /></AppLink>
          <div className='profile-device-settings'><Icon name='moon' size={19} /><h3>Make yourself at home.</h3><p>Theme is saved on this device, independently of your account.</p><button id='profile-toggle-theme' type='button' onClick={() => void page.toggleTheme()}><Icon name={page.theme === `night` ? `sun` : `moon`} size={15} /> Use {page.theme === `night` ? `Ivory` : `Midnight`} theme</button></div>
        </aside>
      </div>
    )}
    {page.feedback ? <p id='profile-feedback' className={`profile-feedback profile-feedback--${page.feedback.tone}`} role={page.feedback.tone === `error` ? `alert` : `status`}>{page.feedback.message}</p> : null}
    {!page.allowed ? <div id='profile-device-note' className='profile-device-note'><Icon name='bookmark' size={19} /><p>Your spellbook is already yours.<span>Device bookmarks are kept separately from your private account collection.</span></p><AppLink href='/saved'><span>Open spellbook</span><Icon name='arrow-right' size={16} /></AppLink></div> : null}
  </AccountLayout>;
};

export default ProfilePage;
