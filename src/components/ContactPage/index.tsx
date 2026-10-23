import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import PageMetadata from '../PageMetadata';
import { useContactPage } from './useContactPage';
import { contactLimits } from '../../shared/contacts/values';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, TextInput, Pressable, ActivityIndicator } from 'react-native';

const fields = [
  { key: `name`, label: `Your Name`, hint: `What should we call you?` },
  { key: `email`, label: `Email Address`, hint: `A contact address for your request` },
  { key: `subject`, label: `Subject`, hint: `A few words about your message` },
  { key: `message`, label: `Your Message`, hint: `Include a spell name, source, or page link when useful` },
] as const;

const ContactPage = () => {
  const router = useRouter();
  const { palette } = useTheme();
  const fieldRefs = useRef<Partial<Record<typeof fields[number][`key`], TextInput | null>>>({});
  const { input, busy, errors, error, receipt, allowed, loading, editable, configured, update, submit, retryAccess, accessMessage } = useContactPage();

  useEffect(() => {
    const field = fields.find((item) => errors[item.key]);
    if (field) fieldRefs.current[field.key]?.focus();
  }, [errors]);

  if (!allowed) return <View nativeID='contact-page' style={styles.page}><PageMetadata title='Contact' canonicalPath='/contact' description='Contact Spelling Spells' /><View nativeID='contact-heading' style={styles.heading}><Text nativeID='contact-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{`Contact`}</Text><Text nativeID='contact-access-message' accessibilityLiveRegion='polite' style={[styles.intro, { color: palette.muted }]}>{accessMessage}</Text><Pressable nativeID='contact-access-reload' accessibilityRole='button' onPress={retryAccess} style={[styles.submit, { backgroundColor: palette.gold }]}><Icon name='refresh' size={17} color={palette.background} /><Text style={styles.submitText}>{`Reload Access`}</Text></Pressable></View></View>;

  return (
    <View nativeID='contact-page' style={styles.page}>
      <PageMetadata title='Contact' canonicalPath='/contact' description='Send Spelling Spells a private message about the spellbook, a correction, credit, or support.' />
      <View nativeID='contact-heading' style={styles.heading}>
        <View style={styles.kicker}><Icon name='mail' size={18} color={palette.gold} /><Text style={[styles.kickerText, { color: palette.gold }]}>A CONVERSATION BEYOND THE SPELLBOOK</Text></View>
        <Text nativeID='contact-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}>A little note. A new connection.</Text>
        <Text style={[styles.intro, { color: palette.muted }]}>Have a question, a correction, or a story worth sharing? Leave a message for the people behind Spelling Spells.</Text>
      </View>
      <View nativeID='contact-form' style={[styles.form, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text style={[styles.step, { color: palette.muted }]}>01 / YOUR MESSAGE</Text>
        <Text nativeID='contact-form-title' accessibilityRole='header' style={[styles.subtitle, { color: palette.text }]}>Leave a little ink.</Text>
        <Text style={[styles.hint, { color: palette.muted }]}>No account needed. Your message stays private.</Text>
        {!configured ? <View nativeID='contact-unavailable' style={[styles.feedback, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='lock' size={19} color={palette.error} /><View style={styles.feedbackCopy}><Text accessibilityLiveRegion='polite' style={[styles.feedbackTitle, { color: palette.error }]}>Contact Unavailable</Text><Text style={[styles.hint, { color: palette.muted }]}>Messages cannot be saved right now. Please try again later.</Text></View></View> : null}
        {fields.map((field) => (
          <View key={field.key} nativeID={`contact-field-${field.key}`} style={styles.field}>
            <Text nativeID={`contact-${field.key}-label`} style={[styles.label, { color: palette.text }]}>{field.label} *</Text>
            <TextInput
              ref={(ref) => { fieldRefs.current[field.key] = ref; }}
              nativeID={`contact-${field.key}`}
              value={input[field.key]}
              editable={editable}
              multiline={field.key === `message`}
              accessibilityLabel={`${field.label}, Required`}
              accessibilityHint={errors[field.key] ?? field.hint}
              accessibilityState={{ disabled: !editable }}
              autoCorrect={field.key !== `email`}
              autoCapitalize={field.key === `email` ? `none` : `sentences`}
              autoComplete={field.key === `email` ? `email` : field.key === `name` ? `name` : `off`}
              keyboardType={field.key === `email` ? `email-address` : `default`}
              maxLength={contactLimits[field.key]}
              onChangeText={(value) => update(field.key, value)}
              style={[styles.input, field.key === `message` && styles.textarea, { color: palette.text, backgroundColor: palette.background, borderColor: errors[field.key] ? palette.error : palette.border }]}
            />
            <Text nativeID={`contact-${field.key}-hint`} style={[styles.hint, { color: palette.muted }]}>{field.hint}</Text>
            {errors[field.key] ? <Text nativeID={`contact-${field.key}-error`} accessibilityRole='alert' style={[styles.hint, { color: palette.error }]}>{errors[field.key]}</Text> : null}
          </View>
        ))}
        <View nativeID='contact-website-field' pointerEvents='none' accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={styles.honeypot}><TextInput nativeID='contact-website' value={input.website} editable={false} accessible={false} /></View>
        <Pressable nativeID='contact-submit' accessibilityRole='button' accessibilityState={{ disabled: !editable, busy }} disabled={!editable} onPress={() => void submit()} style={[styles.submit, { backgroundColor: palette.gold, opacity: editable ? 1 : .6 }]}>{busy ? <ActivityIndicator size='small' color='#20134D' /> : <Icon name='mail' size={18} color='#20134D' />}<Text style={styles.submitText}>{busy ? `Saving Message…` : loading ? `Getting Ready…` : `Send Message`}</Text><Icon name='arrow' size={16} color='#20134D' /></Pressable>
        <Text style={[styles.hint, { color: palette.muted }]}>Required fields are marked *. Please leave passwords and other private credentials out of your message.</Text>
        {error ? <View nativeID='contact-save-error' accessibilityRole='alert' style={[styles.feedback, { backgroundColor: palette.panel, borderColor: palette.border }]}><Icon name='shield' size={19} color={palette.error} /><View style={styles.feedbackCopy}><Text style={[styles.feedbackTitle, { color: palette.error }]}>Message Not Confirmed</Text><Text style={[styles.hint, { color: palette.muted }]}>{error}</Text><Text style={[styles.hint, { color: palette.muted }]}>Your entries are still here. You can retry.</Text></View></View> : null}
        {receipt ? <View nativeID='contact-save-success' accessibilityLiveRegion='polite' style={[styles.feedback, { backgroundColor: palette.panel, borderColor: palette.border }]}><Icon name='check' size={22} color={palette.gold} /><View style={styles.feedbackCopy}><Text style={[styles.feedbackTitle, { color: palette.text }]}>Message Saved</Text><Text style={[styles.hint, { color: palette.muted }]}>Thank you. Your message was received and is stored privately for review.</Text></View></View> : null}
      </View>
      <View nativeID='contact-guidance' style={styles.guidance}>
        <View style={[styles.seal, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='spark' size={31} color={palette.gold} /></View>
        <Text style={[styles.step, { color: palette.muted }]}>A NOTE FROM THE ARCHIVE</Text>
        <Text nativeID='contact-guidance-title' accessibilityRole='header' style={[styles.subtitle, { color: palette.text }]}>Every good story starts with a word.</Text>
        <Text style={[styles.hint, { color: palette.muted }]}>Questions about an entry, a missing credit, or something that feels out of place are all welcome here.</Text>
        <View nativeID='contact-reference-tip' style={[styles.tip, { borderColor: palette.border }]}><Icon name='book' size={20} color={palette.gold} /><View style={styles.tipCopy}><Text style={[styles.label, { color: palette.text }]}>Keep the source close.</Text><Text style={[styles.hint, { color: palette.muted }]}>For corrections, include the spell’s exact name and a link or reference to the original work.</Text></View></View>
        <View nativeID='contact-privacy-tip' style={[styles.tip, { borderColor: palette.border }]}><Icon name='shield' size={20} color={palette.gold} /><View style={styles.tipCopy}><Text style={[styles.label, { color: palette.text }]}>A private conversation.</Text><Text style={[styles.hint, { color: palette.muted }]}>Your message is for the site owner to review. It will not appear in the public spellbook.</Text></View></View>
        {([{ href: `/about`, label: `About the Project`, icon: `book` }, { href: `/guidelines`, label: `Editorial Guidelines`, icon: `edit` }, { href: `/privacy`, label: `Privacy Policy`, icon: `shield` }] as const).map((link) => <Pressable key={link.href} nativeID={`contact-link-${link.href.slice(1)}`} accessibilityRole='link' onPress={() => router.push(link.href)} style={styles.link}><Icon name={link.icon} size={16} color={palette.primary} /><Text style={[styles.linkText, { color: palette.primary }]}>{link.label}</Text><Icon name='arrow' size={15} color={palette.primary} /></Pressable>)}
      </View>
    </View>
  );
};

export default ContactPage;
