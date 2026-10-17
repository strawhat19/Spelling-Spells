import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  page: { gap: 28, padding: 24 },
  heading: { gap: 18 },
  copy: { fontSize: 13, lineHeight: 23 },
  small: { fontSize: 10, lineHeight: 18 },
  headingCopy: { gap: 7 },
  title: { fontSize: 42, lineHeight: 48, fontFamily: `Georgia` },
  sectionTitle: { fontSize: 25, lineHeight: 31, fontFamily: `Georgia` },
  eyebrow: { fontSize: 10, fontWeight: `600`, letterSpacing: 1.5 },
  eyebrowRow: { gap: 8, flexDirection: `row`, alignItems: `center` },
  updates: { gap: 16, padding: 20, borderWidth: 1, borderRadius: 16 },
  toolbar: { gap: 17, flexDirection: `row`, flexWrap: `wrap`, alignItems: `center`, justifyContent: `space-between` },
  actions: { gap: 8, flexDirection: `row`, flexWrap: `wrap` },
  buttonText: { fontSize: 11, fontWeight: `500` },
  button: { gap: 7, minHeight: 38, borderWidth: 1, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9, flexDirection: `row`, alignItems: `center` },
  empty: { gap: 13, paddingVertical: 40, alignItems: `center` },
  skeletonCopy: { flex: 1, minWidth: 0, gap: 10 },
  skeletonRow: { gap: 13, paddingVertical: 20, borderBottomWidth: 1, flexDirection: `row`, alignItems: `flex-start` },
  loadingLabel: { position: `absolute`, width: 1, height: 1, overflow: `hidden` },
  footer: { gap: 5, borderTopWidth: 1, paddingTop: 18 },
});
