import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  page: { gap: 22, padding: 24 },
  eyebrow: { fontSize: 10, fontWeight: `700`, letterSpacing: 2 },
  title: { fontSize: 37, fontFamily: `Georgia`, letterSpacing: -.7 },
  description: { fontSize: 15, lineHeight: 25 },
  search: { gap: 10, padding: 13, borderWidth: 1, borderRadius: 12, flexDirection: `row`, alignItems: `center` },
  input: { flex: 1, paddingVertical: 3, fontSize: 14 },
  filters: { gap: 15 },
  filterGroup: { gap: 8 },
  filterName: { fontSize: 12, fontWeight: `600` },
  choices: { gap: 7, flexDirection: `row`, flexWrap: `wrap` },
  choice: { padding: 9, borderWidth: 1, borderRadius: 99 },
  choiceText: { fontSize: 11, fontWeight: `500` },
  toolbar: { gap: 12, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between`, flexWrap: `wrap` },
  toolbarText: { fontSize: 13 },
  action: { gap: 5, paddingVertical: 8, flexDirection: `row`, alignItems: `center` },
  actionText: { fontSize: 12, fontWeight: `600` },
  cards: { gap: 16 },
  empty: { gap: 16, padding: 25, borderWidth: 1, borderRadius: 18, alignItems: `center` },
  emptyTitle: { fontSize: 23, fontFamily: `Georgia`, textAlign: `center` },
  emptyCopy: { fontSize: 14, lineHeight: 23, textAlign: `center` },
});
