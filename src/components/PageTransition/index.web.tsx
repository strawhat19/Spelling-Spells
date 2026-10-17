import './styles.scss';
import { usePageTransition } from './usePageTransition';

const PageTransition = () => {
  const phase = usePageTransition();
  return phase === `idle` ? null : <div id='page-transition' aria-hidden='true' className={`page-transition is-${phase}`}><span id='page-transition-bar' className='page-transition-bar' /></div>;
};

export default PageTransition;
