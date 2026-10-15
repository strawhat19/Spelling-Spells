import Icon from '../Icon';
import AppLink from '../AppLink';
import BrandLogo from '../BrandLogo';
import PageMetadata from '../PageMetadata';
import GoogleBrandMark from '../GoogleBrandMark';
import { useAuthPage, type AuthPageProps } from './useAuthPage';
import './styles.scss';

const AuthPage = (props: AuthPageProps) => {
  const page = useAuthPage(props);
  return (
    <section id={`auth-page-${page.mode}`} className='auth-page'>
      <PageMetadata noIndex title={page.isSignUp ? `Create account` : `Sign in`} description='Sign in to your private Spelling Spells account, or explore the spell archive without an account.' />
      <div id='auth-story' className='auth-story'>
        <div className='auth-story-orbit auth-story-orbit--outer' aria-hidden='true' />
        <div className='auth-story-orbit auth-story-orbit--inner' aria-hidden='true' />
        <div className='auth-story-content'>
          <span className='auth-eyebrow'><Icon name='spark' size={15} /> YOUR PERSONAL ARCHIVE</span>
          <h1>{page.title}</h1>
          <p>{page.subtitle}</p>
          <div className='auth-illustration' aria-hidden='true'>
            <span className='auth-illustration-spark auth-illustration-spark--one'>✦</span>
            <span className='auth-illustration-spark auth-illustration-spark--two'>✧</span>
            <div className='auth-illustration-seal'><BrandLogo size={124} /></div>
            <span className='auth-illustration-caption'>WORDS HOLD WORLDS.</span>
          </div>
          <div className='auth-story-note'><Icon name='book' size={18} /><span>No account needed to explore.<br /><strong>Curiosity is always welcome here.</strong></span></div>
        </div>
      </div>
      <div id='auth-form-panel' className='auth-form-panel'>
        <AppLink id='auth-back-to-library' href='/spells' className='auth-back'><Icon name='arrow-left' size={16} /> Back to the archive</AppLink>
        <div className='auth-form-heading'>
          <span className='auth-eyebrow'>A LITTLE MAGIC, JUST FOR YOU</span>
          <h2>{page.formTitle}</h2>
          <div id='auth-switch-prompt' className='auth-switch-prompt'>
            <p>{page.isSignUp ? `Already have an account?` : `New to the archive?`}</p>
            <AppLink
              id='auth-switch-mode'
              className='auth-switch-button'
              href={page.switchHref}
            >
              <Icon name='user' size={17} />
              {page.isSignUp ? `Sign in instead` : `Sign up instead`}
              <Icon name='arrow-right' size={16} />
            </AppLink>
          </div>
        </div>
        {page.loading || page.unavailable || page.status === `error` || page.signedIn ? (
          <div id='auth-connection-notice' className='auth-connection-notice' role={page.status === `error` ? `alert` : `status`}>
            <Icon name='shield' size={20} />
            <div>
              <strong>{page.loading ? `Connecting your private account` : page.signedIn ? page.busy ? `Finishing your account request` : `Your account is ready` : page.unavailable ? `Account connection unavailable` : `Account connection needs attention`}</strong>
              <p>{page.loading ? `Please wait while your identity and private account are loaded.` : page.signedIn ? page.busy ? `Your identity is connected. Please wait for the requested account steps to finish.` : `You are signed in. Open your account to manage your profile.` : page.unavailable ? `Account services are not configured here. The fields are disabled and no credentials are collected.` : page.message ?? `Your private account could not be loaded. Retry the connection or sign out before trying another account.`}</p>
              {page.status === `error` || page.identity ? <div className='auth-recovery-actions'>
                {page.status === `error` && !page.loading ? <button id='auth-retry-connection' type='button' disabled={Boolean(page.busy) || page.signingOut} onClick={() => void page.retryConnection()}><Icon name='refresh' size={15} />{page.busy === `retry` ? `Retrying…` : `Retry connection`}</button> : null}
                {page.identity ? <button id='auth-reset-session' type='button' disabled={page.signingOut} onClick={() => void page.resetSession()}><Icon name='logout' size={15} />{page.signingOut ? `Signing out…` : `Sign out`}</button> : null}
              </div> : null}
            </div>
          </div>
        ) : null}
        {page.identity && !page.identity.emailVerified ? <div id='auth-verification' className='auth-connection-notice'>
          <Icon name='mail' size={19} />
          <div><strong>Verify your email address</strong><p>Open the verification email, then refresh your status. Your account access is still checked separately.</p><div className='auth-recovery-actions'>
            <button id='auth-resend-verification' type='button' disabled={Boolean(page.busy) || page.loading} onClick={() => void page.resendVerification()}><Icon name='mail' size={15} />{page.busy === `verify` ? `Requesting…` : `Resend verification`}</button>
            <button id='auth-refresh-verification' type='button' disabled={Boolean(page.busy) || page.loading} onClick={() => void page.refreshVerification()}><Icon name='refresh' size={15} />{page.busy === `refresh` ? `Refreshing…` : `I verified my email`}</button>
          </div></div>
        </div> : null}
        {page.signedIn ? page.busy ? <p className='auth-feedback' role='status'>Finishing your account request…</p> : <AppLink id='auth-open-profile' href={page.returnTo} className='primary-button'><Icon name='profile' size={17} /> Continue to your account</AppLink> : (
          <form id={`auth-form-${page.mode}`} className='auth-form' noValidate aria-busy={Boolean(page.busy) || page.loading} onSubmit={(event) => { event.preventDefault(); void page.submitEmail(); }}>
            <button
              type='button'
              id='auth-google-button'
              className='auth-google-button'
              disabled={!page.editable}
              onClick={() => void page.signInWithGoogle()}
            >
              <GoogleBrandMark />
              <span id='auth-google-label' className='auth-google-label'>{page.busy === `google` ? `Connecting to Google…` : `Continue with Google`}</span>
            </button>
            <div className='auth-divider'><span />or with email<span /></div>
            <fieldset disabled={!page.editable}>
              {page.isSignUp ? <label htmlFor='auth-name'>Display name
                <input id='auth-name' type='text' value={page.displayName} maxLength={80} autoComplete='nickname' placeholder='How should we call you?' aria-invalid={Boolean(page.errors.displayName)} aria-describedby={page.errors.displayName ? `auth-name-error` : undefined} onChange={(event) => page.setField(`displayName`, event.target.value)} />
                {page.errors.displayName ? <span id='auth-name-error' className='auth-field-error'>{page.errors.displayName}</span> : null}
              </label> : null}
              <label htmlFor='auth-email'>Email address
                <input id='auth-email' type='email' value={page.email} maxLength={254} autoComplete='email' autoCapitalize='none' spellCheck={false} placeholder='you@example.com' aria-invalid={Boolean(page.errors.email)} aria-describedby={page.errors.email ? `auth-email-error` : undefined} onChange={(event) => page.setField(`email`, event.target.value)} />
                {page.errors.email ? <span id='auth-email-error' className='auth-field-error'>{page.errors.email}</span> : null}
              </label>
              <label htmlFor='auth-password'>Password
                <span className='auth-password-field'><input id='auth-password' type='password' value={page.password} maxLength={128} autoComplete={page.isSignUp ? `new-password` : `current-password`} placeholder={page.unavailable ? `Available after account setup` : page.isSignUp ? `At least 12 characters` : `Your password`} aria-invalid={Boolean(page.errors.password)} aria-describedby={page.errors.password ? `auth-password-error` : page.isSignUp ? `auth-password-hint` : undefined} onChange={(event) => page.setField(`password`, event.target.value)} /><Icon name='shield' size={17} /></span>
                {page.errors.password ? <span id='auth-password-error' className='auth-field-error'>{page.errors.password}</span> : page.isSignUp ? <span id='auth-password-hint' className='auth-field-hint'>Use 12–128 characters. Your password is handled by the sign-in provider.</span> : null}
              </label>
              <button id='auth-email-button' type='submit' className='primary-button'><Icon name='spark' size={17} />{page.busy === `email` ? `Connecting…` : page.isSignUp ? `Create account` : `Sign in`}<Icon name='arrow-right' size={16} /></button>
            </fieldset>
            {!page.isSignUp ? <button id='auth-password-reset' type='button' className='auth-reset-button' disabled={!page.editable} onClick={() => void page.requestReset()}><Icon name='mail' size={15} />{page.busy === `reset` ? `Requesting reset…` : `Send a password reset email`}</button> : null}
          </form>
        )}
        {page.feedback ? <p id='auth-feedback' className={`auth-feedback auth-feedback--${page.feedback.tone}`} role={page.feedback.tone === `error` ? `alert` : `status`}>{page.feedback.message}</p> : null}
        <p className='auth-privacy-note'><Icon name='shield' size={13} />{page.signedIn ? `Your account profile is private.` : `Explore freely. Device bookmarks remain separate from your account.`}</p>
        <p className='auth-legal'>Learn about the archive’s <AppLink href='/terms'>Terms</AppLink> and <AppLink href='/privacy'>Privacy Policy</AppLink>.{page.unavailable ? ` No account is created while services are unavailable.` : ``}</p>
      </div>
    </section>
  );
};

export default AuthPage;
