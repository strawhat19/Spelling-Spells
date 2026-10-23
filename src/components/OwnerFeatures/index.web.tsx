import './styles.scss';
import Icon from '../Icon';
import Skeleton from '../Skeleton';
import AccountLayout from '../AccountLayout';
import { useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import type { FeatureRole } from '../../shared/featureFlags/types';
import { featureRoles, managedFeatures, useOwnerFeatures, type OwnerFeaturesPage } from './useOwnerFeatures';

const FeatureEditor = ({ page }: { page: OwnerFeaturesPage }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  useFocusEffect(useCallback(() => {
    const element = dialog.current;
    if (!element) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = `hidden`;
    element.showModal();
    element.querySelector<HTMLTextAreaElement>(`textarea`)?.focus();
    return () => {
      element.close();
      document.documentElement.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []));
  const editor = page.editor;
  const feature = managedFeatures.find((item) => item.key === editor?.key);
  if (!editor || !feature) return null;
  const editorId = `owner-feature-${editor.key}-editor`;
  const draft = editor.draft;
  return <dialog
    ref={dialog}
    id={editorId}
    className='owner-feature-editor'
    aria-labelledby={`${editorId}-title`}
    aria-describedby={`${editorId}-audience-note`}
    onCancel={(event) => { event.preventDefault(); page.closeEditor(); }}
    onClick={(event) => { if (event.target === event.currentTarget) page.closeEditor(); }}
  >
    <form id={`${editorId}-form`} className='owner-feature-form' onSubmit={(event) => { event.preventDefault(); void page.save(); }}>
      <div id={`${editorId}-heading`} className='owner-feature-heading'><h2 id={`${editorId}-title`}><Icon name={feature.icon} size={23} />{feature.name}</h2><button type='button' id={`${editorId}-close`} className='owner-feature-icon-button' aria-label={`Close ${feature.name} Settings`} disabled={page.mutating} onClick={page.closeEditor}><Icon name='close' size={18} /></button></div>
      <fieldset id={`${editorId}-fields`} className='owner-feature-fields' disabled={page.mutating}>
        <legend className='sr-only'>{`${feature.name} Settings`}</legend>
        <label htmlFor={`${editorId}-description`} className='owner-feature-field'><span>{`Description`}</span><textarea required rows={3} maxLength={600} id={`${editorId}-description`} value={draft.description} onChange={(event) => page.setDraftField(`description`, event.currentTarget.value)} /></label>
        <label htmlFor={`${editorId}-minimum-role`} className='owner-feature-field'><span>{`Minimum Role`}</span><select id={`${editorId}-minimum-role`} value={draft.minimumRole} onChange={(event) => { const role = event.currentTarget.value as FeatureRole; if (featureRoles.includes(role)) page.setDraftField(`minimumRole`, role); }}>{featureRoles.map((role) => <option key={role} value={role}>{role}</option>)}</select><small>{`Guest → Member → Subscriber → Developer → Admin → Owner`}</small></label>
        <fieldset id={`${editorId}-roles`} className='owner-feature-roles'><legend>{`Allowed Roles`}</legend><div className='owner-feature-role-actions'><button type='button' id={`${editorId}-roles-all`} className='owner-feature-text-button' aria-pressed={draft.roles === null} onClick={() => page.setDraftField(`roles`, null)}>{`All Roles`}</button><button type='button' id={`${editorId}-roles-none`} className='owner-feature-text-button' aria-pressed={draft.roles?.length === 0} onClick={() => page.setDraftField(`roles`, [])}>{`No Roles`}</button></div><div id={`${editorId}-role-options`} className='owner-feature-role-options'>{featureRoles.map((role) => { const selected = draft.roles === null || draft.roles.includes(role); return <button key={role} type='button' id={`${editorId}-role-${role.toLowerCase()}`} className={`owner-feature-role ${selected ? `is-selected` : ``}`} aria-pressed={selected} onClick={() => page.toggleRole(role)}><Icon name={selected ? `check` : `close`} size={12} />{role}</button>; })}</div></fieldset>
      </fieldset>
      <p id={`${editorId}-audience-note`} className='owner-features-copy'>{`Viewers need an allowed role, the minimum role and the saved minimum plan. A disabled or ineligible theme toggle uses dark mode. These settings do not change account roles or purchase a plan.`}</p>
      <p id={`${editorId}-plans-note`} className='owner-features-copy'>{`Plans: ${page.planLabel(draft)}. Choose a threshold in the table; selecting it again restores Free And Above. Higher catalog tiers qualify automatically.`}</p>
      {page.mutationError || page.error ? <p id={`${editorId}-error`} className='owner-features-error' role='alert'>{page.mutationError || page.error}</p> : null}
      <div id={`${editorId}-actions`} className='owner-feature-editor-actions'>
        {page.mutationError ? <button type='button' id={`${editorId}-discard-reload`} className='owner-features-button' disabled={page.mutating} onClick={page.discardAndReload}><Icon name='refresh' size={14} />{`Discard Draft & Reload`}</button> : null}
        <button type='button' id={`${editorId}-cancel`} className='owner-features-button' disabled={page.mutating} onClick={page.closeEditor}><Icon name='close' size={14} />{`Cancel`}</button><button type='submit' id={`${editorId}-save`} className='owner-features-button is-primary' disabled={page.mutating || !page.ready} aria-busy={page.mutating}><Icon name='save' size={14} />{page.mutating ? `Saving` : `Save Settings`}</button>
      </div>
    </form>
  </dialog>;
};

const OwnerFeatures = () => {
  const page = useOwnerFeatures();
  return <AccountLayout section='admin' title='Features' eyebrow='Admin · Features'>
    <section id='owner-features' className='owner-features' aria-label='Feature Settings' aria-busy={page.busy}>
      <div id='owner-features-toolbar' className='owner-features-toolbar'><button type='button' id='owner-features-reload' className='owner-features-button' disabled={page.mutating} onClick={page.reload}><Icon name='refresh' size={14} />{`Reload`}</button></div>
      {page.loading ? <p id='owner-features-loading' className='sr-only' role='status'>{`Loading Features`}</p> : null}
      {(page.error || page.mutationError) && !page.editor ? <p id='owner-features-error' className='owner-features-error' role='alert'>{page.mutationError || page.error}</p> : null}
      {page.planError ? <p id='owner-feature-plans-error' className='owner-features-error' role='alert'>{page.planError}</p> : null}
      <div id='owner-features-table-region' className='owner-features-table' role='region' aria-label='Feature Settings Table' tabIndex={0}><table id='owner-features-table'><caption className='sr-only'>{`Global Feature Settings`}</caption><thead><tr>{[`No.`, `Feature`, `Description`, `Value`, `Plans`, `Actions`].map((label, index) => <th key={label} id={`owner-features-column-${index}`} scope='col'>{label}</th>)}</tr></thead><tbody>
        {managedFeatures.map((feature, index) => {
          const rowId = `owner-feature-${feature.key}`;
          const policy = page.settings?.features?.[feature.key];
          const unavailable = !page.ready || !policy;
          const saving = page.mutating && page.pendingKey === feature.key;
          return <tr key={feature.key} id={rowId}>
            <td id={`${rowId}-number`}>{index + 1}</td><th scope='row' id={`${rowId}-name`}><span className='owner-feature-identity'><Icon name={feature.icon} size={18} />{feature.name}</span></th>
            <td id={`${rowId}-description`} className='owner-feature-description'>{page.loading ? <Skeleton id={`${rowId}-description-skeleton`} width='90%' height={13} /> : policy?.description ?? `Feature Settings Unavailable`}</td>
            <td id={`${rowId}-value`}><span className={`rowStatus ${unavailable ? `is-unavailable` : policy.enabled ? `is-active` : `is-inactive`}`}><span className='statusDotWrap' aria-hidden='true'><span className='statusDot' /></span><span className='statusText' role='status'>{page.loading ? `Loading` : unavailable ? `Unavailable` : saving ? `Saving` : policy.enabled ? `Enabled` : `Disabled`}</span></span></td>
            <td id={`${rowId}-plans`} className='owner-feature-plans'><div id={`${rowId}-plan-options`} className='owner-feature-plan-options' role='group' aria-label={`${feature.name} Minimum Plan`}>{page.choicesFor(policy).map((plan) => { const selected = policy?.plans?.[0] === plan.slug; return <button key={plan.slug} type='button' id={`${rowId}-plan-${plan.slug}`} className={`owner-feature-role${selected ? ` is-selected` : ``}`} aria-pressed={selected} title={selected ? `Clear ${plan.name} Minimum` : `${plan.name} And Above`} disabled={unavailable || page.busy || Boolean(page.editor) || (!selected && !plan.available)} onClick={() => void page.setMinimumPlan(feature.key, plan.slug)}><Icon name={selected ? `check` : `plans`} size={12} />{plan.name}</button>; })}</div><span id={`${rowId}-plan-threshold`} className='owner-feature-plan-threshold'>{page.planLabel(policy)}</span></td>
            <td id={`${rowId}-actions-cell`}><div className='actionsCell'><div id={`${rowId}-segments`} className='owner-feature-segments' role='group' aria-label={`${feature.name} Value`}>{[false, true].map((enabled) => <button key={String(enabled)} type='button' id={`${rowId}-${enabled ? `enable` : `disable`}`} aria-pressed={!unavailable && policy.enabled === enabled} aria-busy={saving} disabled={unavailable || page.busy || Boolean(page.editor)} onClick={() => void page.setEnabled(feature.key, enabled)}><Icon name={enabled ? `check` : `close`} size={12} />{enabled ? `Enable` : `Disable`}</button>)}</div><button type='button' id={`${rowId}-settings`} className='owner-feature-icon-button' title={`${feature.name} Settings`} aria-label={`${feature.name} Settings`} aria-haspopup='dialog' disabled={unavailable || page.busy} onClick={() => page.edit(feature.key)}><Icon name='settings' size={14} /></button></div></td>
          </tr>;
        })}
      </tbody></table></div>
    </section>
    {page.editor && page.permitted ? <FeatureEditor key={`${page.editor.key}-${page.editor.token}`} page={page} /> : null}
  </AccountLayout>;
};

export default OwnerFeatures;
