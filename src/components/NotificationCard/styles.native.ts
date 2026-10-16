import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  copy: { flex: 1, minWidth: 0, gap: 8 },
  body: { fontSize: 12, lineHeight: 21 },
  title: { flexShrink: 1, fontSize: 22, lineHeight: 28, fontFamily: `Georgia` },
  titleRow: { gap: 8, flexDirection: `row`, alignItems: `center` },
  unreadDot: { width: 6, height: 6, borderRadius: 3 },
  card: { gap: 13, paddingVertical: 20, borderBottomWidth: 1, flexDirection: `row`, alignItems: `flex-start` },
  icon: { width: 36, height: 36, borderWidth: 1, borderRadius: 18, alignItems: `center`, justifyContent: `center` },
});
