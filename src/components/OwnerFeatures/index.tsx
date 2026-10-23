import Icon from '../Icon';
import Skeleton from '../Skeleton';
import styles from './styles.native';
import AccountLayout from '../AccountLayout';
import { useFocusEffect } from 'expo-router';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useAccountShell } from '../../shared/accountShellContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { featureRoles, managedFeatures, useOwnerFeatures, type OwnerFeaturesPage } from './useOwnerFeatures';
import { Text, View, Modal, Platform, Pressable, TextInput, ScrollView, findNodeHandle, AccessibilityInfo, KeyboardAvoidingView } from 'react-native';

const focusControl = (target: View | TextInput | null) => {
  target?.focus();
  const node = findNodeHandle(target);
  if (node) AccessibilityInfo.setAccessibilityFocus(node);
};

const FeatureEditor = ({ page, focused, onDismiss }: { focused: boolean; page: OwnerFeaturesPage; onDismiss: () => void }) => {
  const shell = useAccountShell();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const firstInput = useRef<TextInput>(null);
  const editor = page.editor;
  const feature = managedFeatures.find((item) => item.key === editor?.key);
  const editorId = `owner-feature-${editor?.key ?? `settings`}-editor`;
  const draft = editor?.draft;
  const close = () => page.closeEditor();
  const buttonStyle = [styles.button, { borderColor: palette.border, backgroundColor: palette.panel }];
  return <Modal transparent visible={focused && Boolean(editor) && page.permitted} animationType={shell?.reducedMotion ? `none` : `fade`} onRequestClose={close} onDismiss={onDismiss} onShow={() => { if (focused) focusControl(firstInput.current); }}>
    <KeyboardAvoidingView nativeID={`${editorId}-overlay`} behavior={Platform.OS === `ios` ? `padding` : undefined} style={[styles.overlay, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}>
      <Pressable nativeID={`${editorId}-backdrop`} accessible={false} disabled={page.mutating} onPress={close} style={styles.backdrop} />
      <View nativeID={editorId} accessibilityViewIsModal accessibilityLabel={`${feature?.name ?? `Feature`} Settings`} onAccessibilityEscape={close} style={[styles.editor, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <ScrollView keyboardShouldPersistTaps='handled' contentContainerStyle={styles.editorContent}>
          <View nativeID={`${editorId}-heading`} style={styles.heading}><View style={styles.identity}><Icon name={feature?.icon ?? `settings`} size={23} color={palette.gold} /><Text nativeID={`${editorId}-title`} accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{feature?.name ?? `Feature Settings`}</Text></View><Pressable nativeID={`${editorId}-close`} accessibilityRole='button' accessibilityLabel={`Close ${feature?.name ?? `Feature`} Settings`} accessibilityState={{ disabled: page.mutating }} disabled={page.mutating} onPress={close} style={styles.iconButton}><Icon name='close' size={18} color={palette.text} /></Pressable></View>
          <View nativeID={`${editorId}-description-field`} style={styles.field}><Text nativeID={`${editorId}-description-label`} style={[styles.label, { color: palette.muted }]}>{`Description`}</Text><TextInput
            multiline
            maxLength={600}
            ref={firstInput}
            value={draft?.description ?? ``}
            editable={!page.mutating}
            accessibilityLabel='Description'
            nativeID={`${editorId}-description`}
            onChangeText={(value) => page.setDraftField(`description`, value)}
            style={[styles.input, styles.descriptionInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
          /></View>
          <View nativeID={`${editorId}-minimum-role-field`} style={styles.field}><Text nativeID={`${editorId}-minimum-role-label`} style={[styles.label, { color: palette.muted }]}>{`Minimum Role`}</Text><View nativeID={`${editorId}-minimum-role-options`} accessibilityLabel='Minimum Role' style={styles.roleOptions}>{featureRoles.map((role) => { const selected = draft?.minimumRole === role; return <Pressable key={role} nativeID={`${editorId}-minimum-role-${role.toLowerCase()}`} accessibilityRole='radio' accessibilityLabel={`${role} Minimum`} accessibilityState={{ checked: selected, disabled: page.mutating }} disabled={page.mutating} onPress={() => page.setDraftField(`minimumRole`, role)} style={[styles.role, { borderColor: selected ? palette.gold : palette.border, backgroundColor: selected ? palette.gold : palette.panel, opacity: page.mutating ? .5 : 1 }]}><Icon name={selected ? `check` : `user`} size={12} color={selected ? palette.background : palette.muted} /><Text style={[styles.buttonText, { color: selected ? palette.background : palette.text }]}>{role}</Text></Pressable>; })}</View><Text nativeID={`${editorId}-minimum-role-note`} style={[styles.small, { color: palette.muted }]}>{`Guest → Member → Subscriber → Developer → Admin → Owner`}</Text></View>
          <View nativeID={`${editorId}-roles-field`} style={styles.field}><Text nativeID={`${editorId}-roles-label`} style={[styles.label, { color: palette.muted }]}>{`Allowed Roles`}</Text><View nativeID={`${editorId}-role-actions`} style={styles.actions}>{[{ id: `all`, label: `All Roles`, roles: null }, { id: `none`, label: `No Roles`, roles: [] }].map((item) => <Pressable key={item.id} nativeID={`${editorId}-roles-${item.id}`} accessibilityRole='button' accessibilityState={{ disabled: page.mutating }} disabled={page.mutating} onPress={() => page.setDraftField(`roles`, item.roles)} style={styles.textButton}><Text style={[styles.buttonText, { color: palette.primary }]}>{item.label}</Text></Pressable>)}</View><View nativeID={`${editorId}-role-options`} style={styles.roleOptions}>{featureRoles.map((role) => { const selected = draft?.roles === null || Boolean(draft?.roles?.includes(role)); return <Pressable key={role} nativeID={`${editorId}-role-${role.toLowerCase()}`} accessibilityRole='checkbox' accessibilityLabel={role} accessibilityState={{ checked: selected, disabled: page.mutating }} disabled={page.mutating} onPress={() => page.toggleRole(role)} style={[styles.role, { borderColor: selected ? palette.gold : palette.border, backgroundColor: selected ? palette.gold : palette.panel, opacity: page.mutating ? .5 : 1 }]}><Icon name={selected ? `check` : `close`} size={12} color={selected ? palette.background : palette.muted} /><Text style={[styles.buttonText, { color: selected ? palette.background : palette.text }]}>{role}</Text></Pressable>; })}</View></View>
          <Text nativeID={`${editorId}-audience-note`} style={[styles.copy, { color: palette.muted }]}>{`Viewers need the minimum role and an allowed role to use this feature. These settings only control the theme button; account permissions stay the same. Everyone else uses dark mode.`}</Text>
          <Text nativeID={`${editorId}-plans-note`} style={[styles.small, { color: palette.muted }]}>{`Plans: Free And Above`}</Text>
          {page.mutationError || page.error ? <Text nativeID={`${editorId}-error`} accessibilityRole='alert' style={[styles.copy, { color: palette.error }]}>{page.mutationError || page.error}</Text> : null}
          <View nativeID={`${editorId}-actions`} style={styles.editorActions}>
            {page.mutationError ? <Pressable nativeID={`${editorId}-discard-reload`} accessibilityRole='button' accessibilityState={{ disabled: page.mutating }} disabled={page.mutating} onPress={page.discardAndReload} style={buttonStyle}><Icon name='refresh' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Discard Draft & Reload`}</Text></Pressable> : null}
            <Pressable nativeID={`${editorId}-cancel`} accessibilityRole='button' accessibilityState={{ disabled: page.mutating }} disabled={page.mutating} onPress={close} style={buttonStyle}><Icon name='close' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Cancel`}</Text></Pressable><Pressable nativeID={`${editorId}-save`} accessibilityRole='button' accessibilityState={{ busy: page.mutating, disabled: page.mutating || !page.ready }} disabled={page.mutating || !page.ready} onPress={() => void page.save()} style={[styles.button, { borderColor: palette.gold, backgroundColor: palette.gold, opacity: page.mutating || !page.ready ? .5 : 1 }]}><Icon name='save' size={14} color={palette.background} /><Text style={[styles.buttonText, { color: palette.background }]}>{page.mutating ? `Saving` : `Save Settings`}</Text></Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
};

const OwnerFeatures = () => {
  const page = useOwnerFeatures();
  const { palette } = useTheme();
  const opener = useRef<{ scope: string; target: View | null } | null>(null);
  const editButtons = useRef<Record<string, View | null>>({});
  const editorWasOpen = useRef({ scope: page.scope, open: false });
  const [focused, setFocused] = useState(false);
  const restoreFocus = () => { if (focused && page.permitted && opener.current?.scope === page.scope) focusControl(opener.current.target); };
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  useEffect(() => {
    if (focused && page.permitted && editorWasOpen.current.scope === page.scope && editorWasOpen.current.open && !page.editor && opener.current?.scope === page.scope) focusControl(opener.current.target);
    editorWasOpen.current = { scope: page.scope, open: Boolean(page.editor) };
  }, [focused, page.scope, page.editor, page.permitted]);
  return <AccountLayout section='admin' title='Features' eyebrow='Admin · Features'>
    <View nativeID='owner-features' accessibilityLabel='Feature Settings' style={styles.stack}>
      <View nativeID='owner-features-toolbar' style={styles.toolbar}><Pressable nativeID='owner-features-reload' accessibilityRole='button' accessibilityState={{ disabled: page.mutating }} disabled={page.mutating} onPress={page.reload} style={[styles.button, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='refresh' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Reload`}</Text></Pressable></View>
      {page.loading ? <Text nativeID='owner-features-loading' accessibilityLiveRegion='polite' style={[styles.small, { color: palette.muted }]}>{`Loading Features`}</Text> : null}
      {(page.error || page.mutationError) && !page.editor ? <Text nativeID='owner-features-error' accessibilityRole='alert' style={[styles.copy, { color: palette.error }]}>{page.mutationError || page.error}</Text> : null}
      {managedFeatures.map((feature, index) => {
        const rowId = `owner-feature-${feature.key}`;
        const policy = page.settings?.features?.[feature.key];
        const unavailable = !page.ready || !policy;
        const saving = page.mutating && page.pendingKey === feature.key;
        const statusColor = unavailable ? palette.error : policy?.enabled ? `#38a778` : palette.muted;
        return <View key={feature.key} nativeID={rowId} style={[styles.record, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <View nativeID={`${rowId}-identity`} style={styles.identity}><Icon name={feature.icon} size={20} color={palette.gold} /><Text nativeID={`${rowId}-name`} accessibilityRole='header' style={[styles.recordTitle, { color: palette.text }]}>{`${index + 1}. ${feature.name}`}</Text></View>
          {page.loading ? <Skeleton id={`${rowId}-description-skeleton`} width='90%' height={13} /> : <Text nativeID={`${rowId}-description`} style={[styles.copy, { color: palette.muted }]}>{policy?.description ?? `Feature Settings Unavailable`}</Text>}
          <View nativeID={`${rowId}-value`} style={styles.rowStatus}><View style={styles.statusDotWrap}><View style={[styles.statusDot, { backgroundColor: statusColor }]} /></View><Text nativeID={`${rowId}-value-label`} accessibilityLiveRegion='polite' style={[styles.statusText, { color: statusColor }]}>{`Value: ${page.loading ? `Loading` : unavailable ? `Unavailable` : saving ? `Saving` : policy?.enabled ? `Enabled` : `Disabled`}`}</Text></View>
          <Text nativeID={`${rowId}-plans`} style={[styles.small, { color: palette.muted }]}>{`Plans: Free And Above`}</Text>
          <View nativeID={`${rowId}-actions`} style={styles.actionsCell}><View nativeID={`${rowId}-segments`} accessibilityLabel={`${feature.name} Value`} style={[styles.segments, { borderColor: palette.border, backgroundColor: palette.panel }]}>{[false, true].map((enabled) => { const selected = !unavailable && policy?.enabled === enabled; const disabled = unavailable || page.busy || Boolean(page.editor); return <Pressable key={String(enabled)} nativeID={`${rowId}-${enabled ? `enable` : `disable`}`} accessibilityRole='button' accessibilityLabel={`${enabled ? `Enable` : `Disable`} ${feature.name}`} accessibilityState={{ selected, busy: saving, disabled }} disabled={disabled} onPress={() => void page.setEnabled(feature.key, enabled)} style={[styles.segment, { backgroundColor: selected ? palette.gold : `transparent`, opacity: disabled ? .5 : 1 }]}><Icon name={enabled ? `check` : `close`} size={12} color={selected ? palette.background : palette.muted} /><Text style={[styles.segmentText, { color: selected ? palette.background : palette.text }]}>{enabled ? `Enable` : `Disable`}</Text></Pressable>; })}</View><Pressable ref={(element) => { editButtons.current[feature.key] = element; }} nativeID={`${rowId}-settings`} accessibilityRole='button' accessibilityLabel={`${feature.name} Settings`} accessibilityState={{ disabled: unavailable || page.busy }} disabled={unavailable || page.busy} onPress={() => { opener.current = { scope: page.scope, target: editButtons.current?.[feature.key] ?? null }; page.edit(feature.key); }} style={[styles.iconButton, { opacity: unavailable || page.busy ? .5 : 1 }]}><Icon name='settings' size={17} color={palette.primary} /></Pressable></View>
        </View>;
      })}
    </View>
    <FeatureEditor page={page} focused={focused} onDismiss={restoreFocus} />
  </AccountLayout>;
};

export default OwnerFeatures;
