import { StyleSheet } from 'react-native';
import { themePalettes } from '../../styles/theme/theme';

export const parchment = {
  line: `#C5AA79`,
  body: `#584333`,
  soft: `#6B513B`,
  paper: `#F3E3BF`,
  ink: themePalettes.ivory.text,
  accent: themePalettes.ivory.primary,
};

export default StyleSheet.create({
  card: { gap: 14, padding: 25, paddingVertical: 28 },
  featured: { padding: 28, paddingVertical: 30 },
  compact: { gap: 11, padding: 22, paddingVertical: 26 },
  paper: { top: 6, left: 0, right: 0, bottom: 6, position: `absolute`, backgroundColor: parchment.paper, borderColor: parchment.line, borderLeftWidth: 1, borderRightWidth: 1 },
  frame: { top: 13, left: 12, right: 12, bottom: 13, position: `absolute`, borderWidth: 1, borderColor: `#C5AA7966`, borderTopWidth: 2, borderBottomWidth: 2 },
  paperEdge: { left: 0, right: 0, height: 8, position: `absolute` },
  paperTop: { top: 0 },
  paperBottom: { bottom: 0, transform: [{ rotate: `180deg` }] },
  top: { gap: 10, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between` },
  origin: { flex: 1, fontSize: 11, fontWeight: `600`, letterSpacing: .4, color: parchment.soft },
  save: { width: 40, height: 40, borderWidth: 1, borderRadius: 99, alignItems: `center`, justifyContent: `center`, borderColor: `#6039D82E`, backgroundColor: `#E9DDCC` },
  saveActive: { borderColor: parchment.accent, backgroundColor: parchment.accent },
  saveDisabled: { opacity: .45 },
  title: { fontSize: 32, fontFamily: `Georgia`, letterSpacing: -.7, color: parchment.ink },
  titleFeatured: { fontSize: 42 },
  pronunciation: { fontSize: 14, lineHeight: 22, color: parchment.soft },
  definition: { fontSize: 14, lineHeight: 23, color: parchment.body },
  letters: { gap: 4, flexDirection: `row`, flexWrap: `wrap` },
  letter: { width: 29, height: 32, borderWidth: 1, borderRadius: 3, textAlign: `center`, textAlignVertical: `center`, fontSize: 19, fontFamily: `Georgia`, color: parchment.ink, borderColor: parchment.line, backgroundColor: `#FFF9EA` },
  ratings: { gap: 14, paddingTop: 14, borderTopWidth: 1, flexDirection: `row`, borderTopColor: parchment.line },
  rating: { flex: 1, gap: 6 },
  ratingLabel: { fontSize: 10, letterSpacing: .3, color: parchment.soft },
  ratingValue: { fontSize: 12, fontWeight: `600`, color: parchment.ink },
  footer: { gap: 8, flexWrap: `wrap`, flexDirection: `row`, justifyContent: `space-between`, alignItems: `center` },
  category: { flex: 1, fontSize: 11, color: parchment.soft },
  open: { gap: 5, minHeight: 44, paddingVertical: 6, flexDirection: `row`, alignItems: `center` },
  openText: { fontSize: 12, fontWeight: `700`, color: parchment.accent },
});
