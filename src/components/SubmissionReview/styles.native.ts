import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  page: { gap: 20 },
  card: { gap: 16, padding: 23, borderWidth: 1, borderRadius: 18 },
  heading: { fontSize: 24, fontFamily: `serif`, lineHeight: 30 },
  body: { fontSize: 13, lineHeight: 23 },
  kicker: { fontSize: 10, letterSpacing: 1.2, fontWeight: `700` },
  button: { flexDirection: `row`, alignItems: `center`, gap: 9, padding: 13, borderRadius: 10, alignSelf: `flex-start` },
  buttonText: { fontSize: 13, fontWeight: `700`, color: `#20134D` },
});

