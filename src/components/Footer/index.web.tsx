import Icon from '../Icon';
import AppLink from '../AppLink';
import BrandLogo from '../BrandLogo';
import { footerNavigation } from '../../shared/routes';
import './styles.scss';

const Footer = () => (
  <footer id='site-footer' className='site-footer'>
    <div id='footer-main' className='footer-main'>
      <div id='footer-brand-block' className='footer-brand-block'>
        <AppLink href='/' id='footer-brand' className='footer-brand'><BrandLogo size={54} /><span>Spelling Spells</span></AppLink>
        <p>A little curiosity. A world of words.</p>
        <p className='footer-attribution'>An independent guide to fictional magic. Stories and spell names belong to their respective creators.</p>
      </div>
      <nav id='footer-explore-navigation' className='footer-nav' aria-label='Explore'>
        <span className='footer-group-label'>Explore the Archive</span>
        <AppLink href='/spells' id='footer-spells'><Icon name='book' size={16} />Spell Index</AppLink>
        <AppLink href='/worlds' id='footer-worlds'><Icon name='globe' size={16} />Story Worlds</AppLink>
        <AppLink href='/saved' id='footer-saved'><Icon name='bookmark' size={16} />Your Spellbook</AppLink>
      </nav>
      <nav id='footer-information-navigation' className='footer-nav' aria-label='Information'>
        <span className='footer-group-label'>Behind the Words</span>
        {footerNavigation.map((item) => <AppLink key={item.href} id={`footer-${item.href.slice(1)}`} href={item.href}>{item.label}</AppLink>)}
      </nav>
    </div>
    <div id='footer-bottom' className='footer-bottom'>
      <span>© {new Date().getFullYear()} Spelling Spells</span>
      <span className='footer-tagline'><Icon name='spark' size={15} />Fiction fuels curiosity</span>
      <a id='footer-piratechs' className='footer-piratechs' href='https://piratechs.com/' target='_blank' rel='noreferrer noopener'>Made by Piratechs<Icon name='external-link' size={14} /></a>
    </div>
  </footer>
);

export default Footer;
