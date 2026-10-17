import Icon from '../Icon';
import AppLink from '../AppLink';
import AccountLayout from '../AccountLayout';
import './styles.scss';

const FeedbackPage = () => <AccountLayout section='admin' title='Feedback' eyebrow='Owner Workspace' description='Contact messages and spell requests, kept private to the Owner.'>
  <div id='feedback-destinations' className='feedback-destinations'>
    <section id='feedback-contacts' className='feedback-destination'><Icon name='mail' size={25} /><h2>{`Contacts`}</h2><p>{`Read messages sent through the contact form and manage their New, Read, or Archived status.`}</p><AppLink id='feedback-open-contacts' href='/contacts' className='secondary-button'><Icon name='mail' size={16} />{`Open Contacts`}<Icon name='arrow' size={16} /></AppLink></section>
    <section id='feedback-requests' className='feedback-destination'><Icon name='shield' size={25} /><h2>{`Requests`}</h2><p>{`The spell request review service is not connected yet. Contribution drafts remain on the device until that service is available.`}</p><AppLink id='feedback-open-requests' href='/review' className='secondary-button'><Icon name='shield' size={16} />{`Open Requests`}<Icon name='arrow' size={16} /></AppLink></section>
  </div>
</AccountLayout>;

export default FeedbackPage;
