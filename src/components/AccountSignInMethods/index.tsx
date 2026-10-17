import Icon from '../Icon';
import { View } from 'react-native';
import styles from './styles.native';
import GoogleBrandMark from '../GoogleBrandMark';
import { useTheme } from '../../shared/themeContext/useTheme';
import { getAccountSignInMethods, type AccountSignInMethodsProps } from './methods';

const AccountSignInMethods = ({ id, providers }: AccountSignInMethodsProps) => {
  const { palette } = useTheme();
  return <View nativeID={id} style={styles.methods}>
    {getAccountSignInMethods(providers).map((method) => <View
      accessible
      key={method.id}
      style={styles.method}
      accessibilityRole='image'
      nativeID={`${id}-${method.id}`}
      accessibilityLabel={method.label}
    >
      {method.id === `google` ? <GoogleBrandMark size={15} id={`${id}-${method.id}-mark`} /> : <Icon size={15} name={method.id === `email` ? `mail` : `shield`} color={method.id === `email` ? palette.primary : palette.muted} />}
    </View>)}
  </View>;
};

export default AccountSignInMethods;
