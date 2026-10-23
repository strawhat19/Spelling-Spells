import './styles.scss';
import Icon from '../Icon';
import AppLink from '../AppLink';
import AccountLayout from '../AccountLayout';
import { useBillingReturn } from './useBillingReturn';
import AccountGate from '../AccountLayout/AccountGate';

const BillingReturn = () => {
  const page = useBillingReturn();
  return <AccountLayout title={page.title} description={`Confirm your private subscription status`}>
    {!page.allowed ? <AccountGate returnTo={page.returnTo} /> : <section id={`billing-return`} className={`billing-return`} aria-live={`polite`}>
      <Icon name={page.result?.state === `confirmed` ? `check` : `shield`} size={26} />
      <p id={`billing-return-message`}>{page.copy}</p>
      <p id={`billing-return-plan`}>Current Plan: <strong>{page.billing.planLabel}</strong></p>
      {page.billing.error && <p id={`billing-return-error`} role={`status`}>{page.billing.error}</p>}
      <div id={`billing-return-actions`} className={`billing-return-actions`}>
        {page.result?.state !== `confirmed` && <button type={`button`} id={`billing-return-refresh`} disabled={Boolean(page.billing.busy)} onClick={page.refresh}><Icon name={`refresh`} size={16} />{page.billing.busy === `reconcile` ? `Checking…` : `Refresh Confirmation`}</button>}
        {page.billing.portalAvailable && <button type={`button`} id={`billing-return-manage`} disabled={Boolean(page.billing.busy)} onClick={() => void page.billing.openPortal()}><Icon name={`plans`} size={16} />Manage Billing</button>}
        <AppLink id={`billing-return-profile`} href={`/profile`}><Icon name={`user`} size={16} />Your Profile</AppLink>
        {page.billing.entitlement.state === `paid` && <AppLink id={`billing-return-grimoire`} href={`/grimoire`}><Icon name={`book`} size={16} />Open Your Grimoire</AppLink>}
      </div>
    </section>}
  </AccountLayout>;
};

export default BillingReturn;
