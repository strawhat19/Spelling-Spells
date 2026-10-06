import { getGlyph, type IconProps } from './glyphs';

const Icon = ({ name, size = 20, color, className = `` }: IconProps) => (
  <svg
    fill='none'
    width={size}
    height={size}
    strokeWidth='1.7'
    viewBox='0 0 24 24'
    aria-hidden='true'
    focusable='false'
    strokeLinecap='round'
    strokeLinejoin='round'
    stroke={color ?? `currentColor`}
    className={`app-icon icon-${name} ${className}`}
  >
    <path d={getGlyph(name)} />
  </svg>
);

export default Icon;
export { Icon };
