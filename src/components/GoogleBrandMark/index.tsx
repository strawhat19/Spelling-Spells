import { googleBrandPaths } from './paths';
import Svg, { Path } from 'react-native-svg';

const GoogleBrandMark = ({ size = 20, id = `auth-google-mark` }: { id?: string; size?: number }) => (
  <Svg
    width={size}
    height={size}
    nativeID={id}
    accessible={false}
    viewBox='0 0 48 48'
    accessibilityElementsHidden
    importantForAccessibility='no-hide-descendants'
  >
    {googleBrandPaths.map((path) => <Path key={path.fill} {...path} />)}
  </Svg>
);

export default GoogleBrandMark;
