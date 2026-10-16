import Icon from '../Icon';
import AppLink from '../AppLink';
import { usePathname } from 'expo-router';
import { useAuth } from '../../shared/authContext';
import { useEffect, useRef, useState } from 'react';
import { canAccessOwner, getAccountAvatar, getAccountPlanLabel } from '../../shared/authentication/types';
import './styles.scss';

const UserMenu = () => {
  const pathname = usePathname();
  const { account, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(``);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); setError(``); }, [pathname, account?.id]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === `Escape`) { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener(`pointerdown`, outside);
    document.addEventListener(`keydown`, escape);
    return () => { document.removeEventListener(`pointerdown`, outside); document.removeEventListener(`keydown`, escape); };
  }, [open]);

  if (loading) return <span id='header-account-loading' className='user-menu-loading' aria-label='Loading Account' />;
  if (!account) return <AppLink id='header-signin-link' href='/signin' className='header-signin-link' aria-label='Sign In'><Icon name='user' size={19} /><span>Sign In</span></AppLink>;
  const avatar = getAccountAvatar(account);
  const photo = avatar === failedPhoto ? null : avatar;
  const initial = account.displayName.trim().slice(0, 1).toUpperCase() || `A`;
  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await signOut();
      if (!result.ok) setError(result.message);
      else setOpen(false);
    } catch { setError(`Sign Out Could Not Be Completed`); }
    finally { setBusy(false); }
  };

  return <div ref={root} id='header-account-menu' className='user-menu'>
    <button ref={trigger} id='header-account-trigger' type='button' className='user-menu-trigger' onClick={() => setOpen((value) => !value)} aria-haspopup='dialog' aria-expanded={open} aria-controls={open ? `header-account-popover` : undefined} aria-label={`Account Menu for ${account.displayName}`}>
      {photo ? <img className='user-menu-avatar' src={photo} alt='' referrerPolicy='no-referrer' onError={() => setFailedPhoto(photo)} /> : <span className='user-menu-avatar'>{initial}</span>}
    </button>
    {open ? <div id='header-account-popover' className='user-menu-popover' role='dialog' aria-label='Your Account'>
      <div id='user-menu-identity' className='user-menu-identity'>
        <p className='user-menu-name' title={account.displayName}>{account.displayName}</p>
        <span id='user-menu-role' className='user-menu-pill user-menu-role'><Icon name='shield' size={10} />{account.roleVerified ? account.role : `Role Unavailable`}</span>
        <p className='user-menu-email' title={account.email}>{account.email}</p>
        <span id='user-menu-plan' className='user-menu-pill user-menu-plan'><Icon name='spark' size={10} />{getAccountPlanLabel(account)}</span>
      </div>
      <nav aria-label='Account Navigation' onClick={() => setOpen(false)}><AppLink id='user-menu-profile' href='/profile'><Icon name='user' size={17} />Profile</AppLink>{canAccessOwner(account) ? <AppLink id='user-menu-dashboard' href='/dashboard'><Icon name='dashboard' size={17} />Dashboard</AppLink> : null}</nav>
      <button id='user-menu-signout' type='button' disabled={busy} onClick={() => void logout()}><Icon name='logout' size={17} />{busy ? `Signing Out…` : `Sign Out`}</button>
      {error ? <p className='user-menu-error' role='alert'>{error}</p> : null}
    </div> : null}
  </div>;
};

export default UserMenu;
