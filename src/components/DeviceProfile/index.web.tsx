import Icon from '../Icon';
import { useDeviceProfile } from './useDeviceProfile';

const DeviceProfile = () => {
  const page = useDeviceProfile();
  const disabled = page.loading || page.busy;
  return <section id='device-profile' className='profile-settings'>
    <h2>Profile on this device</h2>
    <p>This is a local preference, not an account or Owner identity. It is visible to anyone using this browser profile, is not synced or backed up, and is lost if browser storage is cleared. Do not enter sensitive information.</p>
    <form id='device-profile-form' onSubmit={(event) => { event.preventDefault(); void page.persist(); }}>
      <div className='profile-field'><label htmlFor='device-profile-nickname'>Nickname</label><input id='device-profile-nickname' value={page.value.nickname} disabled={disabled} maxLength={80} autoComplete='off' onChange={(event) => page.update(`nickname`, event.target.value)} /></div>
      <div className='profile-field'><label htmlFor='device-profile-note'>Reading note</label><textarea id='device-profile-note' value={page.value.readingNote} disabled={disabled} maxLength={500} placeholder='What would you like to explore next?' onChange={(event) => page.update(`readingNote`, event.target.value)} /></div>
      <div className='profile-form-actions'>
        <button id='device-profile-save' type='submit' disabled={disabled}><Icon name='check' size={16} />Save on this device</button>
        <button id='device-profile-clear' type='button' disabled={disabled} onClick={() => { if (window.confirm(`Clear your device nickname and reading note? This does not remove bookmarks or contribution drafts.`)) void page.persist(true); }}><Icon name='trash' size={16} />Clear device profile</button>
        <button id='device-profile-theme' type='button' onClick={() => void page.toggleTheme()}><Icon name='moon' size={16} />Use {page.theme === `night` ? `Ivory` : `Midnight`} theme</button>
      </div>
    </form>
    <p id='device-profile-status' role='status'>{page.loading ? `Loading device preferences…` : page.notice}</p>
  </section>;
};
export default DeviceProfile;
