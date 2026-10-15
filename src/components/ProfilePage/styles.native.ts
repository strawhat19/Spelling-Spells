import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  stack: { gap: 18 },
  card: { gap: 17, padding: 23, borderWidth: 1, borderRadius: 14 },
  title: { fontSize: 25, fontFamily: `Georgia` },
  copy: { fontSize: 13, lineHeight: 23 },
  small: { fontSize: 11, lineHeight: 20 },
  label: { fontSize: 11 },
  input: { padding: 12, fontSize: 16, borderWidth: 1, borderRadius: 8 },
  button: { gap: 9, padding: 14, borderRadius: 9, flexDirection: `row`, alignItems: `center`, justifyContent: `center` },
  buttonText: { fontSize: 12, fontWeight: `700`, flexShrink: 1, textAlign: `center` },
  actions: { gap: 10 },
  disabled: { opacity: .55 },
  feedback: { fontSize: 13, lineHeight: 23, marginTop: 18 },
  identity: { gap: 16, flexDirection: `row`, alignItems: `center` },
  identityCopy: { flex: 1, gap: 6 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, overflow: `hidden`, alignItems: `center`, justifyContent: `center` },
  avatarImage: { width: 64, height: 64 },
  avatarInitial: { fontSize: 27, fontFamily: `Georgia` },
});
