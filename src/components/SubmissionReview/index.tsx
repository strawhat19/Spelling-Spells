import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import AccountLayout from '../AccountLayout';
import { useSubmissionReview } from './useSubmissionReview';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';

const SubmissionReview = ({ review = false }: { review?: boolean }) => {
  const router = useRouter();
  const { palette } = useTheme();
  const { account, loading, permitted, result } = useSubmissionReview(review);
  return (
    <AccountLayout section={review ? `admin` : `account`} eyebrow={review ? `Editorial desk` : `Your contributions`} title={review ? `Every word deserves a second look.` : `A little knowledge, shared carefully.`}>
      <View nativeID={review ? `review-submissions` : `my-submissions`} style={styles.page}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Icon name={review ? `shield` : `edit`} size={30} color={palette.gold} />
          {loading ? <ActivityIndicator accessibilityLabel='Checking Account Access' color={palette.gold} /> : null}
          <Text accessibilityRole='header' style={[styles.heading, { color: palette.text }]}>{loading ? `Checking account access…` : !permitted ? account ? `This account does not have access` : `Sign in to view this` : `The review service is not connected yet`}</Text>
          <Text style={[styles.body, { color: palette.muted }]}>{permitted ? result?.message ?? `No submission service is connected.` : review ? `Only a trusted, verified Owner can read the queue or make publication decisions. There is no local role override.` : `Your private account history is separate from the local draft. Nothing is uploaded automatically.`}</Text>
          {!account && !loading ? <Pressable nativeID='submission-signin' accessibilityRole='link' style={[styles.button, { backgroundColor: palette.gold }]} onPress={() => router.push({ pathname: `/signin`, params: { returnTo: review ? `/review` : `/submissions` } })}><Icon name='user' size={17} color='#20134D' /><Text style={styles.buttonText}>Sign In</Text></Pressable> : null}
        </View>
        <View style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <Text style={[styles.kicker, { color: palette.gold }]}>WORKFLOW PREVIEW · NO LIVE DATA</Text>
          <Text accessibilityRole='header' style={[styles.heading, { color: palette.text }]}>Prepare. Review. Publish.</Text>
          <Text style={[styles.body, { color: palette.muted }]}>A sourced suggestion is checked for clarity, accuracy, and attribution before it can become part of the archive. No live queue is available. This is not a zero-record report.</Text>
          <Text style={[styles.body, { color: palette.muted }]}>Review actions remain unavailable until account connection and trusted server permissions are ready.</Text>
          <Pressable nativeID='submission-prepare-draft' accessibilityRole='link' onPress={() => router.push(`/submit`)} style={[styles.button, { backgroundColor: palette.surface }]}><Icon name='edit' size={17} color={palette.text} /><Text style={[styles.buttonText, { color: palette.text }]}>Prepare a Draft</Text></Pressable>
        </View>
      </View>
    </AccountLayout>
  );
};


export default SubmissionReview;
