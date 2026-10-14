import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import AppLink from '../AppLink';
import { useAuth } from '../../shared/authContext';
import { canAccessOwner, getAccountAvatar } from '../../shared/authentication/types';
import './styles.scss';

const UserMenu = () => {
  const pathname = usePathname();
  const { account, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(``);
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
  const photo = getAccountAvatar(account);
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
    <button ref={trigger} id='header-account-trigger' type='button' className='user-menu-trigger' onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls='header-account-popover' aria-label={`Account Menu for ${account.displayName}`}>
      {photo ? <img className='user-menu-avatar' src={photo} alt='' referrerPolicy='no-referrer' /> : <span className='user-menu-avatar'>{initial}</span>}
    </button>
    {open ? <div id='header-account-popover' className='user-menu-popover'>
      <p className='user-menu-name'>{account.displayName}</p>
      <nav aria-label='Account Navigation'><AppLink id='user-menu-profile' href='/profile'><Icon name='user' size={17} />Profile</AppLink><AppLink id='user-menu-saved' href='/saved'><Icon name='bookmark' size={17} />Saved Spells</AppLink>{canAccessOwner(account) ? <AppLink id='user-menu-dashboard' href='/dashboard'><Icon name='dashboard' size={17} />Dashboard</AppLink> : null}</nav>
      <button id='user-menu-signout' type='button' disabled={busy} onClick={() => void logout()}><Icon name='logout' size={17} />{busy ? `Signing Out…` : `Sign Out`}</button>
      {error ? <p className='user-menu-error' role='alert'>{error}</p> : null}
    </div> : null}
  </div>;
};

export default UserMenu;
