import './styles.scss';
import Icon from '../Icon';
import Skeleton from '../Skeleton';
import { useEffect, useRef } from 'react';
import AccountLayout from '../AccountLayout';
import { formatNotificationDate, notificationStatusLabel, useOwnerNotifications, type OwnerNotificationsPage } from './useOwnerNotifications';

const NotificationEditor = ({ page }: { page: OwnerNotificationsPage }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
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
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  const draft = page.draft;
  if (!draft) return null;
  return <dialog ref={dialog} id='owner-notification-editor' className='owner-notification-editor' aria-labelledby='owner-notification-editor-title' onCancel={(event) => { event.preventDefault(); if (!page.mutating) page.closeEditor(); }} onClick={(event) => { if (event.target === event.currentTarget && !page.mutating) page.closeEditor(); }}>
    <form id='owner-notification-editor-form' className='owner-notification-form' onSubmit={(event) => { event.preventDefault(); void page.save(); }}>
      <div id='owner-notification-editor-heading' className='owner-notifications-heading'><h2 id='owner-notification-editor-title'>{page.editing ? `Edit Notification` : `Add Notification`}</h2><button type='button' className='owner-notification-icon-button' id='owner-notification-editor-close' aria-label='Close Notification Editor' disabled={page.mutating} onClick={page.closeEditor}><Icon name='close' size={18} /></button></div>
      <fieldset disabled={page.mutating} id='owner-notification-editor-fields' className='owner-notification-fields'>
        <legend className='sr-only'>{`Notification Details`}</legend>
        <label htmlFor='owner-notification-title' className='owner-notification-field is-wide'><span>{`Title *`}</span><input required id='owner-notification-title' value={draft.title} maxLength={160} onChange={(event) => page.setDraftField(`title`, event.currentTarget.value)} /></label>
        <label htmlFor='owner-notification-slug' className='owner-notification-field'><span>{`URL Slug *`}</span><input required id='owner-notification-slug' value={draft.slug} maxLength={120} pattern='[a-z0-9]+(-[a-z0-9]+)*' autoCapitalize='none' placeholder='archive-update' onChange={(event) => page.setDraftField(`slug`, event.currentTarget.value)} /></label>
        <label htmlFor='owner-notification-kind' className='owner-notification-field'><span>{`Kind`}</span><select id='owner-notification-kind' value={draft.kind} onChange={(event) => page.setDraftField(`kind`, event.currentTarget.value === `development` ? `development` : `announcement`)}><option value='announcement'>{`Announcement`}</option><option value='development'>{`Development`}</option></select></label>
        <label htmlFor='owner-notification-body' className='owner-notification-field is-wide'><span>{`Body *`}</span><textarea required id='owner-notification-body' value={draft.body} rows={6} maxLength={10000} onChange={(event) => page.setDraftField(`body`, event.currentTarget.value)} /></label>
        <label htmlFor='owner-notification-suffix' className='owner-notification-field is-wide'><span>{`Optional Text After The Link`}</span><textarea id='owner-notification-suffix' value={draft.suffix ?? ``} rows={2} maxLength={80} onChange={(event) => page.setDraftField(`suffix`, event.currentTarget.value || null)} /></label>
        <label htmlFor='owner-notification-link-label' className='owner-notification-field'><span>{`Optional Link Label`}</span><input id='owner-notification-link-label' value={draft.linkLabel ?? ``} maxLength={120} onChange={(event) => page.setDraftField(`linkLabel`, event.currentTarget.value || null)} /></label>
        <label htmlFor='owner-notification-link-url' className='owner-notification-field'><span>{`Optional Link Destination`}</span><input id='owner-notification-link-url' value={draft.linkUrl ?? ``} maxLength={2048} autoCapitalize='none' placeholder='/spells Or https://example.com' onChange={(event) => page.setDraftField(`linkUrl`, event.currentTarget.value || null)} /></label>
        <label htmlFor='owner-notification-status' className='owner-notification-field'><span>{`Status`}</span><select id='owner-notification-status' value={draft.status} onChange={(event) => page.setDraftField(`status`, event.currentTarget.value === `published` ? `published` : `draft`)}><option value='draft'>{`Inactive`}</option><option value='published'>{`Active`}</option></select></label>
      </fieldset>
      <p id='owner-notification-editor-note' className='owner-notifications-copy'>{`Inactive notifications stay in Admin. Active notifications appear in the bell menu and on the Notifications page.`}</p>
      {page.error ? <p id='owner-notification-editor-error' className='owner-notifications-error' role='alert'>{page.error}</p> : null}
      <div id='owner-notification-editor-actions' className='owner-notifications-actions'><button type='button' className='owner-notifications-button' id='owner-notification-editor-cancel' disabled={page.mutating} onClick={page.closeEditor}><Icon name='close' size={14} />{`Cancel`}</button><button type='submit' className='owner-notifications-button is-primary' id='owner-notification-editor-save' disabled={page.mutating} aria-busy={page.mutating}><Icon name='save' size={14} />{page.mutating ? `Saving` : `Save`}</button></div>
    </form>
  </dialog>;
};

