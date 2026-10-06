import { SvgXml } from 'react-native-svg';
import { logoXml } from './mark';

const BrandLogo = ({ size = 60 }: { size?: number }) => (
  <SvgXml
    width={size}
    height={size}
    xml={logoXml}
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility='no-hide-descendants'
  />
);

export default BrandLogo;
