import './styles.scss';
import Icon from '../Icon';
import AppLink from '../AppLink';
import Skeleton from '../Skeleton';
import TextReveal from '../TextReveal';
import PageMetadata from '../PageMetadata';
import { useNotificationDetails } from './useNotificationDetails';
import { getNotificationDate, getNotificationIcon, getNotificationSpacing, notificationKindLabels } from '../NotificationCard/values';

const NotificationDetailsSkeleton = () => <div id='notification-details-loading'>
  <div role='status'><h1 id='notification-details-title' className='sr-only'>Loading Notification</h1></div>
  <div id='notification-details-skeleton' className='notification-details-article' aria-busy='true' aria-hidden='true'>
    <Skeleton id='notification-details-skeleton-emblem' shape='circle' width={72} height={72} />
    <Skeleton id='notification-details-skeleton-eyebrow' width={185} height={9} />
    <Skeleton id='notification-details-skeleton-title' width='80%' height={44} />
    <div id='notification-details-skeleton-body' className='notification-details-skeleton-body'>
      <Skeleton id='notification-details-skeleton-body-first' height={14} />
      <Skeleton id='notification-details-skeleton-body-second' height={14} />
      <Skeleton id='notification-details-skeleton-body-last' width='72%' height={14} />
    </div>
    <div id='notification-details-skeleton-metadata' className='notification-details-metadata'>
      {[0, 1, 2, 3].map((index) => <div key={index} id={`notification-details-skeleton-meta-${index}`}><Skeleton width={65} height={10} /><Skeleton width={85} height={12} /></div>)}
    </div>
    <div id='notification-details-skeleton-actions' className='notification-details-actions'><Skeleton shape='block' width={80} height={38} /><Skeleton shape='block' width={115} height={38} /></div>
    <Skeleton id='notification-details-skeleton-read-scope' width={220} height={10} />
  </div>
</div>;

const NotificationDetails = () => {
  const page = useNotificationDetails();
  const record = page.record;
  return <section id='notification-details' className='notification-details' aria-labelledby='notification-details-title'>
    <PageMetadata title={record?.title ?? `Notification`} canonicalPath={page.slug ? `/notifications/${encodeURIComponent(page.slug)}` : `/notifications`} description={record?.body.slice(0, 160) ?? `A note from the Spelling Spells archive.`} />
    <AppLink id='notification-details-back' className='notification-details-back' href='/notifications'><Icon name='arrow-left' size={16} />All Notifications</AppLink>
    {record ? <article id={`notification-details-${record.id}`} className='notification-details-article'>
      <span id='notification-details-emblem' className='notification-details-emblem' aria-hidden='true'><Icon name={getNotificationIcon(record)} size={34} /></span>
      <span id='notification-details-eyebrow' className='notification-details-eyebrow'>A Note From Spelling Spells</span>
      <h1 id='notification-details-title'><TextReveal id={`notification-details-${record.id}-title-text`} text={record.title} /></h1>
      <p id='notification-details-body' className='notification-details-body'>{record.body}{record.linkUrl && record.linkLabel ? <>{getNotificationSpacing(record.body, record.linkLabel)}<AppLink id='notification-details-inline-link' className='notification-details-inline-link' href={record.linkUrl} target={record.linkUrl.startsWith(`/`) ? undefined : `_blank`} rel={record.linkUrl.startsWith(`/`) ? undefined : `noopener noreferrer`}>{record.linkLabel}{!record.linkUrl.startsWith(`/`) ? <Icon name='external' size={13} /> : null}</AppLink></> : null}{getNotificationSpacing(record.linkLabel ?? record.body, record.suffix)}{record.suffix}</p>
      <dl id='notification-details-metadata' className='notification-details-metadata'><div id='notification-details-number'><dt>Notification</dt><dd>{String(record.number).padStart(2, `0`)}</dd></div><div id='notification-details-kind'><dt>Type</dt><dd>{notificationKindLabels[record.kind]}</dd></div><div id='notification-details-created'><dt>Created</dt><dd><time dateTime={record.createdAt}>{getNotificationDate(record.createdAt)}</time></dd></div><div id='notification-details-read'><dt>Read Status</dt><dd role='status'>{page.readState === `loading` ? <><Skeleton id='notification-details-read-skeleton' width={45} height={12} /><span className='sr-only'>Loading Read Status</span></> : page.readLabel}</dd></div></dl>
      <div id='notification-details-actions' className='notification-details-actions'><button id='notification-details-reload' type='button' onClick={page.reloadDetails}><Icon name='refresh' size={14} />Reload</button>{!page.isRead ? <button id='notification-details-mark-read' type='button' disabled={page.readState !== `ready` || page.busy} onClick={() => void page.markRead([record.id]).catch(() => undefined)}><Icon name='check' size={14} />{page.busy ? `Saving Read Status` : `Mark as Read`}</button> : null}</div>
      {page.readError ? <p id='notification-details-read-error' className='notification-details-message is-error' role='alert'>{page.readError}</p> : null}
      {page.actionError ? <p id='notification-details-action-error' className='notification-details-message is-error' role='alert'>{page.actionError}</p> : null}
      <p id='notification-details-read-scope' className='notification-details-message'>{page.readScopeLabel}</p>
    </article> : page.detailState === `loading` ? <NotificationDetailsSkeleton /> : <div
      id='notification-details-state'
      className='notification-details-state'
      role={page.detailState === `error` ? `alert` : `status`}
    >
      <Icon name='bell' size={35} />
      <h1 id='notification-details-title'>{page.detailState === `error` ? `Unable to Load This Notification` : `Notification Unavailable`}</h1>
      <p id='notification-details-state-message'>{page.detailError ?? `This notification is not currently active. Browse the archive’s other updates.`}</p>
      <button id='notification-details-retry' type='button' onClick={page.reloadDetails}><Icon name='refresh' size={15} />Reload</button>
    </div>}
  </section>;
};

export default NotificationDetails;
