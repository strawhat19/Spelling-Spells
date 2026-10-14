import { googleBrandPaths } from './paths';

const GoogleBrandMark = () => (
  <svg
    width={20}
    height={20}
    viewBox='0 0 48 48'
    aria-hidden='true'
    focusable='false'
    id='auth-google-mark'
    className='auth-google-mark'
  >
    {googleBrandPaths.map((path) => <path key={path.fill} {...path} />)}
  </svg>
);

export default GoogleBrandMark;
