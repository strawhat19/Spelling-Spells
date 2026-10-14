import Icon from '../Icon';
import AppLink from '../AppLink';
import BrandLogo from '../BrandLogo';
import PageMetadata from '../PageMetadata';
import { useAuthPage, type AuthPageProps } from './useAuthPage';
import './styles.scss';

const AuthPage = (props: AuthPageProps) => {
  const page = useAuthPage(props);
  return (
    <section id={`auth-page-${page.mode}`} className='auth-page'>
      <PageMetadata noIndex title={page.isSignUp ? `Create account` : `Sign in`} description='Account services are not connected yet. Browse the spell archive without an account.' />
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
        <div className='auth-form-heading'><span className='auth-eyebrow'>A LITTLE MAGIC, JUST FOR YOU</span><h2>{page.formTitle}</h2><p>{page.isSignUp ? `Already have an account?` : `New to the archive?`} <AppLink href={page.isSignUp ? `/signin` : `/signup`}>{page.isSignUp ? `Sign in` : `Create an account`}</AppLink></p></div>
        <div id='auth-connection-notice' className='auth-connection-notice' role='status'><Icon name='shield' size={20} /><div><strong>{page.loading ? `Checking account availability` : `Account connection coming next`}</strong><p>Sign-in is not connected in this frontend preview. The fields below are disabled, and no credentials are collected.</p></div></div>
        {page.account ? <AppLink id='auth-open-profile' href='/profile' className='primary-button'><Icon name='profile' size={17} /> Open your profile</AppLink> : null}
        <form id={`auth-form-${page.mode}`} className='auth-form' aria-describedby='auth-connection-notice' onSubmit={(event) => event.preventDefault()}>
          <button id='auth-google-button' type='button' className='auth-google-button' disabled><span aria-hidden='true' className='auth-google-mark'>G</span> Continue with Google<Icon name='arrow-right' size={15} /></button>
          <div className='auth-divider'><span />or with email<span /></div>
          <fieldset disabled>
            {page.isSignUp ? <label htmlFor='auth-name'>Display name<input id='auth-name' type='text' placeholder='How should we call you?' autoComplete='off' /></label> : null}
            <label htmlFor='auth-email'>Email address<input id='auth-email' type='email' placeholder='you@example.com' autoComplete='off' /></label>
            <label htmlFor='auth-password'>Password<span className='auth-password-field'><input id='auth-password' type='password' placeholder='Available after account setup' autoComplete='off' /><Icon name='shield' size={17} /></span></label>
            <button id='auth-email-button' type='submit' className='primary-button'><Icon name='spark' size={17} /> {page.isSignUp ? `Create account` : `Sign in`} <Icon name='arrow-right' size={16} /></button>
          </fieldset>
        </form>
        <p className='auth-privacy-note'><Icon name='shield' size={13} /> Your saved spells still stay on this device.</p>
        <p className='auth-legal'>Learn about the archive’s <AppLink href='/terms'>Terms</AppLink> and <AppLink href='/privacy'>Privacy Policy</AppLink>. No account or agreement is created here.</p>
      </div>
    </section>
  );
};

export default AuthPage;
