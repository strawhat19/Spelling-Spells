import './styles.scss';
import Icon from '../Icon';
import Skeleton from '../Skeleton';
import TextReveal from '../TextReveal';
import PageMetadata from '../PageMetadata';
import NotificationCard from '../NotificationCard';
import { useNotificationsPage } from './useNotificationsPage';
import NotificationCardSkeleton from '../NotificationCard/Skeleton.web';

const NotificationsPage = () => {
  const page = useNotificationsPage();
  const loading = page.state === `loading`;
  const countLoading = loading || (page.state === `ready` && page.readState === `loading`);
  return <section id='notifications-page' className='notifications-page' aria-labelledby='notifications-page-title'>
    <PageMetadata noIndex title='Notifications' canonicalPath='/notifications' description='The latest notes and announcements from Spelling Spells.' />
    <header id='notifications-page-heading' className='notifications-page-heading'>
      <div id='notifications-page-heading-copy' className='notifications-page-heading-copy'><span id='notifications-page-eyebrow' className='notifications-page-eyebrow'><Icon name='bell' size={15} />From the Archive</span><h1 id='notifications-page-title'><TextReveal id='notifications-page-title-start' text='Stay in' />{` `}<em><TextReveal id='notifications-page-title-end' text='the know.' delay={.04} /></em></h1><p id='notifications-page-description'>The latest notes and announcements from Spelling Spells, all in one place.</p></div>
      <span id='notifications-page-emblem' className='notifications-page-emblem' aria-hidden='true'><Icon name='bell' size={48} /></span>
    </header>
    <div id='notifications-page-updates' className='notifications-page-updates'>
      <div id='notifications-page-toolbar' className='notifications-page-toolbar'>
        <div id='notifications-page-counts' className='notifications-page-counts'><h2 id='notifications-page-list-title'><TextReveal id='notifications-page-list-title-text' text='Notifications' /></h2><p id='notifications-page-count' role={loading ? undefined : `status`}>{countLoading ? <><Skeleton id='notifications-page-count-skeleton' width={190} height={11} />{!loading ? <span className='sr-only'>Loading Read Status</span> : null}</> : page.state !== `ready` ? `Notifications Unavailable` : `${page.records.length} Notification(s) · ${page.unreadLabel} Unread`}</p></div>
        <div id='notifications-page-actions' className='notifications-page-actions'><button id='notifications-page-reload' type='button' onClick={page.reload}><Icon name='refresh' size={15} />Reload</button><button id='notifications-page-read-all' type='button' disabled={!page.canMarkRead || !page.unreadCount} onClick={() => void page.markAllRead().catch(() => undefined)}><Icon name='check-all' size={15} />{page.busy ? `Saving Read Status` : `Mark All Read`}</button></div>
      </div>
      {page.message ? <p id='notifications-page-message' className={`notifications-page-message${page.state === `error` || page.state === `denied` ? ` is-error` : ``}`} role={page.state === `error` || page.state === `denied` ? `alert` : `status`}>{page.message}</p> : null}
      {loading ? <span id='notifications-page-loading-label' className='sr-only' role='status'>Loading Notifications</span> : null}
      <div id='notifications-page-list' className='notifications-page-list' aria-labelledby='notifications-page-list-title' aria-busy={loading}>
        {loading && !page.records.length ? <div id='notifications-page-loading' className='notifications-page-loading'>{[0, 1, 2].map((index) => <NotificationCardSkeleton key={index} id={`notifications-page-skeleton-${index}`} />)}</div> : page.records.length ? page.records.map((record) => <NotificationCard record={record} key={record.id} idPrefix='notifications-page-card' />) : page.state === `ready` ? <div id='notifications-page-empty' className='notifications-page-empty' role='status'><Icon name='bell' size={30} /><h3 id='notifications-page-empty-title'>You’re All Caught Up</h3><p id='notifications-page-empty-description'>New updates will appear here.</p></div> : <div id='notifications-page-unavailable' className='notifications-page-empty'><Icon name='bell' size={30} /><h3 id='notifications-page-unavailable-title'>Notifications Unavailable</h3><p id='notifications-page-unavailable-description'>Reload to reconnect to the archive’s announcements.</p></div>}
      </div>
      {page.readError ? <p id='notifications-page-read-error' className='notifications-page-message is-error' role='alert'>{page.readError}</p> : null}
      {page.actionError ? <p id='notifications-page-action-error' className='notifications-page-message is-error' role='alert'>{page.actionError}</p> : null}
      <footer id='notifications-page-footer' className='notifications-page-footer'><p id='notifications-page-coverage'>{page.coverage}</p><p id='notifications-page-read-scope'>{page.readScopeLabel}</p><span id='notifications-page-live-status'>{page.realtime === `subscribed` && page.state === `ready` ? `Live Announcements` : page.realtime === `connecting` ? `Connecting to Announcements` : `Live Updates Unavailable`}</span></footer>
    </div>
  </section>;
};

export default NotificationsPage;
