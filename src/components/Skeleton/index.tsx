import { View } from 'react-native';
import styles from './styles.native';
import type { SkeletonProps } from './types';
import { useTheme } from '../../shared/themeContext/useTheme';

const Skeleton = ({ id, width = `100%`, height = 12, shape = `line` }: SkeletonProps) => {
  const { palette } = useTheme();
  return <View
    accessible={false}
    nativeID={id}
    accessibilityElementsHidden
    importantForAccessibility='no-hide-descendants'
    style={[styles.base, shape === `circle` ? styles.circle : shape === `block` ? styles.block : null, { width, height, backgroundColor: palette.panel, borderColor: palette.border }]}
  />;
};

export default Skeleton;
