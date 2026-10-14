import Icon from '../Icon';
import AppLink from '../AppLink';
import PageMetadata from '../PageMetadata';
import { useAccountLayout, type AccountLayoutProps } from './useAccountLayout';
import './styles.scss';

const AccountLayout = ({ title, children, description, section = `account`, eyebrow = `YOUR CORNER OF THE ARCHIVE` }: AccountLayoutProps) => {
  const page = useAccountLayout();
  const dashboard = page.adminLinks.find((item) => item.href === `/dashboard`);
  const childrenLinks = page.adminLinks.filter((item) => item.href !== `/dashboard` && item.href !== `/review`);
  const review = page.adminLinks.find((item) => item.href === `/review`);
  const current = (href: string) => page.pathname === href;
  return (
    <div id='account-layout' className={`account-layout ${page.collapsed ? `is-collapsed` : ``}`} data-section={section}>
      <PageMetadata noIndex title={title} description={description ?? `Your private Spelling Spells workspace.`} />
      <aside id='account-sidebar' className='account-sidebar' aria-label='Account navigation'>
        <div className='account-sidebar-body'>
          <nav id='account-navigation' aria-label='Your account' className='account-sidebar-group'>
            <h2 className='account-sidebar-heading'>ACCOUNT</h2>
            {page.accountLinks.map((item) => <AppLink key={item.href} id={`account-nav-${item.href.replaceAll(`/`, `-`)}`} href={item.href} title={item.label} aria-label={item.label} aria-current={current(item.href) ? `page` : undefined} className={`account-sidebar-link ${current(item.href) ? `is-active` : ``}`}><Icon name={item.icon} size={16} /><span>{item.label}</span></AppLink>)}
            <AppLink id='account-nav-saved' href='/saved' title='Saved on this device' aria-label='Saved on this device' className='account-sidebar-link'><Icon name='bookmark' size={16} /><span>Saved spells<small>On this device</small></span></AppLink>
          </nav>
          {dashboard ? <nav id='admin-navigation' className='account-sidebar-group' aria-label='Owner administration'>
            <h2 className='account-sidebar-heading'>ADMIN</h2>
            <div className='account-sidebar-parent'>
              <AppLink id='account-nav-dashboard' href={dashboard.href} title={dashboard.label} aria-label={dashboard.label} aria-current={current(dashboard.href) ? `page` : undefined} className={`account-sidebar-link ${current(`/dashboard`) || current(`/analytics`) ? `is-active` : ``}`}><Icon name={dashboard.icon} size={16} /><span>{dashboard.label}</span></AppLink>
              <button id='account-toggle-desktop-dashboard' type='button' className='account-submenu-toggle account-desktop-control' aria-controls='account-desktop-dashboard-children' aria-label='Toggle dashboard pages' aria-expanded={page.desktopDashboard} onClick={() => page.toggleDashboard(false)}><Icon name={page.desktopDashboard ? `up` : `down`} size={13} /></button>
              <button id='account-toggle-mobile-dashboard' type='button' className='account-submenu-toggle account-mobile-control' aria-controls='account-mobile-dashboard-children' aria-label='Toggle dashboard pages' aria-expanded={page.mobileDashboard} onClick={() => page.toggleDashboard(true)}><Icon name={page.mobileDashboard ? `up` : `down`} size={13} /></button>
            </div>
            {([false, true] as const).map((mobile) => <div key={String(mobile)} id={`account-${mobile ? `mobile` : `desktop`}-dashboard-children`} className={`account-sidebar-children ${mobile ? `account-mobile-control` : `account-desktop-control`} ${(mobile ? page.mobileDashboard : page.desktopDashboard) || (!mobile && page.collapsed) ? `is-open` : ``}`} aria-hidden={!((mobile ? page.mobileDashboard : page.desktopDashboard) || (!mobile && page.collapsed))}><div>{childrenLinks.map((item) => <AppLink key={item.href} href={item.href} id={`account-${mobile ? `mobile` : `desktop`}-child-${item.icon}`} title={item.label} aria-label={item.label} tabIndex={(mobile ? page.mobileDashboard : page.desktopDashboard) || (!mobile && page.collapsed) ? 0 : -1} aria-current={current(item.href) ? `page` : undefined} className={`account-sidebar-link ${current(item.href) ? `is-active` : ``}`}><Icon name={item.icon} size={15} /><span>{item.label}</span></AppLink>)}</div></div>)}
            {review ? <AppLink id='account-nav-review' href={review.href} title={review.label} aria-label={review.label} aria-current={current(review.href) ? `page` : undefined} className={`account-sidebar-link ${current(review.href) ? `is-active` : ``}`}><Icon name={review.icon} size={16} /><span>{review.label}</span></AppLink> : null}
          </nav> : null}
          <div className='account-sidebar-footnote'><Icon name='shield' size={14} /><span>{page.account ? `Private account workspace` : `Account services not connected`}</span></div>
        </div>
        <div className='account-sidebar-bottom'>
          <AppLink id='account-bottom-profile' href={page.account ? `/profile` : `/signin`} title={page.account ? `Your profile` : `Sign in`} aria-label={page.account ? `Your profile` : `Sign in`} className='account-identity'><span className='account-avatar'>{page.avatarUrl ? <img src={page.avatarUrl} alt='' /> : page.account?.displayName.charAt(0).toUpperCase() || <Icon name='user' size={16} />}</span><span className='account-identity-label'>{page.account?.displayName || `Your account`}<small>{page.account ? `View profile` : `Sign in to connect`}</small></span></AppLink>
          <button id='account-collapse-navigation' type='button' className='account-collapse-control' aria-label={page.collapsed ? `Expand account navigation` : `Collapse account navigation`} aria-expanded={!page.collapsed} onClick={page.toggleCollapsed}><Icon name={page.collapsed ? `arrow-right` : `arrow-left`} size={17} /></button>
        </div>
      </aside>
      <div id='account-main' className='account-main'>
        <header id='account-page-heading' className='account-page-heading'><span className='account-eyebrow'>{eyebrow}</span><h1>{title}</h1>{description ? <p>{description}</p> : null}</header>
        {page.error ? <p id='account-navigation-error' role='status' className='account-storage-error'>{page.error}</p> : null}
        {children}
      </div>
    </div>
  );
};

export default AccountLayout;
