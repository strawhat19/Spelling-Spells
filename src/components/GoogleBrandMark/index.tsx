import { googleBrandPaths } from './paths';
import Svg, { Path } from 'react-native-svg';

const GoogleBrandMark = () => (
  <Svg
    width={20}
    height={20}
    accessible={false}
    viewBox='0 0 48 48'
    nativeID='auth-google-mark'
    accessibilityElementsHidden
    importantForAccessibility='no-hide-descendants'
  >
    {googleBrandPaths.map((path) => <Path key={path.fill} {...path} />)}
  </Svg>
);

export default GoogleBrandMark;
