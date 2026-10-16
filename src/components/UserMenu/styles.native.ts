import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  overlay: { flex: 1 },
  identityRow: { gap: 8, flexDirection: `row`, alignItems: `center` },
  initial: { fontSize: 15, fontWeight: `700` },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  name: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 16, fontWeight: `700` },
  email: { flex: 1, minWidth: 0, fontSize: 10, lineHeight: 14 },
  error: { padding: 12, fontSize: 11, lineHeight: 17 },
  optionsContent: { padding: 6 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: `#00000024` },
  itemText: { fontSize: 11, fontWeight: `600` },
  pillText: { minWidth: 0, flexShrink: 1, fontSize: 8, lineHeight: 12, fontWeight: `700` },
  signout: { marginTop: 4, borderTopWidth: 1 },
  item: { gap: 8, minHeight: 44, paddingVertical: 8, paddingHorizontal: 9, borderRadius: 8, flexDirection: `row`, alignItems: `center` },
  heading: { gap: 4, padding: 8, marginBottom: 4, borderBottomWidth: 1 },
  pill: { gap: 4, minHeight: 16, maxWidth: `58%`, flexShrink: 0, borderWidth: 1, borderRadius: 999, paddingVertical: 1, paddingHorizontal: 6, flexDirection: `row`, alignItems: `center` },
  button: { width: 40, height: 40, padding: 1, borderWidth: 1, borderRadius: 20, alignItems: `center`, justifyContent: `center` },
  options: { width: 260, maxWidth: `92%`, position: `absolute`, borderWidth: 1, borderRadius: 14, elevation: 8, shadowColor: `#000`, shadowOpacity: .14, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
});
