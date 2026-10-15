import Icon from '../Icon';
import AppLink from '../AppLink';
import AccountLayout from '../AccountLayout';
import { useOwnerRecords } from './useOwnerRecords';
import type { OwnerRecordView } from '../../shared/admin/service';
import './styles.scss';

const OwnerRecords = ({ view }: { view: OwnerRecordView }) => {
  const page = useOwnerRecords(view);
  const { content } = page;
  return <AccountLayout section='admin' title={content.title} description={content.description} eyebrow='OWNER WORKSPACE'>
    <section id={`owner-${view}-access`} className='owner-records-card' aria-live='polite'>
      <Icon name={content.icon} size={28} />
      <h2>{page.loading ? `Checking account access…` : !page.permitted ? page.account ? `Owner access required` : `Sign in to view this` : `Connection required`}</h2>
      <p>{page.permitted ? page.snapshot?.message ?? `Waiting for service availability. No records are shown.` : `Only an active, verified Owner can access this workspace. No private records or account counts are exposed in this preview.`}</p>
      {!page.account && !page.loading ? <div className='owner-records-actions'><AppLink id={`owner-${view}-signin`} href={`/signin?returnTo=${content.path}`} className='primary-button'><Icon name='user' size={16} />Sign in</AppLink><AppLink id={`owner-${view}-signup`} href={`/signup?returnTo=${content.path}`} className='secondary-button'>Create account<Icon name='arrow' size={16} /></AppLink></div> : null}
    </section>
    <section id={`owner-${view}-preview`} className='owner-records-card'>
      <div className='owner-records-heading'><h2>Workspace layout</h2><span className='rowStatus'><span className='statusDotWrap'><i className='statusDot' /></span><span className='statusText'>Not connected</span></span></div>
      <p>This layout contains no sample people, messages or fabricated totals.</p>
      <div className='owner-records-table' role='region' aria-label={`${content.title}: disconnected table preview`} tabIndex={0}>
        <table><thead><tr>{content.columns.map((column) => <th key={column} scope='col'>{column}</th>)}</tr></thead><tbody><tr><td colSpan={content.columns.length}>Unavailable, not an empty-record result. Connect the protected service before loading records.</td></tr></tbody></table>
      </div>
      <p>{content.boundary}</p>
      {view === `feedback` ? <AppLink id='feedback-review-submissions' href='/review' className='secondary-button'><Icon name='shield' size={16} />Submission review</AppLink> : null}
    </section>
  </AccountLayout>;
};
export default OwnerRecords;
