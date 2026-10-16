import './styles.scss';
import Icon from '../Icon';
import AppLink from '../AppLink';
import { useNotificationCard, type NotificationCardProps } from './useNotificationCard';
import { getNotificationCopy, getNotificationHref, getNotificationIcon } from './values';

const NotificationCard = ({ record, onNavigate, idPrefix = `notification-card` }: NotificationCardProps) => {
  const card = useNotificationCard(record, onNavigate);
  const cardId = `${idPrefix}-${record.id}`;
  return <AppLink
    id={cardId}
    onClick={card.open}
    href={getNotificationHref(record)}
    aria-labelledby={`${cardId}-title`}
    aria-describedby={`${cardId}-body ${cardId}-read-status`}
    className={`notification-card${card.isRead ? ` is-read` : ``}`}
  >
    <span id={`${cardId}-icon`} className='notification-card-icon' aria-hidden='true'><Icon name={getNotificationIcon(record)} size={19} /></span>
    <div id={`${cardId}-copy`} className='notification-card-copy'>
      <h3 id={`${cardId}-title`} className='notification-card-title'>{record.title}{card.known && !card.isRead ? <span id={`${cardId}-unread-dot`} className='notification-card-unread-dot' aria-hidden='true' /> : null}</h3>
      <p id={`${cardId}-body`} className='notification-card-body'>{getNotificationCopy(record)}</p>
      <span id={`${cardId}-read-status`} className='sr-only'>{!card.known ? `Read Status Unavailable` : card.isRead ? `Read` : `Unread`}</span>
    </div>
    <Icon name='external' size={15} className='notification-card-arrow' />
  </AppLink>;
};

export default NotificationCard;
