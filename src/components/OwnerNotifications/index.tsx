import Icon from '../Icon';
import styles from './styles.native';
import { useRef, useEffect } from 'react';
import AccountLayout from '../AccountLayout';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useAccountShell } from '../../shared/accountShellContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatNotificationDate, notificationStatusLabel, useOwnerNotifications, type OwnerNotificationsPage } from './useOwnerNotifications';
import { Text, View, Modal, Platform, Pressable, TextInput, ScrollView, findNodeHandle, AccessibilityInfo, KeyboardAvoidingView } from 'react-native';

const focusControl = (target: View | TextInput | null) => {
  target?.focus();
  const node = findNodeHandle(target);
  if (node) AccessibilityInfo.setAccessibilityFocus(node);
};

const NotificationEditor = ({ page, onDismiss }: { page: OwnerNotificationsPage; onDismiss: () => void }) => {
  const insets = useSafeAreaInsets();
  const shell = useAccountShell();
  const firstInput = useRef<TextInput>(null);
  const { palette } = useTheme();
  const draft = page.draft;
  const close = () => { if (!page.mutating) page.closeEditor(); };
  const fieldStyle = [styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }];
  const fields = draft ? [
    { id: `title`, label: `Title *`, value: draft.title, maximum: 160 },
    { id: `slug`, label: `URL Slug *`, value: draft.slug, maximum: 120 },
    { id: `body`, label: `Body *`, value: draft.body, maximum: 10_000 },
    { id: `suffix`, label: `Optional Text After The Link`, value: draft.suffix ?? ``, maximum: 80 },
    { id: `linkLabel`, label: `Optional Link Label`, value: draft.linkLabel ?? ``, maximum: 120 },
    { id: `linkUrl`, label: `Optional Link Destination`, value: draft.linkUrl ?? ``, maximum: 2048 },
  ] as const : [];
  return <Modal transparent visible={Boolean(draft) && page.permitted} animationType={shell?.reducedMotion ? `none` : `fade`} onRequestClose={close} onDismiss={onDismiss} onShow={() => focusControl(firstInput.current)}>
    <KeyboardAvoidingView nativeID='owner-notification-editor-overlay' behavior={Platform.OS === `ios` ? `padding` : undefined} style={[styles.overlay, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}>
      <Pressable nativeID='owner-notification-editor-backdrop' accessible={false} onPress={close} style={styles.backdrop} />
      <View nativeID='owner-notification-editor' accessibilityViewIsModal accessibilityLabel={page.editing ? `Edit Notification` : `Add Notification`} onAccessibilityEscape={close} style={[styles.editor, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <ScrollView keyboardShouldPersistTaps='handled' contentContainerStyle={styles.editorContent}>
          <View nativeID='owner-notification-editor-heading' style={styles.heading}><Text nativeID='owner-notification-editor-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{page.editing ? `Edit Notification` : `Add Notification`}</Text><Pressable nativeID='owner-notification-editor-close' accessibilityRole='button' accessibilityLabel='Close Notification Editor' disabled={page.mutating} onPress={close} style={styles.iconButton}><Icon name='close' size={18} color={palette.text} /></Pressable></View>
          {fields.map((field) => <View key={field.id} nativeID={`owner-notification-field-${field.id}`} style={styles.field}><Text nativeID={`owner-notification-label-${field.id}`} style={[styles.label, { color: palette.muted }]}>{field.label}</Text><TextInput
            value={field.value}
            maxLength={field.maximum}
            editable={!page.mutating}
            accessibilityLabel={field.label}
            nativeID={`owner-notification-input-${field.id}`}
            ref={field.id === `title` ? firstInput : undefined}
            autoCorrect={field.id !== `slug` && field.id !== `linkUrl`}
            autoCapitalize={field.id === `slug` || field.id === `linkUrl` ? `none` : `sentences`}
            multiline={field.id === `body` || field.id === `suffix`}
            keyboardType={field.id === `linkUrl` ? `url` : `default`}
            style={[fieldStyle, field.id === `body` && styles.bodyInput, field.id === `suffix` && styles.suffixInput]}
            onChangeText={(value) => page.setDraftField(field.id, field.id === `suffix` || field.id === `linkUrl` || field.id === `linkLabel` ? value || null : value)}
          /></View>)}
          <View nativeID='owner-notification-kind-field' style={styles.field}><Text style={[styles.label, { color: palette.muted }]}>{`Kind`}</Text><View style={styles.actions}>{([`announcement`, `development`] as const).map((kind) => <Pressable key={kind} nativeID={`owner-notification-kind-${kind}`} accessibilityRole='button' accessibilityState={{ selected: draft?.kind === kind, disabled: page.mutating }} disabled={page.mutating} onPress={() => page.setDraftField(`kind`, kind)} style={[styles.button, { borderColor: draft?.kind === kind ? palette.primary : palette.border, backgroundColor: palette.panel }]}><Icon name={kind === `development` ? `edit` : `bell`} size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{kind === `development` ? `Development` : `Announcement`}</Text></Pressable>)}</View></View>
          <View nativeID='owner-notification-status-field' style={styles.field}><Text style={[styles.label, { color: palette.muted }]}>{`Status`}</Text><View style={styles.actions}>{([`draft`, `published`] as const).map((status) => <Pressable key={status} nativeID={`owner-notification-status-${status}`} accessibilityRole='button' accessibilityState={{ selected: draft?.status === status, disabled: page.mutating }} disabled={page.mutating} onPress={() => page.setDraftField(`status`, status)} style={[styles.button, { borderColor: draft?.status === status ? palette.primary : palette.border, backgroundColor: palette.panel }]}><Icon name={status === `published` ? `check` : `close`} size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{notificationStatusLabel(status)}</Text></Pressable>)}</View></View>
          <Text nativeID='owner-notification-editor-note' style={[styles.copy, { color: palette.muted }]}>{`Inactive notifications stay in Admin. Active notifications appear in the bell menu and on the Notifications page.`}</Text>
          {page.error ? <Text nativeID='owner-notification-editor-error' accessibilityRole='alert' style={[styles.copy, { color: palette.error }]}>{page.error}</Text> : null}
          <View nativeID='owner-notification-editor-actions' style={styles.actions}><Pressable nativeID='owner-notification-editor-cancel' accessibilityRole='button' disabled={page.mutating} onPress={close} style={[styles.button, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='close' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Cancel`}</Text></Pressable><Pressable nativeID='owner-notification-editor-save' accessibilityRole='button' accessibilityState={{ busy: page.mutating, disabled: page.mutating }} disabled={page.mutating} onPress={() => void page.save()} style={[styles.button, { borderColor: palette.gold, backgroundColor: palette.gold }]}><Icon name='save' size={14} color={palette.background} /><Text style={[styles.buttonText, { color: palette.background }]}>{page.mutating ? `Saving` : `Save`}</Text></Pressable></View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
};

const OwnerNotifications = () => {
  const page = useOwnerNotifications();
  const { palette } = useTheme();
  const addButton = useRef<View>(null);
  const opener = useRef<View | null>(null);
  const editButtons = useRef<Record<string, View | null>>({});
  const editorWasOpen = useRef(false);
  const buttonStyle = [styles.button, { borderColor: palette.border, backgroundColor: palette.panel }];
  useEffect(() => {
    if (page.permitted && editorWasOpen.current && !page.draft) focusControl(opener.current);
    editorWasOpen.current = Boolean(page.draft);
  }, [page.draft, page.permitted]);
  return <AccountLayout section='admin' title='Notifications' eyebrow='Admin · Notifications'>
    <View nativeID='owner-notifications' style={styles.stack}>
      <View nativeID='owner-notifications-heading' style={styles.heading}><Text nativeID='owner-notifications-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{`Notification Directory`}</Text></View>
      <Text nativeID='owner-notifications-coverage' style={[styles.copy, { color: palette.muted }]}>{`Page ${page.pageNumber} · Search And Filters Apply To This Loaded Page`}</Text>
      <View nativeID='owner-notifications-summary' style={styles.summary}>{[{ id: `total`, label: `On This Page`, value: page.records.length }, { id: `active`, label: `Active`, value: page.activeCount }, { id: `inactive`, label: `Inactive`, value: page.records.length - page.activeCount }].map((item) => <View key={item.id} nativeID={`owner-notifications-summary-${item.id}`} style={[styles.summaryCard, { borderColor: palette.border, backgroundColor: palette.surface }]}><Text style={[styles.small, { color: palette.muted }]}>{item.label}</Text><Text style={[styles.summaryValue, { color: palette.text }]}>{page.ready ? item.value : `—`}</Text></View>)}</View>
      {page.error && !page.draft ? <Text nativeID='owner-notifications-error' accessibilityRole='alert' style={[styles.copy, { color: palette.error }]}>{page.error}</Text> : null}
      {page.notice ? <Text nativeID='owner-notifications-notice' accessibilityRole='alert' style={[styles.copy, { color: palette.primary }]}>{page.notice}</Text> : null}
      <TextInput nativeID='owner-notifications-search' accessibilityLabel='Search Notifications On This Loaded Page' value={page.search} onChangeText={page.setSearch} placeholder='Search This Page' placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]} />
      <View nativeID='owner-notifications-filter' accessibilityLabel='Notification Status Filter' style={styles.actions}>{([{ id: `all`, label: `All Statuses` }, { id: `published`, label: `Active` }, { id: `draft`, label: `Inactive` }] as const).map((filter) => <Pressable key={filter.id} nativeID={`owner-notifications-filter-${filter.id}`} accessibilityRole='button' accessibilityState={{ selected: page.filter === filter.id }} onPress={() => page.setFilter(filter.id)} style={[...buttonStyle, { borderColor: page.filter === filter.id ? palette.primary : palette.border }]}><Text style={[styles.buttonText, { color: palette.text }]}>{filter.label}</Text></Pressable>)}</View>
      <View nativeID='owner-notifications-actions' style={styles.actions}><Pressable nativeID='owner-notifications-reload' accessibilityRole='button' disabled={page.mutating} onPress={page.reload} style={buttonStyle}><Icon name='refresh' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Reload`}</Text></Pressable><Pressable ref={addButton} nativeID='owner-notifications-add' accessibilityRole='button' accessibilityState={{ disabled: !page.ready || page.busy }} disabled={!page.ready || page.busy} onPress={() => { opener.current = addButton.current; page.edit(); }} style={[styles.button, { borderColor: palette.gold, backgroundColor: palette.gold, opacity: !page.ready || page.busy ? .5 : 1 }]}><Icon name='plus' size={14} color={palette.background} /><Text style={[styles.buttonText, { color: palette.background }]}>{`Add Notification`}</Text></Pressable></View>
      {page.ready && page.matchingRecords.length ? page.matchingRecords.map((record) => { const rowId = `owner-notification-${record.id}`; const active = record.status === `published`; return <View key={record.id} nativeID={rowId} style={[styles.record, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <View nativeID={`${rowId}-identity`} style={styles.recordHeading}><Icon name={record.kind === `development` ? `edit` : `bell`} size={20} color={palette.gold} /><Text nativeID={`${rowId}-title`} accessibilityRole='header' style={[styles.recordTitle, { color: palette.text }]}>{`${record.number}. ${record.title}`}</Text></View>
        <Text nativeID={`${rowId}-slug`} style={[styles.small, { color: palette.muted }]}>{record.slug}</Text><Text nativeID={`${rowId}-body`} numberOfLines={3} style={[styles.copy, { color: palette.muted }]}>{record.body}</Text><Text nativeID={`${rowId}-kind`} style={[styles.small, { color: palette.muted }]}>{record.kind === `development` ? `Development` : `Announcement`}</Text><Text nativeID={`${rowId}-updated`} style={[styles.small, { color: palette.muted }]}>{`Updated ${formatNotificationDate(record.updatedAt)}`}</Text>
        <View nativeID={`${rowId}-actions`} style={styles.actionsCell}><Pressable nativeID={`${rowId}-status`} accessibilityRole='button' accessibilityLabel={`${active ? `Deactivate` : `Activate`} ${record.title}`} accessibilityState={{ selected: active, disabled: page.busy }} disabled={page.busy} onPress={() => void page.changeStatus(record)} style={[styles.rowStatus, { borderColor: palette.border, backgroundColor: palette.panel }]}><View style={styles.statusDotWrap}><View style={[styles.statusDot, { backgroundColor: active ? `#38a778` : palette.muted }]} /></View><Text style={[styles.statusText, { color: active ? `#38a778` : palette.muted }]}>{notificationStatusLabel(record.status)}</Text></Pressable><Pressable ref={(element) => { editButtons.current[record.id] = element; }} nativeID={`${rowId}-edit`} accessibilityRole='button' accessibilityLabel={`Edit ${record.title}`} disabled={page.busy} onPress={() => { opener.current = editButtons.current?.[record.id] ?? null; page.edit(record); }} style={styles.iconButton}><Icon name='settings' size={17} color={palette.primary} /></Pressable><Pressable nativeID={`${rowId}-delete`} accessibilityRole='button' accessibilityLabel={`Delete ${record.title}`} accessibilityState={{ expanded: page.deletingId === record.id, disabled: page.busy }} disabled={page.busy} onPress={() => page.requestDelete(record)} style={styles.iconButton}><Icon name='trash' size={17} color={palette.error} /></Pressable></View>
        {page.deletingId === record.id ? <View nativeID={`${rowId}-confirmation`} style={[styles.confirmation, { borderColor: palette.error, backgroundColor: palette.panel }]}><Text accessibilityRole='header' style={[styles.copy, { color: palette.text }]}>{`Delete “${record.title}”?`}</Text><Text style={[styles.small, { color: palette.muted }]}>{`This removes the saved notification from Admin and public pages.`}</Text><View style={styles.actions}><Pressable nativeID={`${rowId}-confirm-delete`} accessibilityRole='button' disabled={page.busy} onPress={() => void page.remove(record)} style={buttonStyle}><Icon name='trash' size={14} color={palette.error} /><Text style={[styles.buttonText, { color: palette.error }]}>{`Delete`}</Text></Pressable><Pressable nativeID={`${rowId}-cancel-delete`} accessibilityRole='button' disabled={page.busy} onPress={page.cancelDelete} style={buttonStyle}><Icon name='close' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Cancel`}</Text></Pressable></View></View> : null}
      </View>; }) : <Text nativeID='owner-notifications-empty' accessibilityLiveRegion='polite' style={[styles.copy, { color: palette.muted }]}>{page.loading ? `Loading Notifications…` : !page.ready ? page.snapshot?.message ?? `Notifications Unavailable` : page.records.length ? `No Notifications Match These Filters` : `No Notifications Saved Yet`}</Text>}
      <View nativeID='owner-notifications-pagination' style={styles.stack}><Text nativeID='owner-notifications-page-label' style={[styles.small, { color: palette.muted }]}>{`Page ${page.pageNumber} · ${page.ready ? page.matchingRecords.length : `—`} Matching Notification(s) On This Loaded Page`}</Text><View style={styles.actions}><Pressable nativeID='owner-notifications-previous' accessibilityRole='button' disabled={!page.hasPrevious || page.busy} onPress={page.previous} style={[...buttonStyle, { opacity: !page.hasPrevious || page.busy ? .5 : 1 }]}><Icon name='back' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Previous`}</Text></Pressable><Pressable nativeID='owner-notifications-next' accessibilityRole='button' disabled={!page.hasNext || page.busy} onPress={page.next} style={[...buttonStyle, { opacity: !page.hasNext || page.busy ? .5 : 1 }]}><Text style={[styles.buttonText, { color: palette.text }]}>{`Next`}</Text><Icon name='arrow' size={14} color={palette.primary} /></Pressable><Pressable nativeID='owner-notifications-latest' accessibilityRole='button' disabled={page.mutating} onPress={page.latest} style={buttonStyle}><Icon name='refresh' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Latest`}</Text></Pressable></View></View>
      {page.ready ? <Text nativeID='owner-notifications-live-status' accessibilityLiveRegion='polite' style={[styles.small, { color: palette.muted }]}>{page.snapshot?.realtime === `subscribed` ? `Listening For Notification Changes` : page.snapshot?.realtime === `connecting` ? `Saved Notifications Loaded · Connecting Updates` : `Saved Notifications Loaded · Live Updates Unavailable`}</Text> : null}
    </View>
    <NotificationEditor page={page} onDismiss={() => focusControl(opener.current)} />
  </AccountLayout>;
};

export default OwnerNotifications;
