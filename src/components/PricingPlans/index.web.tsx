import './styles.scss';
import Icon from '../Icon';
import AppLink from '../AppLink';
import { pricingCopy } from './content';
import type { PricingPlansProps } from './types';
import { usePricingPlans } from './usePricingPlans';
import { useFeatureFlags } from '../../shared/featureFlags/useFeatureFlags';
import { formatPlanAmount, planIntervalLabel } from '../../shared/plans/values';

const PricingPlans = (props: PricingPlansProps) => {
  const { grimoireToolsEnabled } = useFeatureFlags();
  const { plans, error, billing, variant, loading, idPrefix, signedIn, unavailable, reloadPlans, accountLoading } = usePricingPlans(props);
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
            const starter = plan.slug === `starter`;
            const planId = `${idPrefix}-${plan.id}`;
            const offer = billing.offers.find((offer) => offer.slug === plan.slug && offer.revision === plan.revision);
            const paid = billing.entitlement.state === `paid`;
            const billingPending = billing.status === `loading` || Boolean(billing.busy) || billing.entitlement.state === `pending`;
            const available = plan.interval !== `one-time` && billing.checkoutAvailable && offer?.available && billing.entitlement.state === `free`;
            return (
              <article key={plan.id} id={planId} className={`ss-pricing-card${plan.highlighted ? ` ss-pricing-card--highlighted` : ``}`} aria-labelledby={`${planId}-name`}>
                <div id={`${planId}-topline`} className={`ss-pricing-card-topline`}><span id={`${planId}-edition`} className={`ss-pricing-edition`}>{free ? `For the curious` : `For the devoted`}</span>{plan.highlighted && <span id={`${planId}-highlight`} className={`ss-pricing-highlight`}><Icon name={`spark`} size={11} />Featured Plan</span>}</div>
                <h3 id={`${planId}-name`} className={`ss-pricing-name`}>{plan.name}</h3>
                <p id={`${planId}-description`} className={`ss-pricing-description`}>{plan.description}</p>
                <p id={`${planId}-price`} className={`ss-pricing-price`}><span id={`${planId}-amount`} className={`ss-pricing-amount`}>{formatPlanAmount(plan)}</span><span id={`${planId}-interval`} className={`ss-pricing-interval`}>{planIntervalLabel(plan)}</span></p>
                <ul id={`${planId}-features`} className={`ss-pricing-features`}>{plan.features.map((feature, index) => <li key={index} id={`${planId}-feature-${index}`} className={`ss-pricing-feature`}><Icon name={`check`} size={16} /><span id={`${planId}-feature-${index}-copy`} className={`ss-pricing-feature-copy`}>{feature}</span></li>)}</ul>
                <div id={`${planId}-action-area`} className={`ss-pricing-action-area`}>
                  {free ? accountLoading ? (
                    <button disabled type={`button`} id={`${planId}-account-loading`} className={`ss-pricing-action`} aria-busy><Icon name={`user`} size={16} />Loading Account…</button>
                  ) : (
                    <AppLink id={`${planId}-${signedIn ? `browse` : `signup`}`} className={`ss-pricing-action`} href={signedIn ? `/spells` : `/signup`}><Icon name={signedIn ? `book` : `user`} size={16} />{signedIn ? `Browse Library` : `Sign Up Free`}<Icon name={`arrow`} size={16} /></AppLink>
                  ) : accountLoading ? (
                    <button disabled type={`button`} id={`${planId}-account-loading`} className={`ss-pricing-action`} aria-busy><Icon name={`user`} size={16} />Loading Account…</button>
                  ) : !signedIn ? (
                    <AppLink id={`${planId}-signin`} className={`ss-pricing-action`} href={`/signin?returnTo=%2Fpricing`}><Icon name={`user`} size={16} />Sign In To Subscribe<Icon name={`arrow`} size={16} /></AppLink>
                  ) : paid ? (
                    <button type={`button`} id={`${planId}-manage-billing`} className={`ss-pricing-action`} disabled={billingPending || !billing.portalAvailable} onClick={() => void billing.openPortal()}><Icon name={`plans`} size={16} />{billing.busy === `portal` ? `Opening Billing…` : `Manage Subscription`}</button>
                  ) : (
                    <button type={`button`} id={`${planId}-subscribe`} className={`ss-pricing-action${!available ? ` ss-pricing-action--unavailable` : ``}`} disabled={billingPending || !available} aria-busy={billing.busy === `checkout`} aria-describedby={`${planId}-availability`} onClick={() => void billing.checkout(plan)}><Icon name={`spark`} size={16} />{billing.busy === `checkout` ? `Opening Checkout…` : billing.entitlement.state === `pending` ? `Confirmation Pending` : billing.status === `loading` ? `Loading Plan…` : available ? `Subscribe To ${plan.name}` : `Billing Unavailable`}</button>
                  )}
                  {free && !accountLoading && !signedIn && <AppLink id={`${planId}-signin`} className={`ss-pricing-secondary-link`} href={`/signin`}><Icon name={`user`} size={13} />Already Have An Account? Sign In</AppLink>}
                  {starter && signedIn && grimoireToolsEnabled && <AppLink id={`${planId}-tools`} className={`ss-pricing-secondary-link`} href={`/grimoire`}><Icon name={`book`} size={14} />Your Grimoire Tools<Icon name={`arrow`} size={14} /></AppLink>}
                  <p id={`${planId}-availability`} className={`ss-pricing-card-note`}>{free ? signedIn ? `A little curiosity is all you need.` : `The public library stays free to browse.` : plan.interval === `one-time` ? `This offer is not available for subscription checkout.` : signedIn && !paid && !available ? offer?.message || billing.message || `Billing must be connected before this plan can be purchased.` : `Renews ${plan.interval === `year` ? `yearly` : `monthly`} until cancelled. Manage cancellation in billing.`}</p>
                  {!free && <p id={`${planId}-terms`} className={`ss-pricing-card-note`}><AppLink id={`${planId}-terms-link`} href={`/terms`}>Terms</AppLink>{` · `}<AppLink id={`${planId}-privacy-link`} href={`/privacy`}>Privacy</AppLink></p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {billing.error && signedIn && <div id={`${idPrefix}-billing-error`} className={`ss-pricing-state`} role={`status`}><p className={`ss-pricing-state-copy`}>{billing.error}</p><button type={`button`} id={`${idPrefix}-billing-retry`} className={`ss-pricing-text-link`} disabled={Boolean(billing.busy)} onClick={() => void billing.refresh()}><Icon name={`refresh`} size={15} />Refresh Billing</button></div>}
      <footer id={`${idPrefix}-footer`} className={`ss-pricing-footer`}><p id={`${idPrefix}-availability`} className={`ss-pricing-note`}>{pricingCopy.availability}<br />{pricingCopy.advertising}</p>{variant === `landing` && <AppLink id={`${idPrefix}-view-pricing`} className={`ss-pricing-text-link`} href={`/pricing`}>Explore Plans & Details<Icon name={`arrow`} size={16} /></AppLink>}</footer>
    </section>
  );
};

export default PricingPlans;