const OwnerNotifications = () => {
  const page = useOwnerNotifications();
  return <AccountLayout section='admin' title='Notifications' eyebrow='Admin · Notifications'>
    {page.loading ? <p id='owner-notifications-loading-status' className='sr-only' role='status'>{`Loading Notifications`}</p> : null}
    <section id='owner-notifications' className='owner-notifications' aria-labelledby='owner-notifications-title' aria-busy={page.busy}>
      <div id='owner-notifications-heading' className='owner-notifications-heading'><div><h2 id='owner-notifications-title'><Icon name='bell' size={20} />{`Notification Directory`}</h2><p id='owner-notifications-coverage' className='owner-notifications-copy'>{`Page ${page.pageNumber} · Search And Filters Apply To This Loaded Page`}</p></div><dl id='owner-notifications-summary' className='owner-notifications-summary'>{[{ id: `total`, label: `On This Page`, value: page.records.length }, { id: `active`, label: `Active`, value: page.activeCount }, { id: `inactive`, label: `Inactive`, value: page.records.length - page.activeCount }].map((item) => <div key={item.id} id={`owner-notifications-summary-${item.id}`}><dt>{item.label}</dt><dd>{page.loading ? <Skeleton id={`owner-notifications-summary-${item.id}-skeleton`} width={34} height={26} /> : page.ready ? item.value : `—`}</dd></div>)}</dl></div>
      {page.error && !page.draft ? <p id='owner-notifications-error' className='owner-notifications-error' role='alert'>{page.error}</p> : null}
      {page.notice ? <p id='owner-notifications-notice' className='owner-notifications-notice' role='status'><Icon name='check' size={14} />{page.notice}</p> : null}
      <div id='owner-notifications-filters' className='owner-notifications-filters'>
        <label htmlFor='owner-notifications-search' className='owner-notifications-search'><Icon name='search' size={15} /><input id='owner-notifications-search' type='search' value={page.search} disabled={page.loading} placeholder='Search This Page' aria-label='Search Notifications On This Loaded Page' onChange={(event) => page.setSearch(event.currentTarget.value)} /></label>
        <label htmlFor='owner-notifications-filter' className='owner-notifications-filter'><span>{`Status`}</span><select id='owner-notifications-filter' value={page.filter} disabled={page.loading} onChange={(event) => page.setFilter(event.currentTarget.value === `published` ? `published` : event.currentTarget.value === `draft` ? `draft` : `all`)}><option value='all'>{`All Statuses`}</option><option value='published'>{`Active`}</option><option value='draft'>{`Inactive`}</option></select></label>
        <div className='owner-notifications-actions'><button type='button' id='owner-notifications-reload' className='owner-notifications-button' disabled={page.mutating} onClick={page.reload}><Icon name='refresh' size={14} />{`Reload`}</button><button type='button' id='owner-notifications-add' className='owner-notifications-button is-primary' disabled={!page.ready || page.busy} onClick={() => page.edit()}><Icon name='plus' size={14} />{`Add Notification`}</button></div>
      </div>
      <div id='owner-notifications-table-region' className='owner-notifications-table' role='region' aria-label='Notification Directory Table' tabIndex={0}><table id='owner-notifications-table'><caption className='sr-only'>{`Saved App Notifications · Loaded Page ${page.pageNumber}`}</caption><thead><tr>{[`No.`, `Title`, `Kind`, `Status`, `Updated`, `Actions`].map((label, index) => <th key={label} id={`owner-notifications-column-${index}`} scope='col'>{label}</th>)}</tr></thead><tbody>
        {page.loading ? [0, 1, 2].map((index) => <tr key={index} id={`owner-notifications-skeleton-row-${index}`} className='owner-notifications-skeleton-row' aria-hidden='true'>
          <td><Skeleton id={`owner-notifications-skeleton-number-${index}`} width={24} height={18} /></td>
          <td><div className='owner-notification-identity'><Skeleton id={`owner-notifications-skeleton-thumbnail-${index}`} width={36} height={36} shape='block' /><div className='owner-notifications-skeleton-copy'><Skeleton id={`owner-notifications-skeleton-title-${index}`} width='76%' height={14} /><Skeleton id={`owner-notifications-skeleton-slug-${index}`} width='48%' height={10} /><Skeleton id={`owner-notifications-skeleton-body-${index}`} width='100%' height={11} /><Skeleton id={`owner-notifications-skeleton-suffix-${index}`} width='84%' height={11} /></div></div></td>
          <td><Skeleton id={`owner-notifications-skeleton-kind-${index}`} width={84} height={12} /></td>
          <td><Skeleton id={`owner-notifications-skeleton-status-${index}`} width={76} height={30} shape='block' /></td>
          <td><Skeleton id={`owner-notifications-skeleton-updated-${index}`} width={76} height={12} /></td>
          <td><div className='actionsCell'><Skeleton id={`owner-notifications-skeleton-edit-${index}`} width={32} height={32} shape='block' /><Skeleton id={`owner-notifications-skeleton-delete-${index}`} width={32} height={32} shape='block' /></div></td>
        </tr>) : page.ready && page.matchingRecords.length ? page.matchingRecords.map((record) => { const rowId = `owner-notification-${record.id}`; const active = record.status === `published`; return <tr key={record.id} id={rowId}>
          <td id={`${rowId}-number`}>{record.number}</td><td id={`${rowId}-title-cell`}><div className='owner-notification-identity'><span id={`${rowId}-thumbnail`} className='owner-notification-thumbnail' aria-hidden='true'><Icon name={record.kind === `development` ? `edit` : `bell`} size={18} /></span><div className='owner-notification-copy'><strong id={`${rowId}-title`}>{record.title}</strong><span id={`${rowId}-slug`}>{record.slug}</span><p id={`${rowId}-body`}>{record.body}</p></div></div></td><td id={`${rowId}-kind`}>{record.kind === `development` ? `Development` : `Announcement`}</td>
          <td id={`${rowId}-status-cell`}><div className='actionsCell'><button type='button' disabled={page.busy} id={`${rowId}-status`} className={`rowStatus ${active ? `is-active` : `is-inactive`}`} aria-pressed={active} aria-label={`${active ? `Deactivate` : `Activate`} ${record.title}`} onClick={() => void page.changeStatus(record)}><span className='statusDotWrap' aria-hidden='true'><span className='statusDot' /></span><span className='statusText'>{notificationStatusLabel(record.status)}</span></button></div></td><td id={`${rowId}-updated`}><time dateTime={record.updatedAt}>{formatNotificationDate(record.updatedAt)}</time></td>
          <td id={`${rowId}-actions-cell`}><div className='actionsCell'><button type='button' disabled={page.busy} id={`${rowId}-edit`} className='owner-notification-icon-button' title={`Edit ${record.title}`} aria-label={`Edit ${record.title}`} onClick={() => page.edit(record)}><Icon name='settings' size={15} /></button><button type='button' disabled={page.busy} id={`${rowId}-delete`} className='owner-notification-icon-button is-danger' title={`Delete ${record.title}`} aria-label={`Delete ${record.title}`} aria-expanded={page.deletingId === record.id} aria-controls={page.deletingId === record.id ? `${rowId}-confirmation` : undefined} onClick={() => page.requestDelete(record)}><Icon name='trash' size={15} /></button></div>
            {page.deletingId === record.id ? <div id={`${rowId}-confirmation`} className='owner-notification-confirmation' role='group' aria-labelledby={`${rowId}-delete-title`}><p id={`${rowId}-delete-title`}>{`Delete “${record.title}”?`}</p><p>{`This removes the saved notification from Admin and public pages.`}</p><div className='owner-notifications-actions'><button type='button' disabled={page.busy} className='owner-notifications-button is-danger' id={`${rowId}-confirm-delete`} onClick={() => void page.remove(record)}><Icon name='trash' size={13} />{`Delete`}</button><button type='button' disabled={page.busy} className='owner-notifications-button' id={`${rowId}-cancel-delete`} onClick={page.cancelDelete}><Icon name='close' size={13} />{`Cancel`}</button></div></div> : null}
          </td>
        </tr>; }) : <tr id='owner-notifications-empty-row'><td colSpan={6} id='owner-notifications-empty'>{!page.ready ? page.snapshot?.message ?? `Notifications Unavailable` : page.records.length ? `No Notifications Match These Filters` : `No Notifications Saved Yet`}</td></tr>}
      </tbody></table></div>
      <div id='owner-notifications-pagination' className='owner-notifications-pagination'><span id='owner-notifications-page-label'>{`Page ${page.pageNumber} · ${page.ready ? page.matchingRecords.length : `—`} Matching Notification(s) On This Loaded Page`}</span><div className='owner-notifications-actions'><button type='button' id='owner-notifications-previous' className='owner-notifications-button' disabled={!page.hasPrevious || page.busy} onClick={page.previous}><Icon name='back' size={13} />{`Previous`}</button><button type='button' id='owner-notifications-next' className='owner-notifications-button' disabled={!page.hasNext || page.busy} onClick={page.next}>{`Next`}<Icon name='arrow' size={13} /></button><button type='button' id='owner-notifications-latest' className='owner-notifications-button' disabled={page.mutating} onClick={page.latest}><Icon name='refresh' size={13} />{`Latest`}</button></div></div>
      {page.ready ? <p id='owner-notifications-live-status' className='owner-notifications-copy' role='status'>{page.snapshot?.realtime === `subscribed` ? `Listening For Notification Changes` : page.snapshot?.realtime === `connecting` ? `Saved Notifications Loaded · Connecting Updates` : `Saved Notifications Loaded · Live Updates Unavailable`}</p> : null}
    </section>
    {page.draft && page.permitted ? <NotificationEditor key={page.editing?.id ?? `new`} page={page} /> : null}
  </AccountLayout>;
};

export default OwnerNotifications;
