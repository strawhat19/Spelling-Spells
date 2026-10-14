import Icon from '../Icon';
import UserMenu from '../UserMenu';
import AppLink from '../AppLink';
import BrandLogo from '../BrandLogo';
import { useHeader } from './useHeader';
import { navigation } from '../../shared/routes';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useSpells } from '../../shared/spellsContext/useSpells';
import './styles.scss';

const Header = ({ sticky = true, scrolled = false }: { sticky?: boolean; scrolled?: boolean }) => {
  const { theme, toggleTheme } = useTheme();
  const { savedIds } = useSpells();
  const { pathname, menuOpen, setMenuOpen, headerRef } = useHeader();

  return (
    <header ref={headerRef} id='site-header' className={`site-header ${sticky ? `is-sticky` : ``} ${scrolled ? `is-scrolled` : ``} ${menuOpen ? `is-menu-open` : ``}`}>
      <div id='site-header-inner' className='site-header-inner'>
        <AppLink id='header-brand' href='/' className='header-brand' aria-label='Spelling Spells Home'>
          <BrandLogo size={70} />
          <span className='header-wordmark'>Spelling Spells</span>
        </AppLink>
        <nav id='header-navigation' className='header-navigation' aria-label='Main Navigation'>
          {navigation.map((item) => (
            <AppLink
              href={item.href}
              key={item.href}
              id={`header-link-${item.href.slice(1)}`}
              aria-current={pathname === item.href ? `page` : undefined}
              className={`header-nav-link ${pathname === item.href ? `is-active` : ``}`}
            >
              <Icon name={item.icon} size={17} />{item.label}
            </AppLink>
          ))}
        </nav>
        <div id='header-actions' className='header-actions'>
          <UserMenu />
          <AppLink id='header-saved-link' href='/saved' className='header-saved-link' aria-label={`Saved Spells, ${savedIds.length} saved`}>
            <Icon name='bookmark' size={21} /><span>Saved</span>
            {savedIds.length > 0 ? <span className='saved-count'>{savedIds.length}</span> : null}
          </AppLink>
          <button
            type='button'
            id='header-theme-toggle'
            onClick={toggleTheme}
            className='header-theme-toggle'
            aria-label={`Switch to ${theme === `night` ? `Ivory` : `Night`} Mode`}
            title={`Switch to ${theme === `night` ? `Ivory` : `Night`} Mode`}
          >
            <Icon name={theme === `night` ? `sun` : `moon`} size={21} />
          </button>
          <button
            type='button'
            id='header-menu-toggle'
            aria-controls='mobile-navigation'
            className='header-menu-toggle'
            aria-expanded={menuOpen}
            aria-label={menuOpen ? `Close Menu` : `Open Menu`}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? `close` : `menu`} size={23} />
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav id='mobile-navigation' className='mobile-navigation' aria-label='Mobile Navigation'>
          <AppLink id='mobile-saved-link' href='/saved' className='mobile-nav-link'><Icon name='bookmark' />Saved Spells</AppLink>
          <button id='mobile-theme-toggle' type='button' className='mobile-nav-link mobile-theme-toggle' onClick={toggleTheme}><Icon name={theme === `night` ? `sun` : `moon`} />Switch to {theme === `night` ? `Ivory` : `Night`} Mode</button>
          {navigation.map((item) => (
            <AppLink key={item.href} href={item.href} id={`mobile-link-${item.href.slice(1)}`} className='mobile-nav-link'>
              <Icon name={item.icon} />{item.label}
            </AppLink>
          ))}
        </nav>
      ) : null}
    </header>
  );
};

export default Header;
