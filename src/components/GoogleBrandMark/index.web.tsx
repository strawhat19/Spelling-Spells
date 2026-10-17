import { googleBrandPaths } from './paths';

const GoogleBrandMark = ({ size = 20, id = `auth-google-mark` }: { id?: string; size?: number }) => (
  <svg
    id={id}
    width={size}
    height={size}
    viewBox='0 0 48 48'
    aria-hidden='true'
    focusable='false'
    className='auth-google-mark'
  >
    {googleBrandPaths.map((path) => <path key={path.fill} {...path} />)}
  </svg>
);

export default GoogleBrandMark;
