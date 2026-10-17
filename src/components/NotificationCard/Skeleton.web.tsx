import './styles.scss';
import Skeleton from '../Skeleton';

const NotificationCardSkeleton = ({ id }: { id: string }) => <div id={id} className='notification-card notification-card-skeleton' aria-hidden='true'>
  <Skeleton id={`${id}-icon`} shape='circle' width={36} height={36} />
  <div id={`${id}-copy`} className='notification-card-copy'>
    <Skeleton id={`${id}-title`} width='65%' height={22} />
    <Skeleton id={`${id}-body-first`} height={11} />
    <Skeleton id={`${id}-body-second`} width='78%' height={11} />
  </div>
  <Skeleton id={`${id}-arrow`} width={12} height={12} />
</div>;

export default NotificationCardSkeleton;
