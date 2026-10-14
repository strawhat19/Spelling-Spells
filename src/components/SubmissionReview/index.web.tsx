import Icon from '../Icon';
import AppLink from '../AppLink';
import AccountLayout from '../AccountLayout';
import { useSubmissionReview } from './useSubmissionReview';
import './styles.scss';

const SubmissionReview = ({ review = false }: { review?: boolean }) => {
  const { account, loading, permitted, result } = useSubmissionReview(review);
  return (
    <AccountLayout
      section={review ? `admin` : `account`}
      eyebrow={review ? `Editorial desk` : `Your contributions`}
      title={review ? `Every word deserves a second look.` : `A little knowledge, shared carefully.`}
      description={review ? `A private workspace for reviewing sourced suggestions before publication.` : `Track your suggestions and editorial feedback when account services are connected.`}
    >
      <div id={review ? `review-submissions` : `my-submissions`} className='submission-review'>
        <section id='submission-access-state' className='submission-access-state' aria-live='polite'>
          <span className='submission-access-emblem'><Icon name={review ? `shield` : `edit`} size={30} /></span>
          <div>
            <span className='submission-state-label'>{loading ? `Loading` : review ? `Owner Access Required` : `Private Account History`}</span>
            <h2>{loading ? `Checking account access…` : !permitted ? account ? `This account does not have access` : `Sign in to view this` : `The review service is not connected yet`}</h2>
            <p>{loading ? `Private records remain hidden until account access is confirmed.` : permitted ? result?.message ?? `No submission records or review actions are available until the service is connected.` : review ? `Only a trusted, verified Owner can read the review queue or make publication decisions. There is no local role override.` : `Your history is separate from the device-only draft. Signing in will not automatically upload that draft.`}</p>
            {!account && !loading ? <div className='submission-access-actions'><AppLink id='submission-signin' href={`/signin?returnTo=${review ? `/review` : `/submissions`}`} className='primary-button'><Icon name='user' size={17} />Sign In</AppLink><AppLink id='submission-signup' href='/signup' className='secondary-button'>Create Account<Icon name='arrow' size={16} /></AppLink></div> : null}
          </div>
        </section>
        <section id='submission-workflow-preview' className='submission-workflow-preview'>
          <div className='submission-table-header'><div><span className='submission-state-label'>Workflow Preview · No Live Data</span><h2>{review ? `The editorial queue` : `From draft to the archive`}</h2></div><span className='submission-unavailable'><Icon name='lock' size={14} />Not Connected</span></div>
          <div className='submission-workflow-steps'>
            {[{ icon: `edit`, title: `Prepare`, description: `A sourced suggestion, written in your own words.` }, { icon: `shield`, title: `Review`, description: `An editor checks source, clarity, and attribution.` }, { icon: `book`, title: `Publish`, description: `Approved content can become a public entry.` }].map((step, index) => <div id={`submission-workflow-step-${index}`} key={step.title}><span className='submission-workflow-icon'><Icon name={step.icon} size={21} /></span><h3>{step.title}</h3><p>{step.description}</p></div>)}
          </div>
          <div className='submission-table-shell' role='region' aria-label='Unavailable submission table'>
            <div className='submission-table-columns' aria-hidden='true'><span>Contribution</span><span>World</span><span>Status</span><span>Updated</span></div>
            <div className='submission-table-empty'><Icon name='book' size={28} /><h3>No live queue is available</h3><p>This is not a zero-record report. Account connection, persistence, and permission checks are still pending.</p></div>
          </div>
          <div className='submission-review-footer'><p>Review actions stay disabled until a trusted backend confirms access. Drafts are never published automatically.</p><AppLink id='submission-prepare-draft' href='/submit' className='secondary-button'><Icon name='edit' size={17} />Prepare a Draft</AppLink></div>
        </section>
      </div>
    </AccountLayout>
  );
};

export default SubmissionReview;
