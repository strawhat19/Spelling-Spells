import '../SpellCard/styles.scss';
import './styles.scss';
import Skeleton from '../Skeleton';

const FeaturedSkeleton = () => <>
  <span id='home-featured-loading-status' className='ss-visually-hidden' role='status'>Loading Featured Spell</span>
  <div id='home-featured-skeleton' className='spell-card spell-card--featured ss-home-featured-skeleton' aria-busy='true' aria-hidden='true'>
    <div id='home-featured-skeleton-topline' className='spell-card-topline'>
      <Skeleton width='45%' height={10} />
      <Skeleton shape='circle' width={40} height={40} />
    </div>
    <div id='home-featured-skeleton-origin' className='spell-card-origin'><Skeleton width='62%' height={11} /></div>
    <div id='home-featured-skeleton-title' className='spell-card-title'><Skeleton width='70%' height={57} /></div>
    <div id='home-featured-skeleton-pronunciation' className='spell-card-pronunciation'><Skeleton width='43%' height={12} /></div>
    <div id='home-featured-skeleton-definition' className='spell-card-definition ss-home-skeleton-lines'>
      <Skeleton height={13} /><Skeleton width='88%' height={13} />
    </div>
    <div id='home-featured-skeleton-spelling' className='spell-card-spelling'>
      <div className='spell-card-field-label'><Skeleton width={140} height={10} /></div>
      <div id='home-featured-skeleton-letters' className='spell-card-letters'>
        {[0, 1, 2, 3, 4].map((index) => <Skeleton key={index} id={`home-featured-skeleton-letter-${index}`} shape='block' width={34} height={34} />)}
      </div>
      <div id='home-featured-skeleton-roots' className='spell-card-root ss-home-skeleton-lines'>
        <Skeleton width='54%' height={11} /><Skeleton height={11} /><Skeleton width='80%' height={11} />
      </div>
    </div>
    <div id='home-featured-skeleton-ratings' className='spell-card-ratings'>
      {[0, 1, 2].map((index) => <div key={index} id={`home-featured-skeleton-rating-${index}`} className='ss-home-skeleton-lines'>
        <Skeleton width='70%' height={10} /><Skeleton width='45%' height={11} /><Skeleton height={3} />
      </div>)}
    </div>
    <div id='home-featured-skeleton-editorial' className='spell-card-editorial'><Skeleton width='74%' height={10} /></div>
    <div id='home-featured-skeleton-open' className='spell-card-open'><Skeleton width={150} height={12} /></div>
  </div>
</>;

export default FeaturedSkeleton;
