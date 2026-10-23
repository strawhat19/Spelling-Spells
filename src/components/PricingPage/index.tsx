import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import PricingPlans from '../PricingPlans';
import PageMetadata from '../PageMetadata';
import { Text, View, Pressable } from 'react-native';
import { pricingQuestions } from '../PricingPlans/content';
import { useTheme } from '../../shared/themeContext/useTheme';

const PricingPage = () => {
  const router = useRouter();
  const { palette } = useTheme();
  return (
    <View nativeID={`pricing-page`} style={styles.page}>
      <PageMetadata title={`Pricing`} canonicalPath={`/pricing`} description={`Explore Spelling Spells plans. Browse for free or use your account's confirmed access to private collections, personal notes, flashcards and grimoire export.`} />
      <PricingPlans variant={`page`} />
      <View nativeID={`pricing-questions`} style={[styles.questions, { borderColor: palette.border }]}>
        <Text nativeID={`pricing-questions-eyebrow`} style={[styles.eyebrow, { color: palette.muted }]}>A FEW THINGS TO KNOW</Text>
        <Text nativeID={`pricing-questions-title`} accessibilityRole={`header`} style={[styles.title, { color: palette.text }]}>The fine print, without the mystery.</Text>
        {pricingQuestions.map((item, index) => <View key={item.question} nativeID={`pricing-question-${index}`} style={[styles.question, { borderColor: palette.border }]}><Text nativeID={`pricing-question-${index}-title`} accessibilityRole={`header`} style={[styles.questionTitle, { color: palette.text }]}>{item.question}</Text><Text nativeID={`pricing-question-${index}-answer`} style={[styles.answer, { color: palette.muted }]}>{item.answer}</Text></View>)}
        <Pressable nativeID={`pricing-contact`} accessibilityRole={`link`} onPress={() => router.push(`/contact`)} style={styles.contact}><Icon name={`mail`} size={16} color={palette.primary} /><Text nativeID={`pricing-contact-copy`} style={[styles.contactText, { color: palette.primary }]}>Ask a Question</Text><Icon name={`arrow`} size={16} color={palette.primary} /></Pressable>
      </View>
    </View>
  );
};

export default PricingPage;
