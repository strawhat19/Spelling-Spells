import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  stack: { gap: 18 },
  card: { gap: 17, padding: 23, borderWidth: 1, borderRadius: 14 },
  title: { fontSize: 25, fontFamily: `Georgia` },
  copy: { fontSize: 13, lineHeight: 23 },
  small: { fontSize: 11, lineHeight: 20 },
  label: { fontSize: 11 },
  input: { padding: 12, fontSize: 16, borderWidth: 1, borderRadius: 8, opacity: .6 },
  button: { gap: 9, padding: 14, borderRadius: 9, flexDirection: `row`, alignItems: `center`, justifyContent: `center` },
  buttonText: { fontSize: 12, fontWeight: `700` },
});
