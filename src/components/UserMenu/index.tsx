import Icon from '../Icon';
import styles from './styles.native';
import { getAccountAvatar } from '../../shared/authentication/types';
import { useRouter } from 'expo-router';
import { Text, Pressable, Image } from 'react-native';
import { useAuth } from '../../shared/authContext';
import { useTheme } from '../../shared/themeContext/useTheme';

const UserMenu = () => {
  const router = useRouter();
  const { palette } = useTheme();
  const { account, loading } = useAuth();
  const photo = getAccountAvatar(account);
  return <Pressable nativeID='header-account-link' accessibilityRole='link' accessibilityLabel={account ? `Your Profile` : `Sign In`} disabled={loading} onPress={() => router.push(account ? `/profile` : `/signin`)} style={[styles.button, { backgroundColor: palette.panel }]}>
    {account ? photo ? <Image source={{ uri: photo }} style={styles.avatar} /> : <Text style={[styles.initial, { color: palette.gold }]}>{account.displayName.trim().slice(0, 1).toUpperCase() || `A`}</Text> : <Icon name='user' size={19} color={palette.text} />}
  </Pressable>;
};

export default UserMenu;
