import Icon from '../Icon';
import AppLink from '../AppLink';
import TextReveal from '../TextReveal';
import { useAccountGate } from './useAccountGate';
import './styles.scss';

export type AccountGateProps = { ownerOnly?: boolean; returnTo?: string };

const AccountGate = ({ ownerOnly = false, returnTo = `/profile` }: AccountGateProps) => {
  const gate = useAccountGate(ownerOnly);
  const { account, loading } = gate;
  if (loading) return <div id='account-loading' className='account-loading' role='status' aria-label='Checking account availability'><span /><span /><span /><p>Checking account availability…</p>{gate.identity ? <button id='account-loading-signout' type='button' disabled={gate.signingOut} className='secondary-button' onClick={() => void gate.recover(`signout`)}><Icon name='logout' size={16} />{gate.signingOut ? `Signing out…` : `Sign out`}</button> : null}</div>;
  return <section id='account-access-gate' className='account-gate'>
    <div><div className='account-gate-icon'><Icon name='shield' size={24} /></div><h2 id='account-gate-title'>{gate.needsRecovery ? gate.title : <TextReveal id='account-gate-title-text' text={gate.title} />}</h2><p className='account-gate-copy'>{gate.copy}</p><div className='account-gate-actions'>{gate.needsRecovery ? <><button id='account-gate-retry' type='button' className='primary-button' disabled={gate.retrying || gate.signingOut} onClick={() => void gate.recover(`retry`)}><Icon name='refresh' size={16} />{gate.retrying ? `Retrying…` : `Retry account`}</button><button id='account-gate-signout' type='button' className='secondary-button' disabled={gate.signingOut} onClick={() => void gate.recover(`signout`)}><Icon name='logout' size={16} />{gate.signingOut ? `Signing out…` : `Sign out`}</button></> : !account ? <><AppLink id='account-gate-signin' href={`/signin?returnTo=${encodeURIComponent(returnTo)}`} className='primary-button'><Icon name='user' size={16} /> Sign in</AppLink><AppLink id='account-gate-signup' href={`/signup?returnTo=${encodeURIComponent(returnTo)}`} className='secondary-button'><Icon name='spark' size={16} /> Create account</AppLink></> : <AppLink href='/profile' className='secondary-button'><Icon name='user' size={16} /> Your profile</AppLink>}</div></div>
    <aside className='account-gate-meta'><Icon name='book' size={26} /><h3>Your curiosity can continue.</h3><p>The public archive stays open. Device bookmarks remain on this browser or app, separate from your private account collection.</p><span className='account-gate-status'><i /> {gate.statusLabel}</span></aside>
  </section>;
};

export default AccountGate;
