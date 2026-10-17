import { Text } from 'react-native';
import type { TextRevealProps } from './types';

const TextReveal = ({ id, text }: TextRevealProps) => <Text nativeID={id}>{text}</Text>;

export default TextReveal;
