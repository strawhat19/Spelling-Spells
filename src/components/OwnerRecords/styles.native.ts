import { StyleSheet } from 'react-native';
export default StyleSheet.create({
  card: { gap: 16, padding: 23, borderWidth: 1, borderRadius: 16, marginBottom: 20 },
  copy: { fontSize: 13, lineHeight: 23 },
  title: { fontSize: 24, fontFamily: `serif`, lineHeight: 30 },
  record: { gap: 7, paddingVertical: 18, borderTopWidth: 1 },
  recordTitle: { fontSize: 16, fontWeight: `600` },
  pagination: { gap: 16, flexDirection: `row`, flexWrap: `wrap`, alignItems: `center` },
  rowStatus: { gap: 4, flexDirection: `row`, alignItems: `center` },
  statusDotWrap: { width: 16, alignItems: `center` },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11 },
  action: { gap: 9, paddingVertical: 13, alignItems: `center`, flexDirection: `row` },
});
