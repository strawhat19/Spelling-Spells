import Svg, { Path } from 'react-native-svg';
import { getGlyph, type IconProps } from './glyphs';

const Icon = ({ name, size = 20, color = `#D8C8F2` }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    accessibilityElementsHidden
    importantForAccessibility='no-hide-descendants'
  >
    <Path
      fill='none'
      stroke={color}
      strokeWidth={1.7}
      d={getGlyph(name)}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

export default Icon;
export { Icon };
