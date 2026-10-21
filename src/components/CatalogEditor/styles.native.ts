import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  page: { gap: 20 },
  field: { gap: 10 },
  records: { gap: 8 },
  actions: { gap: 9, flexDirection: `row`, flexWrap: `wrap` },
  copy: { fontSize: 13, lineHeight: 22 },
  label: { fontSize: 12, fontWeight: `600` },
  heading: { fontSize: 27, fontFamily: `serif` },
  form: { gap: 22, padding: 22, borderWidth: 1, borderRadius: 14 },
  input: { minHeight: 46, padding: 12, borderWidth: 1, borderRadius: 8, fontSize: 14 },
  multiline: { minHeight: 100, textAlignVertical: `top` },
  button: { gap: 8, padding: 11, borderWidth: 1, borderRadius: 8, flexDirection: `row`, alignItems: `center` },
});
