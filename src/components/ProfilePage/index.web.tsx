import Icon from '../Icon';
import AppLink from '../AppLink';
import AccountLayout from '../AccountLayout';
import AccountGate from '../AccountLayout/AccountGate';
import { useProfilePage, connectionRequirements, type ProfilePageProps } from './useProfilePage';
import './styles.scss';

const ProfilePage = (props: ProfilePageProps) => {
  const page = useProfilePage(props);
  return <AccountLayout title={page.title} description={page.description}>
    {!page.allowed ? <AccountGate returnTo={page.view === `connections` ? `/profile/connections` : `/profile`} /> : page.view === `connections` ? (
      <div id='profile-connections' className='profile-connections'>
        <div className='profile-status-note'><Icon name='shield' size={20} /><div><strong>Connections need a secure service.</strong><p>No provider is connected. This page does not collect API keys, passwords, or tokens.</p></div></div>
        {connectionRequirements.map((item) => <article key={item.id} id={`connection-${item.id}`} className='profile-connection-card'><span className='profile-connection-icon'><Icon name={item.icon} size={23} /></span><div><h2>{item.name}</h2><p>{item.detail}</p></div><span className='profile-connection-status'><i />{item.status}</span></article>)}
        <p className='profile-footnote'>When available, connection metadata will be private to this account. Production credentials must remain behind the server boundary.</p>
      </div>
    ) : (
      <div id='profile-details' className='profile-layout'>
        <section id='profile-settings' className='profile-settings'>
          <div className='profile-identity'><span className='profile-large-avatar'>{page.avatarUrl ? <img src={page.avatarUrl} alt='' /> : page.account?.displayName.charAt(0).toUpperCase()}</span><div><h2>{page.account?.displayName}</h2><p>Private account profile</p></div></div>
          <div className='profile-status-note'><Icon name='shield' size={18} /><p>Profile updates are unavailable until the persistence service is connected. No changes can be saved here yet.</p></div>
          <form id='profile-settings-form' onSubmit={(event) => event.preventDefault()}>
            <div className='profile-field'><label htmlFor='profile-name'>Name</label><div><input id='profile-name' value={page.account?.displayName ?? ``} disabled /><small>Display name</small></div></div>
            <div className='profile-field'><label htmlFor='profile-email'>Email</label><div><input id='profile-email' type='email' value={page.account?.email ?? ``} disabled /><small>Managed by your sign-in provider</small></div></div>
            <div className='profile-field'><label htmlFor='profile-bio'>About you</label><div><textarea id='profile-bio' placeholder='A few words about your favorite worlds…' disabled rows={3} /><small>Profile editing is not connected</small></div></div>
            <div className='profile-field'><span>Privacy</span><div className='profile-privacy-value'><Icon name='shield' size={16} /><span>Private by default<small>No public profile is published</small></span></div></div>
            <div className='profile-form-footer'><span>No changes saved</span><button id='profile-save' className='primary-button' type='submit' disabled><Icon name='check' size={16} /> Save changes</button></div>
          </form>
        </section>
        <aside id='profile-metadata' className='profile-metadata'><h2>Your account</h2><dl><div><dt>Access</dt><dd>{page.account?.roleVerified ? page.account.role : `Unverified`}</dd></div><div><dt>Profile</dt><dd>Private</dd></div><div><dt>Sync</dt><dd>Unavailable</dd></div></dl><AppLink id='profile-open-connections' href='/profile/connections' className='profile-metadata-link'><Icon name='link' size={15} /> Private connections<Icon name='arrow-right' size={14} /></AppLink><div className='profile-device-settings'><Icon name='moon' size={19} /><h3>Make yourself at home.</h3><p>Theme is saved on this device, independently of your account.</p><button id='profile-toggle-theme' type='button' onClick={() => void page.toggleTheme()}><Icon name={page.theme === `night` ? `sun` : `moon`} size={15} /> Use {page.theme === `night` ? `Ivory` : `Midnight`} theme</button></div></aside>
      </div>
    )}
    {!page.allowed ? <div id='profile-device-note' className='profile-device-note'><Icon name='bookmark' size={19} /><p>Your spellbook is already yours.<span>Saved spells are available on this device without an account.</span></p><AppLink href='/saved'><span>Open spellbook</span><Icon name='arrow-right' size={16} /></AppLink></div> : null}
  </AccountLayout>;
};

export default ProfilePage;
