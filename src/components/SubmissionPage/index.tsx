import Icon from '../Icon';
import styles from './styles.native';
import { useSubmissionPage } from './useSubmissionPage';
import { useTheme } from '../../shared/themeContext/useTheme';
import { draftLimits } from '../../shared/submissions/service';
import type { SubmissionField } from '../../shared/submissions/types';
import { Text, View, Alert, Linking, TextInput, Pressable, ActivityIndicator } from 'react-native';

const fields: { key: SubmissionField; label: string; url?: boolean; multiline?: boolean }[] = [
  { key: `name`, label: `Spell Name *` },
  { key: `world`, label: `Story or World *` },
  { key: `pronunciation`, label: `Pronunciation (Optional)` },
  { key: `definition`, label: `What Does It Do? *`, multiline: true },
  { key: `sourceUrl`, label: `HTTPS Source Link *`, url: true },
  { key: `mediaUrl`, label: `Public Image or Media URL (Optional)`, url: true },
  { key: `notes`, label: `Notes for the Editor (Optional)`, multiline: true },
];

const SubmissionPage = () => {
  const { palette } = useTheme();
  const { draft, loading, busy, dirty, preview, persisted, notice, errors, update, save, clear, showPreview } = useSubmissionPage();
  return (
    <View nativeID='contribution-page' style={styles.page}>
      <Text style={[styles.kicker, { color: palette.gold }]}>ADD A PAGE TO THE ARCHIVE</Text>
      <Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>A good spell starts with a good source.</Text>
      <Text style={[styles.body, { color: palette.muted }]}>Prepare a sourced spell suggestion or correction. Online submissions are not connected yet. Nothing is sent to an editor or published.</Text>
      <View nativeID='contribution-local-status' style={[styles.notice, { backgroundColor: palette.panel, borderColor: palette.border }]}>
        <Icon name='shield' size={19} color={palette.gold} /><Text style={[styles.noticeText, { color: palette.text }]}>{dirty ? `Unsaved Changes` : persisted ? `Draft on This Device` : `Session Draft`} · Not Submitted</Text>
      </View>
      {loading ? <ActivityIndicator accessibilityLabel='Loading Draft' color={palette.gold} /> : (
        <View nativeID='contribution-form' style={[styles.form, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.row}>
            {([`new-spell`, `correction`] as const).map((kind) => (
              <Pressable key={kind} nativeID={`contribution-kind-${kind}`} accessibilityRole='button' accessibilityState={{ selected: draft.kind === kind, disabled: busy }} disabled={busy} onPress={() => update(`kind`, kind)} style={[styles.segment, { backgroundColor: draft.kind === kind ? palette.panel : palette.surface, borderColor: palette.border }]}><Text style={{ color: draft.kind === kind ? palette.gold : palette.text }}>{kind === `new-spell` ? `New Spell` : `Correction`}</Text></Pressable>
            ))}
          </View>
          {fields.map((field) => (
            <View key={field.key} nativeID={`contribution-field-${field.key}`} style={styles.field}>
              <Text style={[styles.label, { color: palette.text }]}>{field.label}</Text>
              <TextInput
                nativeID={`contribution-${field.key}`}
                accessibilityLabel={field.label}
                value={draft[field.key]}
                multiline={field.multiline}
                editable={!busy}
                autoCorrect={!field.url}
                autoCapitalize={field.url ? `none` : `sentences`}
                keyboardType={field.url ? `url` : `default`}
                maxLength={draftLimits[field.key]}
                onChangeText={(text) => update(field.key, text)}
                style={[styles.input, field.multiline && styles.textarea, { color: palette.text, backgroundColor: palette.background, borderColor: errors[field.key] ? palette.error : palette.border }]}
              />
              {field.key === `mediaUrl` ? <Text nativeID='contribution-mediaUrl-hint' style={[styles.hint, { color: palette.muted }]}>A public HTTPS link to an image, video, or other media for this spell</Text> : null}
              {errors[field.key] ? <Text accessibilityRole='alert' style={[styles.hint, { color: palette.error }]}>{errors[field.key]}</Text> : null}
            </View>
          ))}
          <Text style={[styles.hint, { color: palette.muted }]}>Use your own words and prefer primary sources. Mark uncertain pronunciation or origins clearly. Do not include personal information or credentials.</Text>
          <View style={styles.actions}>
            <Pressable nativeID='contribution-preview' accessibilityRole='button' disabled={busy} onPress={showPreview} style={[styles.button, { backgroundColor: palette.gold }]}><Icon name='book' size={17} color='#20134D' /><Text style={styles.buttonText}>Preview Draft</Text></Pressable>
            <Pressable nativeID='contribution-save' accessibilityRole='button' disabled={busy} onPress={() => void save()} style={[styles.button, { backgroundColor: palette.panel }]}><Icon name='bookmark' size={17} color={palette.text} /><Text style={[styles.buttonText, { color: palette.text }]}>{busy ? `Saving…` : `Save Draft`}</Text></Pressable>
          </View>
          <Text style={[styles.hint, { color: palette.muted }]}>Save Draft keeps text on this device only, not in a cloud account.</Text>
        </View>
      )}
      {notice ? <Text nativeID='contribution-feedback' accessibilityLiveRegion='polite' style={[styles.feedback, { color: palette.gold }]}>{notice}</Text> : null}
      {preview ? (
        <View nativeID='contribution-preview-card' style={[styles.preview, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <Text style={[styles.kicker, { color: palette.gold }]}>DRAFT PREVIEW · NOT SUBMITTED</Text>
          <Text accessibilityRole='header' style={[styles.previewTitle, { color: palette.text }]}>{draft.name}</Text>
          <Text style={[styles.label, { color: palette.muted }]}>{draft.world}</Text>
          {draft.pronunciation ? <Text style={[styles.body, { color: palette.text }]}>{draft.pronunciation}</Text> : null}
          <Text style={[styles.body, { color: palette.text }]}>{draft.definition}</Text>
          {draft.notes ? <Text style={[styles.body, { color: palette.muted }]}>{draft.notes}</Text> : null}
          <Pressable nativeID='contribution-preview-source' accessibilityRole='link' onPress={() => void Linking.openURL(draft.sourceUrl.trim()).catch(() => Alert.alert(`Couldn’t Open Source`, `Please try the source link again when you’re connected.`))}><Text style={[styles.sourceLink, { color: palette.gold }]}>View Source ↗</Text></Pressable>
          {draft.mediaUrl.trim() ? <Pressable nativeID='contribution-preview-media' accessibilityRole='link' onPress={() => void Linking.openURL(draft.mediaUrl.trim()).catch(() => Alert.alert(`Couldn’t Open Media`, `Please try the media link again when you’re connected.`))}><Text style={[styles.sourceLink, { color: palette.gold }]}>View Image or Media ↗</Text></Pressable> : null}
          <View style={styles.notice}><Icon name='lock' size={17} color={palette.muted} /><Text style={[styles.noticeText, { color: palette.muted }]}>Online submission is unavailable. Save your draft for later.</Text></View>
        </View>
      ) : null}
      {!loading ? <Pressable nativeID='contribution-clear' accessibilityRole='button' disabled={busy} style={styles.clear} onPress={() => Alert.alert(`Clear This Draft?`, `This removes the saved draft and your current edits on this device.`, [{ text: `Keep Draft`, style: `cancel` }, { text: `Clear Draft`, style: `destructive`, onPress: () => void clear() }])}><Icon name='trash' size={16} color={palette.muted} /><Text style={{ color: palette.muted }}>Clear This Draft</Text></Pressable> : null}
    </View>
  );
};

export default SubmissionPage;
