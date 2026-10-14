import Icon from '../Icon';
import AppLink from '../AppLink';
import { useAuth } from '../../shared/authContext';
import './styles.scss';

export type AccountGateProps = { ownerOnly?: boolean; returnTo?: string };

const AccountGate = ({ ownerOnly = false, returnTo = `/profile` }: AccountGateProps) => {
  const { account, loading } = useAuth();
  if (loading) return <div id='account-loading' className='account-loading' role='status' aria-label='Checking account availability'><span /><span /><span /><p>Checking account availability…</p></div>;
  return <section id='account-access-gate' className='account-gate'>
    <div><div className='account-gate-icon'><Icon name='shield' size={24} /></div><h2>{account ? `This space is reserved for the Owner.` : `Sign in to view this.`}</h2><p className='account-gate-copy'>{ownerOnly ? `The archive’s private workspace is available only to its verified Owner. Public browsing never unlocks private account data or review tools.` : `Your profile, connections, and submissions will live here when account services are connected. The public spell archive is ready to explore without signing in.`}</p><div className='account-gate-actions'>{!account ? <><AppLink id='account-gate-signin' href={`/signin?returnTo=${encodeURIComponent(returnTo)}`} className='primary-button'><Icon name='user' size={16} /> Sign in</AppLink><AppLink id='account-gate-signup' href='/signup' className='secondary-button'><Icon name='spark' size={16} /> Create account</AppLink></> : <AppLink href='/profile' className='secondary-button'><Icon name='user' size={16} /> Your profile</AppLink>}</div></div>
    <aside className='account-gate-meta'><Icon name='book' size={26} /><h3>Your curiosity can continue.</h3><p>Explore spells and keep favorites on this device. Cloud accounts and synchronization are not connected yet.</p><span className='account-gate-status'><i /> Connection unavailable</span></aside>
  </section>;
};

export default AccountGate;
