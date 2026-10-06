import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  card: { gap: 14, padding: 22, borderWidth: 1, borderRadius: 22 },
  featured: { padding: 24, borderRadius: 24 },
  compact: { padding: 18, gap: 11 },
  top: { gap: 10, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between` },
  origin: { flex: 1, fontSize: 11, fontWeight: `600`, letterSpacing: .4 },
  save: { padding: 8, borderRadius: 99 },
  title: { fontSize: 32, fontFamily: `Georgia`, letterSpacing: -.7 },
  titleFeatured: { fontSize: 42 },
  pronunciation: { fontSize: 14, lineHeight: 22 },
  definition: { fontSize: 14, lineHeight: 23 },
  letters: { gap: 4, flexDirection: `row`, flexWrap: `wrap` },
  letter: { width: 29, height: 32, borderWidth: 1, borderRadius: 6, textAlign: `center`, textAlignVertical: `center`, fontSize: 19, fontFamily: `Georgia` },
  ratings: { gap: 14, paddingTop: 14, borderTopWidth: 1, flexDirection: `row` },
  rating: { flex: 1, gap: 6 },
  ratingLabel: { fontSize: 10, letterSpacing: .3 },
  ratingValue: { fontSize: 12, fontWeight: `600` },
  footer: { gap: 8, flexDirection: `row`, justifyContent: `space-between`, alignItems: `center` },
  category: { flex: 1, fontSize: 11 },
  open: { gap: 5, paddingVertical: 6, flexDirection: `row`, alignItems: `center` },
  openText: { fontSize: 12, fontWeight: `700` },
});
