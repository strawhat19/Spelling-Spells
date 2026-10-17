import { StyleSheet } from 'react-native';
import { parchment } from '../SpellCard/styles.native';

export default StyleSheet.create({
  root: { gap: 7 },
  face: { position: `relative` },
  stage: { paddingBottom: 20, position: `relative` },
  rear: { top: 0, left: 0, right: 0, position: `absolute` },
  cover: { top: 6, left: 0, right: 0, bottom: 6, borderWidth: 1, position: `absolute`, borderColor: parchment.line, backgroundColor: parchment.paper },
  coverFrame: { top: 7, left: 12, right: 12, bottom: 7, borderWidth: 1, position: `absolute`, borderTopWidth: 2, borderBottomWidth: 2, borderColor: `#C5AA7966` },
  disabled: { opacity: .45 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  activeDot: { width: 23, height: 6, borderRadius: 3 },
  emptyText: { padding: 24, fontSize: 14 },
  skeletonPosition: { flex: 1, minWidth: 45, alignItems: `center`, justifyContent: `center` },
  position: { flex: 1, minWidth: 45, fontSize: 11, textAlign: `center` },
  pagination: { gap: 2, flexDirection: `row`, alignItems: `center`, justifyContent: `center` },
  control: { width: 44, height: 44, borderRadius: 22, alignItems: `center`, justifyContent: `center` },
  dotTarget: { width: 44, height: 44, borderRadius: 22, alignItems: `center`, justifyContent: `center` },
  controls: { gap: 6, padding: 4, borderWidth: 1, borderRadius: 12, flexDirection: `row`, alignItems: `center` },
  empty: { gap: 8, padding: 16, minHeight: 80, borderWidth: 1, borderRadius: 14 },
});
