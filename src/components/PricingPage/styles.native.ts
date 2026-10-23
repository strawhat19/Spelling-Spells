import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  page: { gap: 47, padding: 24, paddingTop: 34 },
  questions: { gap: 19, paddingTop: 29, borderTopWidth: 1 },
  eyebrow: { fontSize: 10, fontWeight: `700`, letterSpacing: 1.7 },
  title: { fontSize: 32, lineHeight: 40, fontFamily: `Georgia`, letterSpacing: -.6 },
  question: { gap: 10, borderTopWidth: 1, paddingTop: 21, marginTop: 5 },
  questionTitle: { fontSize: 22, lineHeight: 29, fontFamily: `Georgia` },
  answer: { fontSize: 14, lineHeight: 25 },
  contact: { gap: 8, minHeight: 44, flexDirection: `row`, alignItems: `center` },
  contactText: { fontSize: 13, fontWeight: `700` },
});
