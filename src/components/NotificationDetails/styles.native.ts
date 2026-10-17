import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  page: { gap: 26, padding: 24 },
  back: { gap: 8, paddingVertical: 5, flexDirection: `row`, alignItems: `center` },
  article: { gap: 20, padding: 24, borderWidth: 1, borderRadius: 17 },
  emblem: { width: 72, height: 72, borderWidth: 1, borderRadius: 36, alignItems: `center`, justifyContent: `center` },
  eyebrow: { marginTop: 7, fontSize: 9, letterSpacing: 1.5 },
  title: { fontSize: 36, lineHeight: 43, fontFamily: `Georgia` },
  body: { fontSize: 14, lineHeight: 28 },
  small: { fontSize: 10, lineHeight: 18 },
  buttonText: { fontSize: 11, fontWeight: `500` },
  metadataValue: { fontSize: 12 },
  metadataItem: { gap: 8 },
  loadingBody: { gap: 12, width: `100%`, paddingVertical: 8 },
  loadingContent: { gap: 20, width: `100%` },
  loadingLabel: { position: `absolute`, width: 1, height: 1, overflow: `hidden` },
  metadata: { gap: 22, paddingVertical: 22, borderTopWidth: 1, borderBottomWidth: 1, flexDirection: `row`, flexWrap: `wrap` },
  actions: { gap: 8, flexDirection: `row`, flexWrap: `wrap` },
  button: { gap: 7, minHeight: 38, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderRadius: 7, flexDirection: `row`, alignItems: `center` },
  empty: { gap: 20, paddingVertical: 40, alignItems: `center` },
});
