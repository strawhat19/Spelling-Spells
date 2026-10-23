import './styles.scss';
import Icon from '../Icon';
import AppLink from '../AppLink';
import { pricingCopy } from './content';
import type { PricingPlansProps } from './types';
import { usePricingPlans } from './usePricingPlans';
import { formatPlanAmount, planIntervalLabel } from '../../shared/plans/values';

const PricingPlans = (props: PricingPlansProps) => {
  const { plans, error, variant, loading, idPrefix, unavailable, reloadPlans } = usePricingPlans(props);
  const Title = variant === `page` ? `h1` : `h2`;
  return (
    <section id={`${idPrefix}-section`} className={`ss-pricing ss-pricing--${variant}`} aria-labelledby={`${idPrefix}-title`}>
      <header id={`${idPrefix}-heading`} className={`ss-pricing-heading`}>
        <p id={`${idPrefix}-eyebrow`} className={`ss-pricing-eyebrow`}><Icon name={`spark`} size={14} />A little support goes a long way</p>
        <Title id={`${idPrefix}-title`} className={`ss-pricing-title`}>{pricingCopy.title}</Title>
        <p id={`${idPrefix}-intro`} className={`ss-pricing-intro`}>{pricingCopy.intro}</p>
      </header>
      {loading ? (
        <div id={`${idPrefix}-loading`} className={`ss-pricing-state`} role={`status`}><Icon name={`book`} size={27} /><p id={`${idPrefix}-loading-title`} className={`ss-pricing-state-title`}>Opening the plans…</p><p id={`${idPrefix}-loading-copy`} className={`ss-pricing-state-copy`}>Gathering the latest pricing from the spellbook.</p></div>
      ) : unavailable ? (
        <div id={`${idPrefix}-unavailable`} className={`ss-pricing-state`} role={`status`}><Icon name={`info`} size={27} /><p id={`${idPrefix}-unavailable-title`} className={`ss-pricing-state-title`}>Pricing is unavailable</p><p id={`${idPrefix}-unavailable-copy`} className={`ss-pricing-state-copy`}>{error || `We couldn't load the published plans. Please try again.`}</p><button type={`button`} id={`${idPrefix}-retry`} className={`ss-pricing-text-link`} onClick={reloadPlans}><Icon name={`refresh`} size={15} />Try Again</button></div>
      ) : !plans.length ? (
        <div id={`${idPrefix}-empty`} className={`ss-pricing-state`} role={`status`}><Icon name={`book`} size={27} /><p id={`${idPrefix}-empty-title`} className={`ss-pricing-state-title`}>A new chapter is being written.</p><p id={`${idPrefix}-empty-copy`} className={`ss-pricing-state-copy`}>No plans are published right now. The library is still yours to explore.</p><AppLink id={`${idPrefix}-empty-browse`} className={`ss-pricing-text-link`} href={`/spells`}><Icon name={`book`} size={15} />Browse Library</AppLink></div>
      ) : (
        <div id={`${idPrefix}-cards`} className={`ss-pricing-grid`}>
          {plans.map((plan) => {
            const free = plan.priceCents === 0;
            const planId = `${idPrefix}-${plan.id}`;
            return (
              <article key={plan.id} id={planId} className={`ss-pricing-card${plan.highlighted ? ` ss-pricing-card--highlighted` : ``}`} aria-labelledby={`${planId}-name`}>
                <div id={`${planId}-topline`} className={`ss-pricing-card-topline`}><span id={`${planId}-edition`} className={`ss-pricing-edition`}>{free ? `For the curious` : `For the devoted`}</span>{plan.highlighted && <span id={`${planId}-highlight`} className={`ss-pricing-highlight`}><Icon name={`spark`} size={11} />Featured Plan</span>}</div>
                <h3 id={`${planId}-name`} className={`ss-pricing-name`}>{plan.name}</h3>
                <p id={`${planId}-description`} className={`ss-pricing-description`}>{plan.description}</p>
                <p id={`${planId}-price`} className={`ss-pricing-price`}><span id={`${planId}-amount`} className={`ss-pricing-amount`}>{formatPlanAmount(plan)}</span><span id={`${planId}-interval`} className={`ss-pricing-interval`}>{planIntervalLabel(plan)}</span></p>
                {(plan.removesAds || free) && <p id={`${planId}-reading`} className={`ss-pricing-reading`}><Icon name={plan.removesAds ? `spark` : `book`} size={16} />{plan.removesAds ? `Ad-free reading when subscriptions launch` : `Ad-supported reading planned`}</p>}
                <ul id={`${planId}-features`} className={`ss-pricing-features`}>{plan.features.map((feature, index) => <li key={index} id={`${planId}-feature-${index}`} className={`ss-pricing-feature`}><Icon name={`check`} size={16} /><span id={`${planId}-feature-${index}-copy`} className={`ss-pricing-feature-copy`}>{feature}</span></li>)}</ul>
                <div id={`${planId}-action-area`} className={`ss-pricing-action-area`}>
                  {free ? <AppLink id={`${planId}-browse`} className={`ss-pricing-action`} href={`/spells`}><Icon name={`book`} size={16} />Browse Library<Icon name={`arrow`} size={16} /></AppLink> : <button disabled type={`button`} id={`${planId}-coming-soon`} className={`ss-pricing-action ss-pricing-action--unavailable`} aria-describedby={`${planId}-availability`}><Icon name={`spark`} size={16} />Coming Soon</button>}
                  <p id={`${planId}-availability`} className={`ss-pricing-card-note`}>{free ? `A little curiosity is all you need.` : `Subscriptions are not available yet.`}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <footer id={`${idPrefix}-footer`} className={`ss-pricing-footer`}><p id={`${idPrefix}-availability`} className={`ss-pricing-note`}>{pricingCopy.availability}<br />{pricingCopy.advertising}</p>{variant === `landing` && <AppLink id={`${idPrefix}-view-pricing`} className={`ss-pricing-text-link`} href={`/pricing`}>Explore Plans & Details<Icon name={`arrow`} size={16} /></AppLink>}</footer>
    </section>
  );
};

export default PricingPlans;
