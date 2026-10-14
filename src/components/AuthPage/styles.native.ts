import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  page: { gap: 18, padding: 24 },
  eyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: `700` },
  title: { fontSize: 39, lineHeight: 44, fontFamily: `Georgia` },
  copy: { fontSize: 14, lineHeight: 24 },
  notice: { gap: 12, padding: 17, borderWidth: 1, borderRadius: 12, flexDirection: `row` },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 21 },
  form: { gap: 14, padding: 21, borderWidth: 1, borderRadius: 18 },
  formTitle: { fontSize: 25, fontFamily: `Georgia`, marginBottom: 4 },
  switchPrompt: { gap: 10, marginBottom: 6 },
  switchCopy: { fontSize: 12, lineHeight: 20 },
  label: { fontSize: 12, marginTop: 4 },
  input: { padding: 13, fontSize: 15, borderWidth: 1, borderRadius: 9 },
  button: { gap: 10, padding: 15, borderWidth: 1, borderRadius: 9, flexDirection: `row`, alignItems: `center`, justifyContent: `center` },
  googleButton: { borderColor: `#747775`, backgroundColor: `#FFFFFF` },
  googleLabel: { color: `#5F6368`, fontSize: 14, fontWeight: `500` },
  disabled: { opacity: .55 },
  buttonText: { fontSize: 13, fontWeight: `700` },
  link: { gap: 9, paddingVertical: 8, flexDirection: `row`, alignItems: `center`, justifyContent: `center` },
  small: { fontSize: 11, lineHeight: 19, textAlign: `center` },
});
