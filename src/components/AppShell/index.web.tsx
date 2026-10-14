import type { PropsWithChildren } from 'react';
import Icon from '../Icon';
import PageMetadata from '../PageMetadata';
import Header from '../Header/index.web';
import Footer from '../Footer/index.web';
import { useAppShell } from './useAppShell';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useSpells } from '../../shared/spellsContext/useSpells';
import '../../styles/global.scss';
import './styles.scss';

const AppShell = ({ children, sticky = true }: PropsWithChildren<{ sticky?: boolean }>) => {
  const { theme, error: themeError } = useTheme();
  const { error, dismissError } = useSpells();
  const { pathname, scrolled, showScrollTop, scrollToTop } = useAppShell();

  return (
    <div id='app-shell' data-theme={theme} className={`app-shell theme-${theme} ${pathname === `/` ? `is-home` : ``}`}>
      <PageMetadata
        title='Every Spell Has a Story'
        description='Explore the spelling, pronunciation, origins and effects of famous fictional spells from stories and games.'
      />
      <a id='skip-to-content' className='skip-to-content' href='#main-content'>Skip to Content</a>
      <Header sticky={sticky} scrolled={scrolled} />
      {error || themeError ? (
        <div id='storage-notice' className='storage-notice' role='status'>
          <Icon name='shield' size={18} /><span>{error ?? themeError}</span>
          {error ? <button id='dismiss-storage-notice' type='button' onClick={dismissError} aria-label='Dismiss Storage Notice'><Icon name='close' size={18} /></button> : null}
        </div>
      ) : null}
      <main id='main-content' className='app-main'>{children}</main>
      <Footer />
      <button
        type='button'
        id='scroll-to-top'
        onClick={scrollToTop}
        aria-label='Scroll to Top'
        tabIndex={showScrollTop ? 0 : -1}
        aria-hidden={!showScrollTop}
        className={`scroll-to-top ${showScrollTop ? `is-visible` : ``}`}
      >
        <Icon name='arrow-up' size={21} />
      </button>
    </div>
  );
};

export default AppShell;
