import Icon from '../Icon';
import AppLink from '../AppLink';
import { useState } from 'react';
import AccountLayout from '../AccountLayout';
import { useOwnerRecords } from './useOwnerRecords';
import AccountSignInMethods from '../AccountSignInMethods';
import type { OwnerRecordView, OwnerAccountRecord } from '../../shared/admin/service';
import './styles.scss';

const UserIdentity = ({ record }: { record: OwnerAccountRecord }) => {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const avatar = record.avatarUrl === failedAvatar ? null : record.avatarUrl;
  return <span id={`owner-user-identity-${record.id}`} className='owner-user-identity'>
    <span id={`owner-user-avatar-${record.id}`} className='owner-user-avatar' aria-hidden='true'>
      {avatar ? <img src={avatar} alt='' referrerPolicy='no-referrer' onError={() => setFailedAvatar(avatar)} /> : record.displayName.trim()?.[0]?.toUpperCase() || `?`}
    </span>
    <span id={`owner-user-name-${record.id}`} className='owner-user-name'>{record.displayName}</span>
  </span>;
};

const OwnerRecords = ({ view }: { view: OwnerRecordView }) => {
  const page = useOwnerRecords(view);
  const { content, snapshot } = page;
  const ready = snapshot?.state === `ready`;
  const loading = page.loading || (page.permitted && (!snapshot || snapshot.state === `loading`));
  const status = ready ? snapshot?.realtime === `subscribed` ? `Listening for changes` : `Server data loaded` : loading ? `Loading` : `Unavailable`;
  return <AccountLayout section='admin' title={content.title} description={content.description} eyebrow='OWNER WORKSPACE'>
    {view === `feedback` ? <section id={`owner-${view}-access`} className='owner-records-card' aria-live='polite'>
      <Icon name={content.icon} size={28} />
      <h2>{page.loading ? `Checking account access.` : !page.permitted ? page.account ? `Owner access required` : `Sign in to view this` : `Connection required`}</h2>
      <p>{page.permitted ? snapshot?.message ?? `Waiting for confirmed account data.` : `Only an active, verified Owner can access this workspace.`}</p>
      {!page.account && !page.loading ? <div className='owner-records-actions'><AppLink id={`owner-${view}-signin`} href={`/signin?returnTo=${content.path}`} className='primary-button'><Icon name='user' size={16} />Sign in</AppLink><AppLink id={`owner-${view}-signup`} href={`/signup?returnTo=${content.path}`} className='secondary-button'>Create account<Icon name='arrow' size={16} /></AppLink></div> : null}
    </section> : null}
    <section id={`owner-${view}-records`} className='owner-records-card'>
      <div className='owner-records-heading'><h2>{view === `users` ? `Users` : `Feedback workspace`}</h2><div className='owner-records-actions'><span className={`rowStatus ${ready ? `is-active` : ``}`}><span className='statusDotWrap'><i className='statusDot' /></span><span className='statusText'>{status}</span></span>{page.permitted && view === `users` ? <button id='owner-users-reload' className='owner-records-button' type='button' disabled={loading} onClick={page.retry}><Icon name='refresh' size={15} />{loading ? `Loading` : `Reload Users`}</button> : null}</div></div>
      <div className='owner-records-table' role='region' aria-label={`${content.title}: ${ready ? `loaded page` : `unavailable`}`} tabIndex={0} aria-busy={loading}>
        <table><thead><tr>{content.columns.map((column) => <th key={column} scope='col'>{column}</th>)}</tr></thead><tbody>{ready && snapshot?.records?.length ? snapshot.records.map((record) => <tr key={record.id} id={`owner-user-${record.id}`}>
          <td>{record.number}</td><td><UserIdentity record={record} /></td><td><span id={`owner-user-email-${record.id}`} className='owner-user-email'><AccountSignInMethods id={`owner-user-signin-methods-${record.id}`} providers={record.authProviders} /><span id={`owner-user-email-address-${record.id}`} className='owner-user-email-address'>{record.email}</span></span></td><td>{record.role}</td>
          <td><span className={`rowStatus ${record.active ? `is-active` : `is-inactive`}`}><span className='statusDotWrap'><i className='statusDot' /></span><span className='statusText'>{record.active ? `Active` : `Inactive`}</span></span></td>
          <td className='actionsCell'>Read only</td>
        </tr>) : <tr><td colSpan={content.columns.length}><span role={!loading && (snapshot?.state === `error` || snapshot?.state === `denied`) ? `alert` : undefined}>{ready ? `No users on this page.` : loading ? `Loading users…` : snapshot?.message ?? `Users unavailable`}</span></td></tr>}</tbody></table>
      </div>
      {page.permitted && view === `users` ? <div id='owner-users-pagination' className='owner-records-actions'><button id='owner-users-previous' className='owner-records-button' type='button' disabled={!page.hasPrevious || loading} onClick={page.previous}><Icon name='back' size={15} />Previous</button><span className='owner-records-page'>Page {page.pageNumber}</span><button id='owner-users-next' className='owner-records-button' type='button' disabled={!ready || snapshot?.nextCursor == null || loading} onClick={page.next}>Older accounts<Icon name='arrow-right' size={15} /></button></div> : null}
      <p>{content.boundary}</p>
      {view === `feedback` ? <AppLink id='feedback-review-submissions' href='/review' className='secondary-button'><Icon name='shield' size={16} />Submission review</AppLink> : null}
    </section>
  </AccountLayout>;
};
export default OwnerRecords;
