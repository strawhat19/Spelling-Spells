import './styles.scss';
import Icon from '../Icon';
import AppLink from '../AppLink';
import { createPortal } from 'react-dom';
import NotificationCard from '../NotificationCard';
import { useNotificationMenu } from './useNotificationMenu';
import { useRef, useState, useEffect, useCallback } from 'react';

const NotificationMenu = () => {
  const page = useNotificationMenu();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 80, left: 18, maxHeight: 500 });
  const close = useCallback((restoreFocus = true) => {
    page.close();
    if (restoreFocus) trigger.current?.focus();
  }, [page.close]);
  const toggle = () => {
    if (page.open) { close(); return; }
    page.reload();
    window.dispatchEvent(new CustomEvent(`spelling-spells:header-popover-open`, { detail: `notifications` }));
    page.setOpen(true);
  };
  useEffect(() => {
    const otherMenu = (event: Event) => { if ((event as CustomEvent).detail !== `notifications`) close(false); };
    window.addEventListener(`spelling-spells:header-popover-open`, otherMenu);
    return () => window.removeEventListener(`spelling-spells:header-popover-open`, otherMenu);
  }, [close]);
  useEffect(() => {
    if (!page.open) return;
    const updatePosition = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      if (!anchor) return;
      const width = Math.min(400, window.innerWidth - 36);
      const top = Math.max(12, Math.min(anchor.bottom + 10, window.innerHeight - 120));
      setPosition({ top, left: Math.max(18, Math.min(anchor.right - width, window.innerWidth - width - 18)), maxHeight: window.innerHeight - top - 18 });
    };
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || panel.current?.contains(event.target) || trigger.current?.contains(event.target)) return;
      close(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === `Escape`) { event.preventDefault(); close(); } };
    updatePosition();
    closeButton.current?.focus({ preventScroll: true });
    window.addEventListener(`resize`, updatePosition);
    window.addEventListener(`scroll`, updatePosition, true);
    document.addEventListener(`pointerdown`, outside);
    document.addEventListener(`keydown`, escape);
    return () => {
      window.removeEventListener(`resize`, updatePosition);
      window.removeEventListener(`scroll`, updatePosition, true);
      document.removeEventListener(`pointerdown`, outside);
      document.removeEventListener(`keydown`, escape);
    };
  }, [page.open, close]);
  const unreadDescription = page.unreadCount === null ? `Unread Count ${page.state === `loading` || page.readState === `loading` ? `Loading` : `Unavailable`}` : `${page.unreadCount} Unread`;
  return <div id='header-notifications' className='notification-menu'>
    <button ref={trigger} id='header-notifications-trigger' type='button' onClick={toggle} className={`notification-menu-trigger${page.open ? ` is-open` : ``}`} aria-label={`Notifications, ${unreadDescription}`} title='Notifications' aria-haspopup='dialog' aria-expanded={page.open} aria-controls={page.open ? `header-notifications-panel` : undefined}><Icon name='bell' size={20} />{page.unreadCount === null || page.unreadCount > 0 ? <span id='header-notifications-badge' className='notification-menu-badge' aria-hidden='true'>{page.unreadLabel}</span> : null}</button>
    {page.open && typeof document !== `undefined` ? createPortal(<section
      ref={panel}
      role='dialog'
      aria-modal='false'
      style={position}
      id='header-notifications-panel'
      className='notification-menu-panel'
      aria-labelledby='header-notifications-title'
      onBlur={(event) => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget) && !trigger.current?.contains(event.relatedTarget)) close(false); }}
    >
      <header id='header-notifications-heading' className='notification-menu-heading'><div id='header-notifications-heading-copy' className='notification-menu-heading-copy'><span id='header-notifications-eyebrow'>From the Archive</span><h2 id='header-notifications-title'>Notifications</h2></div><button ref={closeButton} id='header-notifications-close' type='button' onClick={() => close()} className='notification-menu-close' aria-label='Close Notifications'><Icon name='close' size={18} /></button></header>
      <div id='header-notifications-toolbar' className='notification-menu-toolbar'><span id='header-notifications-count' role='status'>{unreadDescription}</span><button id='header-notifications-read-all' type='button' disabled={!page.canMarkRead || !page.unreadCount} onClick={() => void page.markAllRead().catch(() => undefined)}><Icon name='check-all' size={14} />{page.busy ? `Saving` : `Mark All Read`}</button><button id='header-notifications-reload' type='button' onClick={page.reload} aria-label='Reload Notifications' title='Reload Notifications'><Icon name='refresh' size={14} /></button></div>
      {page.message ? <p id='header-notifications-message' className={`notification-menu-message${page.state === `error` || page.state === `denied` ? ` is-error` : ``}`} role={page.state === `error` || page.state === `denied` ? `alert` : `status`}>{page.message}</p> : null}
      <div id='header-notifications-list' className='notification-menu-list' aria-busy={page.state === `loading'}>
        {page.state === `loading` && !page.records.length ? <div id='header-notifications-loading' className='notification-menu-empty' role='status'><Icon name='bell' size={25} /><p>Loading Notifications…</p></div> : page.records.length ? page.records.map((record) => <NotificationCard key={record.id} record={record} idPrefix='notification-menu-card' onNavigate={() => close(false)} />) : <div id='header-notifications-empty' className='notification-menu-empty' role='status'><Icon name='bell' size={25} /><strong>{page.state === `ready` ? `You’re All Caught Up` : `Notifications Unavailable`}</strong><p>{page.state === `ready` ? `New updates will appear here.` : `Reload to reconnect.`}</p></div>}
      </div>
      {page.readError ? <p id='header-notifications-read-error' className='notification-menu-message is-error' role='alert'>{page.readError}</p> : null}
      {page.actionError ? <p id='header-notifications-action-error' className='notification-menu-message is-error' role='alert'>{page.actionError}</p> : null}
      <footer id='header-notifications-footer' className='notification-menu-footer'><p id='header-notifications-coverage'>{page.coverage}</p><p id='header-notifications-read-scope'>{page.readScopeLabel}</p><AppLink id='header-notifications-view-all' href='/notifications' onClick={() => close(false)}>View All Notifications<Icon name='arrow-right' size={15} /></AppLink></footer>
    </section>, document.body) : null}
  </div>;
};

export default NotificationMenu;
