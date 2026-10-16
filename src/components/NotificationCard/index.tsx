import Icon from '../Icon';
import styles from './styles.native';
import { useRouter, type Href } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useNotificationCard, type NotificationCardProps } from './useNotificationCard';
import { getNotificationCopy, getNotificationHref, getNotificationIcon } from './values';

const NotificationCard = ({ record, onNavigate, idPrefix = `notification-card` }: NotificationCardProps) => {
  const router = useRouter();
  const { palette } = useTheme();
  const card = useNotificationCard(record, onNavigate);
  const cardId = `${idPrefix}-${record.id}`;
  return <Pressable
    nativeID={cardId}
    accessibilityRole='link'
    accessibilityLabel={`${record.title}. ${getNotificationCopy(record)}. ${!card.known ? `Read Status Unavailable` : card.isRead ? `Read` : `Unread`}`}
    onPress={() => { card.open(); router.push(getNotificationHref(record) as Href); }}
    style={[styles.card, { borderBottomColor: palette.border }]}
  >
    <View nativeID={`${cardId}-icon`} style={[styles.icon, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name={getNotificationIcon(record)} size={19} color={palette.primary} /></View>
    <View nativeID={`${cardId}-copy`} style={styles.copy}>
      <View style={styles.titleRow}><Text nativeID={`${cardId}-title`} style={[styles.title, { color: palette.text }]}>{record.title}</Text>{card.known && !card.isRead ? <View nativeID={`${cardId}-unread-dot`} style={[styles.unreadDot, { backgroundColor: palette.primary }]} /> : null}</View>
      <Text nativeID={`${cardId}-body`} style={[styles.body, { color: palette.muted }]}>{getNotificationCopy(record)}</Text>
    </View>
    <Icon name='external' size={15} color={palette.primary} />
  </Pressable>;
};

export default NotificationCard;
