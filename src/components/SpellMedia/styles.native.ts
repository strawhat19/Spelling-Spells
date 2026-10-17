import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  gallery: { gap: 18 },
  item: { gap: 8 },
  caption: { fontSize: 13, lineHeight: 21 },
  credit: { fontSize: 11, lineHeight: 18 },
  linkText: { flexShrink: 1, fontSize: 12, lineHeight: 19, fontWeight: `600` },
  loadingStatus: { width: 1, height: 1, overflow: `hidden`, position: `absolute` },
  image: { ...StyleSheet.absoluteFillObject, width: `100%`, height: `100%` },
  frame: { width: `100%`, borderWidth: 1, borderRadius: 9, overflow: `hidden`, position: `relative` },
  compactFrame: { borderRadius: 4 },
  placeholder: { ...StyleSheet.absoluteFillObject, overflow: `hidden` },
  fallback: { ...StyleSheet.absoluteFillObject, gap: 9, padding: 18, alignItems: `center`, justifyContent: `center` },
  fallbackText: { fontSize: 12, lineHeight: 20, textAlign: `center` },
  link: { gap: 7, minHeight: 44, flexDirection: `row`, alignItems: `center` },
});
