import './styles.scss';
import Icon from '../Icon';
import Skeleton from '../Skeleton';
import AccountLayout from '../AccountLayout';
import { useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { formatPlanAmount, planIntervalLabel } from '../../shared/plans/values';
import { formatPlanDate, useOwnerPlans, type OwnerPlansPage } from './useOwnerPlans';

const PlanEditor = ({ page }: { page: OwnerPlansPage }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  useFocusEffect(useCallback(() => {
    const element = dialog.current;
    if (!element) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = `hidden`;
    element.showModal();
    element.querySelector<HTMLInputElement>(`input`)?.focus();
    return () => {
      element.close();
      document.documentElement.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []));
  const editor = page.editor;
  if (!editor) return null;
  const { draft, record } = editor;
  return <dialog
    ref={dialog}
    id='owner-plan-editor'
    className='owner-plan-editor'
    aria-labelledby='owner-plan-editor-title'
    aria-describedby='owner-plan-editor-note'
    onCancel={(event) => { event.preventDefault(); if (!page.mutating) page.closeEditor(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !page.mutating) page.closeEditor(); }}
  >
    <form id='owner-plan-editor-form' className='owner-plan-form' onSubmit={(event) => { event.preventDefault(); void page.save(); }}>
      <div id='owner-plan-editor-heading' className='owner-plans-heading'><h2 id='owner-plan-editor-title'>{record ? `Edit Plan` : `Add Plan`}</h2><button type='button' className='owner-plan-icon-button' id='owner-plan-editor-close' aria-label='Close Plan Editor' disabled={page.mutating} onClick={page.closeEditor}><Icon name='close' size={18} /></button></div>
      <fieldset disabled={page.mutating} id='owner-plan-editor-fields' className='owner-plan-fields'>
        <legend className='sr-only'>{`Plan Details`}</legend>
        <label htmlFor='owner-plan-name' className='owner-plan-field'><span>{`Name *`}</span><input required id='owner-plan-name' value={draft.name} maxLength={80} onChange={(event) => page.setDraftField(`name`, event.currentTarget.value)} /></label>
        <label htmlFor='owner-plan-slug' className='owner-plan-field'><span>{`Permanent Slug *`}</span><input required id='owner-plan-slug' value={draft.slug} readOnly={Boolean(record)} maxLength={80} pattern='[a-z0-9]+(-[a-z0-9]+)*' autoCapitalize='none' placeholder='starter' onChange={(event) => page.setDraftField(`slug`, event.currentTarget.value)} /><small>{record ? `The Saved Slug Cannot Be Changed` : `Lowercase Letters, Numbers And Hyphens`}</small></label>
        <label htmlFor='owner-plan-description' className='owner-plan-field is-wide'><span>{`Description *`}</span><textarea required id='owner-plan-description' value={draft.description} rows={3} maxLength={600} onChange={(event) => page.setDraftField(`description`, event.currentTarget.value)} /></label>
        <label htmlFor='owner-plan-price' className='owner-plan-field'><span>{`Price In USD *`}</span><input required id='owner-plan-price' value={editor.price} maxLength={16} inputMode='decimal' placeholder='1.00' pattern='[0-9]+(\.[0-9]{1,2})?' onChange={(event) => page.setEditorText(`price`, event.currentTarget.value)} /><small>{`0.00 Is Free · Up To Two Decimal Places`}</small></label>
        <label htmlFor='owner-plan-interval' className='owner-plan-field'><span>{`Billing Interval`}</span><select id='owner-plan-interval' value={draft.interval} onChange={(event) => page.setDraftField(`interval`, event.currentTarget.value === `year` ? `year` : event.currentTarget.value === `one-time` ? `one-time` : `month`)}><option value='month'>{`Monthly`}</option><option value='year'>{`Yearly`}</option><option value='one-time'>{`One-Time`}</option></select></label>
        <label htmlFor='owner-plan-order' className='owner-plan-field'><span>{`Display Order *`}</span><input required id='owner-plan-order' value={editor.order} maxLength={5} inputMode='numeric' pattern='[0-9]+' onChange={(event) => page.setEditorText(`order`, event.currentTarget.value)} /><small>{`0–10000 · Lower Numbers Appear First`}</small></label>
        <label htmlFor='owner-plan-status' className='owner-plan-field'><span>{`Visibility`}</span><select id='owner-plan-status' value={draft.active ? `active` : `inactive`} onChange={(event) => page.setDraftField(`active`, event.currentTarget.value === `active`)}><option value='inactive'>{`Hidden`}</option><option value='active'>{`Published`}</option></select></label>
        <label htmlFor='owner-plan-features' className='owner-plan-field is-wide'><span>{`Features`}</span><textarea id='owner-plan-features' value={editor.features} rows={6} maxLength={2575} onChange={(event) => page.setEditorText(`features`, event.currentTarget.value)} /><small>{`One Per Line · Up To 16 Features, 160 Characters Each`}</small></label>
        <label htmlFor='owner-plan-highlighted' className='owner-plan-checkbox'><input type='checkbox' id='owner-plan-highlighted' checked={draft.highlighted} onChange={(event) => page.setDraftField(`highlighted`, event.currentTarget.checked)} /><Icon name='spark' size={15} /><span>{`Highlight This Plan`}</span></label>
        <label htmlFor='owner-plan-removes-ads' className='owner-plan-checkbox'><input type='checkbox' id='owner-plan-removes-ads' checked={draft.removesAds} onChange={(event) => page.setDraftField(`removesAds`, event.currentTarget.checked)} /><Icon name='shield' size={15} /><span>{`Offer Ad-Free Reading`}</span></label>
      </fieldset>
      <p id='owner-plan-editor-note' className='owner-plans-copy'>{`Published plans appear on the landing page and Pricing. Ad-free reading describes the offer; saving a plan does not start billing or change anyone’s access. Payments are not connected.`}</p>
      {page.error ? <p id='owner-plan-editor-error' className='owner-plans-error' role='alert'>{page.error}</p> : null}
      <div id='owner-plan-editor-actions' className='owner-plans-actions'><button type='button' className='owner-plans-button' id='owner-plan-editor-cancel' disabled={page.mutating} onClick={page.closeEditor}><Icon name='close' size={14} />{`Cancel`}</button><button type='submit' className='owner-plans-button is-primary' id='owner-plan-editor-save' disabled={page.mutating} aria-busy={page.mutating}><Icon name='save' size={14} />{page.mutating ? `Saving` : `Save Plan`}</button></div>
    </form>
  </dialog>;
};

const OwnerPlans = () => {
  const page = useOwnerPlans();
  return <AccountLayout section='admin' title='Plans' eyebrow='Admin · Plans'>
    {page.loading ? <p id='owner-plans-loading-status' className='sr-only' role='status'>{`Loading Plans`}</p> : null}
    <section id='owner-plans' className='owner-plans' aria-labelledby='owner-plans-title' aria-busy={page.busy}>
      <div id='owner-plans-heading' className='owner-plans-heading'><div><h2 id='owner-plans-title'><Icon name='book' size={20} />{`Plan Catalog`}</h2><p id='owner-plans-coverage' className='owner-plans-copy'>{`Manage Up To ${page.limit} Plans · Search And Filters Cover The Loaded Catalog`}</p></div><dl id='owner-plans-summary' className='owner-plans-summary'>{[{ id: `total`, label: `Plans`, value: page.plans.length }, { id: `active`, label: `Published`, value: page.activeCount }, { id: `inactive`, label: `Hidden`, value: page.plans.length - page.activeCount }].map((item) => <div key={item.id} id={`owner-plans-summary-${item.id}`}><dt>{item.label}</dt><dd>{page.loading ? <Skeleton id={`owner-plans-summary-${item.id}-skeleton`} width={34} height={26} /> : page.ready ? item.value : `—`}</dd></div>)}</dl></div>
      <p id='owner-plans-billing-note' className='owner-plans-copy'>{`These offers describe your public pricing. Payments and account upgrades are not connected yet.`}</p>
      {page.error && !page.editor ? <p id='owner-plans-error' className='owner-plans-error' role='alert'>{page.error}</p> : null}
      {page.notice ? <p id='owner-plans-notice' className='owner-plans-notice' role='status'><Icon name='check' size={14} />{page.notice}</p> : null}
      <div id='owner-plans-filters' className='owner-plans-filters'>
        <label htmlFor='owner-plans-search' className='owner-plans-search'><Icon name='search' size={15} /><input id='owner-plans-search' type='search' value={page.search} disabled={page.loading} placeholder='Search Plans' aria-label='Search The Loaded Plan Catalog' onChange={(event) => page.setSearch(event.currentTarget.value)} /></label>
        <label htmlFor='owner-plans-filter' className='owner-plans-filter'><span>{`Visibility`}</span><select id='owner-plans-filter' value={page.filter} disabled={page.loading} onChange={(event) => page.setFilter(event.currentTarget.value === `active` ? `active` : event.currentTarget.value === `inactive` ? `inactive` : `all`)}><option value='all'>{`All Plans`}</option><option value='active'>{`Published`}</option><option value='inactive'>{`Hidden`}</option></select></label>
        <div className='owner-plans-actions'><button type='button' id='owner-plans-reload' className='owner-plans-button' disabled={page.mutating} onClick={page.reload}><Icon name='refresh' size={14} />{`Reload`}</button><button type='button' id='owner-plans-add' className='owner-plans-button is-primary' disabled={!page.ready || page.busy || page.plans.length >= page.limit} onClick={() => page.edit()}><Icon name='plus' size={14} />{`Add Plan`}</button></div>
      </div>
      <div id='owner-plans-table-region' className='owner-plans-table' role='region' aria-label='Plan Catalog Table' tabIndex={0}><table id='owner-plans-table'><caption className='sr-only'>{`Published And Hidden Plans In The Loaded Catalog`}</caption><thead><tr>{[`No.`, `Plan`, `Price`, `Order`, `Visibility`, `Updated`, `Actions`].map((label, index) => <th key={label} id={`owner-plans-column-${index}`} scope='col'>{label}</th>)}</tr></thead><tbody>
        {page.loading ? [0, 1].map((index) => <tr key={index} id={`owner-plans-skeleton-row-${index}`} className='owner-plans-skeleton-row' aria-hidden='true'><td><Skeleton id={`owner-plans-skeleton-number-${index}`} width={24} height={18} /></td><td><div className='owner-plans-skeleton-copy'><Skeleton id={`owner-plans-skeleton-title-${index}`} width='65%' height={14} /><Skeleton id={`owner-plans-skeleton-slug-${index}`} width='42%' height={10} /><Skeleton id={`owner-plans-skeleton-description-${index}`} width='100%' height={11} /></div></td><td><Skeleton id={`owner-plans-skeleton-price-${index}`} width={55} height={18} /></td><td><Skeleton id={`owner-plans-skeleton-order-${index}`} width={24} height={16} /></td><td><Skeleton id={`owner-plans-skeleton-status-${index}`} width={76} height={30} shape='block' /></td><td><Skeleton id={`owner-plans-skeleton-updated-${index}`} width={76} height={12} /></td><td><div className='actionsCell'><Skeleton id={`owner-plans-skeleton-edit-${index}`} width={32} height={32} shape='block' /><Skeleton id={`owner-plans-skeleton-archive-${index}`} width={32} height={32} shape='block' /></div></td></tr>) : page.ready && page.matchingPlans.length ? page.matchingPlans.map((plan) => { const rowId = `owner-plan-${plan.id}`; const saving = page.mutating && page.pendingRow === plan.id; return <tr key={plan.id} id={rowId} aria-busy={saving}>
          <td id={`${rowId}-number`}><span className='owner-plan-number'>{plan.number}</span></td>
          <td id={`${rowId}-identity`}><div className='owner-plan-copy'><strong id={`${rowId}-name`}>{plan.name}{plan.highlighted ? <span className='owner-plan-highlight' title='Highlighted Plan' aria-label='Highlighted Plan'><Icon name='spark' size={13} /></span> : null}</strong><span id={`${rowId}-slug`}>{plan.slug}</span><p id={`${rowId}-description`}>{plan.description}</p><span id={`${rowId}-features`}>{`${plan.features.length} Feature(s) · ${plan.removesAds ? `Ad-Free Offer` : `Ad-Supported Offer`}`}</span></div></td>
          <td id={`${rowId}-price`} className='owner-plan-price'><strong>{formatPlanAmount(plan)}</strong><span>{planIntervalLabel(plan)}</span></td><td id={`${rowId}-order`}>{plan.displayOrder}</td>
          <td id={`${rowId}-status-cell`}><div className='actionsCell'><button type='button' disabled={page.busy} id={`${rowId}-status`} className={`rowStatus ${plan.active ? `is-active` : `is-inactive`}`} aria-pressed={plan.active} aria-busy={saving} aria-label={`${plan.active ? `Hide` : `Publish`} ${plan.name}`} onClick={() => void page.changeStatus(plan)}><span className='statusDotWrap' aria-hidden='true'><span className='statusDot' /></span><span className='statusText'>{saving ? `Saving` : plan.active ? `Published` : `Hidden`}</span></button></div></td><td id={`${rowId}-updated`}><time dateTime={plan.updatedAt}>{formatPlanDate(plan.updatedAt)}</time></td>
          <td id={`${rowId}-actions-cell`}><div className='actionsCell'><button type='button' disabled={page.busy} id={`${rowId}-edit`} className='owner-plan-icon-button' title={`Edit ${plan.name}`} aria-label={`Edit ${plan.name}`} onClick={() => page.edit(plan)}><Icon name='settings' size={15} /></button><button type='button' disabled={page.busy} id={`${rowId}-archive`} className='owner-plan-icon-button is-danger' title={`Archive ${plan.name}`} aria-label={`Archive ${plan.name}`} aria-expanded={page.archivingId === plan.id} aria-controls={page.archivingId === plan.id ? `${rowId}-confirmation` : undefined} onClick={() => page.requestArchive(plan)}><Icon name='archive' size={15} /></button></div>
            {page.archivingId === plan.id ? <div id={`${rowId}-confirmation`} className='owner-plan-confirmation' role='group' aria-labelledby={`${rowId}-archive-title`}><p id={`${rowId}-archive-title`}>{`Archive “${plan.name}”?`}</p><p id={`${rowId}-archive-description`}>{`This hides the plan from public pricing and retains its catalog identity. Existing subscriptions and account access are unchanged. You can publish it again.`}</p><div className='owner-plans-actions'><button type='button' disabled={page.busy} className='owner-plans-button is-danger' id={`${rowId}-confirm-archive`} onClick={() => void page.archive(plan)}><Icon name='archive' size={13} />{saving ? `Archiving` : `Archive`}</button><button type='button' disabled={page.busy} className='owner-plans-button' id={`${rowId}-cancel-archive`} onClick={page.cancelArchive}><Icon name='close' size={13} />{`Cancel`}</button></div></div> : null}
          </td>
        </tr>; }) : <tr id='owner-plans-empty-row'><td colSpan={7} id='owner-plans-empty'>{!page.ready ? page.snapshot?.message ?? `Plans Unavailable` : page.plans.length ? `No Plans Match These Filters` : `No Plans Saved Yet`}</td></tr>}
      </tbody></table></div>
      <p id='owner-plans-results' className='owner-plans-copy' role='status'>{page.ready ? `${page.matchingPlans.length} Matching Plan(s) · ${page.plans.length} Plan(s) In The Catalog` : `Catalog Counts Unavailable`}</p>
    </section>
    {page.editor && page.permitted ? <PlanEditor key={page.editor.record?.id ?? `new`} page={page} /> : null}
  </AccountLayout>;
};

export default OwnerPlans;
