import Icon from '../Icon';
import AppLink from '../AppLink';
import TextReveal from '../TextReveal';
import AccountGate from './AccountGate';
import PageMetadata from '../PageMetadata';
import { useAccountLayout, type AccountLayoutProps } from './useAccountLayout';
import './styles.scss';

const AccountLayout = ({ title, children, description, section = `account`, eyebrow = `YOUR CORNER OF THE ARCHIVE` }: AccountLayoutProps) => {
  const page = useAccountLayout();
  const dashboard = page.adminLinks.find((item) => item.href === `/dashboard`);
  const childrenLinks = page.adminLinks.filter((item) => item.href !== `/dashboard` && item.href !== `/review` && item.href !== `/feedback`);
  const feedback = page.adminLinks.find((item) => item.href === `/feedback`);
  const review = page.adminLinks.find((item) => item.href === `/review`);
  const current = (href: string) => page.pathname === href;
  return (
    <div id='account-layout' className={`account-layout ${page.collapsed ? `is-collapsed` : ``}`} data-section={section} data-view={page.activeRoute?.parent ?? page.pathname}>
      <PageMetadata noIndex title={title} description={description ?? `Your private Spelling Spells workspace.`} />
      <aside id='account-sidebar' className='account-sidebar' aria-label='Account navigation'>
        <div className='account-sidebar-body'>
          <nav id='account-navigation' aria-label='Your account' className='account-sidebar-group'>
            <h2 className='account-sidebar-heading'>ACCOUNT</h2>
            {page.accountLinks.map((item) => <AppLink key={item.href} id={`account-nav-${item.href.replaceAll(`/`, `-`)}`} href={item.href} title={item.label} aria-label={item.label} aria-current={current(item.href) ? `page` : undefined} className={`account-sidebar-link ${current(item.href) || page.activeRoute?.parent === item.href ? `is-active` : ``}`}><Icon name={item.icon} size={15} /><span>{item.label}</span></AppLink>)}
          </nav>
          {dashboard ? <nav id='admin-navigation' className='account-sidebar-group' aria-label='Owner administration'>
            <h2 className='account-sidebar-heading'>ADMIN</h2>
            <div className='account-sidebar-parent'>
              <AppLink id='account-nav-dashboard' href={dashboard.href} title={dashboard.label} aria-label={dashboard.label} aria-current={current(dashboard.href) ? `page` : undefined} className={`account-sidebar-link ${current(`/dashboard`) || childrenLinks.some((item) => current(item.href)) ? `is-active` : ``}`}><Icon name={dashboard.icon} size={16} /><span>{dashboard.label}</span></AppLink>
              <button id='account-toggle-desktop-dashboard' type='button' className='account-submenu-toggle account-desktop-control' aria-controls='account-desktop-dashboard-children' aria-label='Toggle dashboard pages' aria-expanded={page.desktopDashboard} onClick={() => page.toggleDashboard(false)}><Icon name={page.desktopDashboard ? `chevron-up` : `chevron-down`} size={13} /></button>
              <button id='account-toggle-mobile-dashboard' type='button' className='account-submenu-toggle account-mobile-control' aria-controls='account-mobile-dashboard-children' aria-label='Toggle dashboard pages' aria-expanded={page.mobileDashboard} onClick={() => page.toggleDashboard(true)}><Icon name={page.mobileDashboard ? `chevron-up` : `chevron-down`} size={13} /></button>
            </div>
            {([false, true] as const).map((mobile) => <div key={String(mobile)} id={`account-${mobile ? `mobile` : `desktop`}-dashboard-children`} className={`account-sidebar-children ${mobile ? `account-mobile-control` : `account-desktop-control`} ${(mobile ? page.mobileDashboard : page.desktopDashboard) || (!mobile && page.collapsed) ? `is-open` : ``}`} aria-hidden={!((mobile ? page.mobileDashboard : page.desktopDashboard) || (!mobile && page.collapsed))}><div>{childrenLinks.map((item) => <AppLink key={item.href} href={item.href} id={`account-${mobile ? `mobile` : `desktop`}-child-${item.icon}`} title={item.label} aria-label={item.label} tabIndex={(mobile ? page.mobileDashboard : page.desktopDashboard) || (!mobile && page.collapsed) ? 0 : -1} aria-current={current(item.href) ? `page` : undefined} className={`account-sidebar-link ${current(item.href) ? `is-active` : ``}`}><Icon name={item.icon} size={15} /><span>{item.label}</span></AppLink>)}</div></div>)}
            {feedback ? <>
              <div className='account-sidebar-parent'>
                <AppLink id='account-nav-feedback' href={feedback.href} title={feedback.label} aria-label={feedback.label} aria-current={current(feedback.href) ? `page` : undefined} className={`account-sidebar-link ${current(feedback.href) || current(`/review`) ? `is-active` : ``}`}><Icon name={feedback.icon} size={16} /><span>{feedback.label}</span></AppLink>
                {([false, true] as const).map((mobile) => <button key={String(mobile)} id={`account-toggle-${mobile ? `mobile` : `desktop`}-feedback`} type='button' className={`account-submenu-toggle ${mobile ? `account-mobile-control` : `account-desktop-control`}`} aria-controls={`account-${mobile ? `mobile` : `desktop`}-feedback-children`} aria-label='Toggle feedback pages' aria-expanded={mobile ? page.mobileFeedback : page.desktopFeedback} onClick={() => page.toggleFeedback(mobile)}><Icon name={(mobile ? page.mobileFeedback : page.desktopFeedback) ? `chevron-up` : `chevron-down`} size={13} /></button>)}
              </div>
              {review ? ([false, true] as const).map((mobile) => {
                const expanded = (mobile ? page.mobileFeedback : page.desktopFeedback) || (!mobile && page.collapsed);
                return <div key={String(mobile)} id={`account-${mobile ? `mobile` : `desktop`}-feedback-children`} className={`account-sidebar-children ${mobile ? `account-mobile-control` : `account-desktop-control`} ${expanded ? `is-open` : ``}`} aria-hidden={!expanded}><div><AppLink id={`account-${mobile ? `mobile` : `desktop`}-review`} href={review.href} title={review.label} aria-label={review.label} tabIndex={expanded ? 0 : -1} aria-current={current(review.href) ? `page` : undefined} className={`account-sidebar-link ${current(review.href) ? `is-active` : ``}`}><Icon name={review.icon} size={15} /><span>{review.label}</span></AppLink></div></div>;
              }) : null}
            </> : null}
          </nav> : null}
        </div>
        <div className='account-sidebar-bottom'>
          <AppLink id='account-bottom-profile' href={page.account ? `/profile` : `/signin`} title={page.account ? `Your profile` : `Sign in`} aria-label={page.account ? `Your profile` : `Sign in`} className='account-identity'><span className='account-avatar'>{page.avatarUrl ? <img src={page.avatarUrl} alt='' referrerPolicy='no-referrer' onError={page.onAvatarError} /> : page.account?.displayName.charAt(0).toUpperCase() || <Icon name='user' size={16} />}</span><span className='account-identity-label'>{page.account?.displayName || `Your account`}<small>{page.account ? `View profile` : `Sign in to connect`}</small></span></AppLink>
          <button id='account-collapse-navigation' type='button' className='account-collapse-control' aria-label={page.collapsed ? `Expand account navigation` : `Collapse account navigation`} aria-expanded={!page.collapsed} onClick={page.toggleCollapsed}><Icon name={page.collapsed ? `chevron-right` : `chevron-left`} size={17} /></button>
        </div>
      </aside>
      <div id='account-main' className='account-main'>
        <header id='account-page-heading' className='account-page-heading'><span className='account-eyebrow'>{eyebrow}</span><h1 id='account-page-title'><Icon name={page.activeRoute?.icon ?? (section === `admin` ? `dashboard` : `user`)} size={29} /><TextReveal id='account-page-title-text' text={title} /></h1>{description ? <p>{description}</p> : null}</header>
        {page.error ? <p id='account-navigation-error' role='status' className='account-storage-error'>{page.error}</p> : null}
        {section === `admin` && !page.ownerAllowed ? <AccountGate ownerOnly returnTo={page.pathname} /> : children}
      </div>
    </div>
  );
};

export default AccountLayout;
