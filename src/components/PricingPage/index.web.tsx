import './styles.scss';
import Icon from '../Icon';
import AppLink from '../AppLink';
import PricingPlans from '../PricingPlans';
import PageMetadata from '../PageMetadata';
import { pricingQuestions } from '../PricingPlans/content';

const PricingPage = () => (
  <article id={`pricing-page`} className={`ss-pricing-page`}>
    <PageMetadata title={`Pricing`} canonicalPath={`/pricing`} description={`Explore Spelling Spells plans. Browse for free or preview device-local collections, notes, flashcards and grimoire export. Subscriptions are coming soon.`} />
    <PricingPlans variant={`page`} />
    <section id={`pricing-questions`} className={`ss-pricing-page-questions`} aria-labelledby={`pricing-questions-title`}>
      <div id={`pricing-questions-heading`} className={`ss-pricing-page-question-heading`}><p id={`pricing-questions-eyebrow`} className={`ss-pricing-page-eyebrow`}>A few things to know</p><h2 id={`pricing-questions-title`} className={`ss-pricing-page-question-title`}>The fine print,<br />without the mystery.</h2><AppLink id={`pricing-contact`} className={`ss-pricing-page-contact`} href={`/contact`}><Icon name={`mail`} size={16} />Ask a Question<Icon name={`arrow`} size={16} /></AppLink></div>
      <div id={`pricing-questions-list`} className={`ss-pricing-page-question-list`}>{pricingQuestions.map((item, index) => <section key={item.question} id={`pricing-question-${index}`} className={`ss-pricing-page-question`} aria-labelledby={`pricing-question-${index}-title`}><h3 id={`pricing-question-${index}-title`} className={`ss-pricing-page-question-name`}>{item.question}</h3><p id={`pricing-question-${index}-answer`} className={`ss-pricing-page-answer`}>{item.answer}</p></section>)}</div>
    </section>
  </article>
);

export default PricingPage;
