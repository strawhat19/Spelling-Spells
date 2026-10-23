import Icon from '../Icon';
import Skeleton from '../Skeleton';
import styles from './styles.native';
import AccountLayout from '../AccountLayout';
import { useFocusEffect } from 'expo-router';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useAccountShell } from '../../shared/accountShellContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPlanAmount, planIntervalLabel } from '../../shared/plans/values';
import { formatPlanDate, useOwnerPlans, type OwnerPlansPage } from './useOwnerPlans';
import { Text, View, Modal, Platform, Pressable, TextInput, ScrollView, findNodeHandle, AccessibilityInfo, KeyboardAvoidingView } from 'react-native';

const focusControl = (target: View | TextInput | null) => {
  target?.focus();
  const node = findNodeHandle(target);
  if (node) AccessibilityInfo.setAccessibilityFocus(node);
};

const PlanEditor = ({ page, focused, onDismiss }: { focused: boolean; page: OwnerPlansPage; onDismiss: () => void }) => {
  const insets = useSafeAreaInsets();
  const shell = useAccountShell();
  const firstInput = useRef<TextInput>(null);
  const { palette } = useTheme();
  const editor = page.editor;
  const draft = editor?.draft;
  const close = () => { if (!page.mutating) page.closeEditor(); };
  const fieldStyle = [styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }];
  const fields = editor ? [
    { id: `name`, label: `Name *`, value: editor.draft.name, maximum: 80, note: `` },
    { id: `slug`, label: `Permanent Slug *`, value: editor.draft.slug, maximum: 80, note: editor.record ? `The Saved Slug Cannot Be Changed` : `Lowercase Letters, Numbers And Hyphens` },
    { id: `description`, label: `Description *`, value: editor.draft.description, maximum: 600, note: `` },
    { id: `price`, label: `Price In USD *`, value: editor.price, maximum: 16, note: `0.00 Is Free · Up To Two Decimal Places` },
    { id: `order`, label: `Display Order *`, value: editor.order, maximum: 5, note: `0–10000 · Lower Numbers Appear First` },
    { id: `features`, label: `Features`, value: editor.features, maximum: 2575, note: `One Per Line · Up To 16 Features, 160 Characters Each` },
  ] as const : [];
  return <Modal transparent visible={focused && Boolean(editor) && page.permitted} animationType={shell?.reducedMotion ? `none` : `fade`} onRequestClose={close} onDismiss={onDismiss} onShow={() => { if (focused) focusControl(firstInput.current); }}>
    <KeyboardAvoidingView nativeID='owner-plan-editor-overlay' behavior={Platform.OS === `ios` ? `padding` : undefined} style={[styles.overlay, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}>
      <Pressable nativeID='owner-plan-editor-backdrop' accessible={false} onPress={close} style={styles.backdrop} />
      <View nativeID='owner-plan-editor' accessibilityViewIsModal accessibilityLabel={editor?.record ? `Edit Plan` : `Add Plan`} onAccessibilityEscape={close} style={[styles.editor, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <ScrollView keyboardShouldPersistTaps='handled' contentContainerStyle={styles.editorContent}>
          <View nativeID='owner-plan-editor-heading' style={styles.heading}><Text nativeID='owner-plan-editor-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{editor?.record ? `Edit Plan` : `Add Plan`}</Text><Pressable nativeID='owner-plan-editor-close' accessibilityRole='button' accessibilityLabel='Close Plan Editor' disabled={page.mutating} onPress={close} style={styles.iconButton}><Icon name='close' size={18} color={palette.text} /></Pressable></View>
          {fields.map((field) => <View key={field.id} nativeID={`owner-plan-field-${field.id}`} style={styles.field}><Text nativeID={`owner-plan-label-${field.id}`} style={[styles.label, { color: palette.muted }]}>{field.label}</Text><TextInput
            value={field.value}
            maxLength={field.maximum}
            accessibilityLabel={field.label}
            nativeID={`owner-plan-input-${field.id}`}
            ref={field.id === `name` ? firstInput : undefined}
            multiline={field.id === `description` || field.id === `features`}
            editable={!page.mutating && (field.id !== `slug` || !editor?.record)}
            autoCorrect={field.id === `name` || field.id === `description` || field.id === `features`}
            keyboardType={field.id === `price` ? `decimal-pad` : field.id === `order` ? `number-pad` : `default`}
            autoCapitalize={field.id === `slug` || field.id === `price` || field.id === `order` ? `none` : `sentences`}
            style={[fieldStyle, field.id === `description` && styles.descriptionInput, field.id === `features` && styles.featuresInput]}
            onChangeText={(value) => field.id === `price` || field.id === `order` || field.id === `features` ? page.setEditorText(field.id, value) : page.setDraftField(field.id, value)}
          />{field.note ? <Text nativeID={`owner-plan-hint-${field.id}`} style={[styles.small, { color: palette.muted }]}>{field.note}</Text> : null}</View>)}
          <View nativeID='owner-plan-interval-field' style={styles.field}><Text style={[styles.label, { color: palette.muted }]}>{`Billing Interval`}</Text><View style={styles.actions}>{([{ id: `month`, label: `Monthly` }, { id: `year`, label: `Yearly` }, { id: `one-time`, label: `One-Time` }] as const).map((interval) => <Pressable key={interval.id} nativeID={`owner-plan-interval-${interval.id}`} accessibilityRole='button' accessibilityState={{ selected: draft?.interval === interval.id, disabled: page.mutating }} disabled={page.mutating} onPress={() => page.setDraftField(`interval`, interval.id)} style={[styles.button, { borderColor: draft?.interval === interval.id ? palette.primary : palette.border, backgroundColor: palette.panel }]}><Text style={[styles.buttonText, { color: palette.text }]}>{interval.label}</Text></Pressable>)}</View></View>
          <View nativeID='owner-plan-visibility-field' style={styles.field}><Text style={[styles.label, { color: palette.muted }]}>{`Visibility`}</Text><View style={styles.actions}>{[false, true].map((active) => <Pressable key={String(active)} nativeID={`owner-plan-visibility-${active ? `active` : `inactive`}`} accessibilityRole='button' accessibilityState={{ selected: draft?.active === active, disabled: page.mutating }} disabled={page.mutating} onPress={() => page.setDraftField(`active`, active)} style={[styles.button, { borderColor: draft?.active === active ? palette.primary : palette.border, backgroundColor: palette.panel }]}><Icon name={active ? `check` : `close`} size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{active ? `Published` : `Hidden`}</Text></Pressable>)}</View></View>
          {([{ field: `highlighted`, label: `Highlight This Plan`, icon: `spark` }, { field: `removesAds`, label: `Offer Ad-Free Reading`, icon: `shield` }] as const).map((toggle) => <Pressable key={toggle.field} nativeID={`owner-plan-toggle-${toggle.field}`} accessibilityRole='switch' accessibilityLabel={toggle.label} accessibilityState={{ checked: Boolean(draft?.[toggle.field]), disabled: page.mutating }} disabled={page.mutating} onPress={() => page.setDraftField(toggle.field, !draft?.[toggle.field])} style={[styles.toggle, { borderColor: draft?.[toggle.field] ? palette.primary : palette.border, backgroundColor: palette.panel }]}><Icon name={toggle.icon} size={16} color={palette.gold} /><Text style={[styles.toggleLabel, { color: palette.text }]}>{toggle.label}</Text><Icon name={draft?.[toggle.field] ? `check` : `close`} size={16} color={draft?.[toggle.field] ? palette.primary : palette.muted} /></Pressable>)}
          <Text nativeID='owner-plan-editor-note' style={[styles.copy, { color: palette.muted }]}>{`Published plans appear on the landing page and Pricing. Ad-free reading describes the offer; saving a plan does not start billing or change anyone’s access. Payments are not connected.`}</Text>
          {page.error ? <Text nativeID='owner-plan-editor-error' accessibilityRole='alert' style={[styles.copy, { color: palette.error }]}>{page.error}</Text> : null}
          <View nativeID='owner-plan-editor-actions' style={styles.actions}><Pressable nativeID='owner-plan-editor-cancel' accessibilityRole='button' disabled={page.mutating} onPress={close} style={[styles.button, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='close' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Cancel`}</Text></Pressable><Pressable nativeID='owner-plan-editor-save' accessibilityRole='button' accessibilityState={{ busy: page.mutating, disabled: page.mutating }} disabled={page.mutating} onPress={() => void page.save()} style={[styles.button, { borderColor: palette.gold, backgroundColor: palette.gold }]}><Icon name='save' size={14} color={palette.background} /><Text style={[styles.buttonText, { color: palette.background }]}>{page.mutating ? `Saving` : `Save Plan`}</Text></Pressable></View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
};

const OwnerPlans = () => {
  const page = useOwnerPlans();
  const { palette } = useTheme();
  const addButton = useRef<View>(null);
  const opener = useRef<View | null>(null);
  const editButtons = useRef<Record<string, View | null>>({});
  const editorWasOpen = useRef(false);
  const [focused, setFocused] = useState(false);
  const buttonStyle = [styles.button, { borderColor: palette.border, backgroundColor: palette.panel }];
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  useEffect(() => {
    if (focused && page.permitted && editorWasOpen.current && !page.editor) focusControl(opener.current);
    editorWasOpen.current = Boolean(page.editor);
  }, [focused, page.editor, page.permitted]);
  return <AccountLayout section='admin' title='Plans' eyebrow='Admin · Plans'>
    {page.loading ? <Text nativeID='owner-plans-loading-status' accessibilityLiveRegion='polite' style={styles.loadingAnnouncement}>{`Loading Plans`}</Text> : null}
    <View nativeID='owner-plans' style={styles.stack}>
      <View nativeID='owner-plans-heading' style={styles.heading}><Text nativeID='owner-plans-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{`Plan Catalog`}</Text></View>
      <Text nativeID='owner-plans-coverage' style={[styles.copy, { color: palette.muted }]}>{`Manage Up To ${page.limit} Plans · Search And Filters Cover The Loaded Catalog`}</Text>
      <View nativeID='owner-plans-summary' style={styles.summary}>{[{ id: `total`, label: `Plans`, value: page.plans.length }, { id: `active`, label: `Published`, value: page.activeCount }, { id: `inactive`, label: `Hidden`, value: page.plans.length - page.activeCount }].map((item) => <View key={item.id} nativeID={`owner-plans-summary-${item.id}`} style={[styles.summaryCard, { borderColor: palette.border, backgroundColor: palette.surface }]}><Text style={[styles.small, { color: palette.muted }]}>{item.label}</Text>{page.loading ? <Skeleton id={`owner-plans-summary-${item.id}-skeleton`} width={34} height={26} /> : <Text style={[styles.summaryValue, { color: palette.text }]}>{page.ready ? item.value : `—`}</Text>}</View>)}</View>
      <Text nativeID='owner-plans-billing-note' style={[styles.copy, { color: palette.muted }]}>{`These offers describe your public pricing. Payments and account upgrades are not connected yet.`}</Text>
      {page.error && !page.editor ? <Text nativeID='owner-plans-error' accessibilityRole='alert' style={[styles.copy, { color: palette.error }]}>{page.error}</Text> : null}
      {page.notice ? <Text nativeID='owner-plans-notice' accessibilityRole='alert' style={[styles.copy, { color: palette.primary }]}>{page.notice}</Text> : null}
      <TextInput nativeID='owner-plans-search' accessibilityLabel='Search The Loaded Plan Catalog' editable={!page.loading} value={page.search} onChangeText={page.setSearch} placeholder='Search Plans' placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]} />
      <View nativeID='owner-plans-filter' accessibilityLabel='Plan Visibility Filter' style={styles.actions}>{([{ id: `all`, label: `All Plans` }, { id: `active`, label: `Published` }, { id: `inactive`, label: `Hidden` }] as const).map((filter) => <Pressable key={filter.id} nativeID={`owner-plans-filter-${filter.id}`} accessibilityRole='button' disabled={page.loading} accessibilityState={{ selected: page.filter === filter.id, disabled: page.loading }} onPress={() => page.setFilter(filter.id)} style={[...buttonStyle, { borderColor: page.filter === filter.id ? palette.primary : palette.border, opacity: page.loading ? .5 : 1 }]}><Text style={[styles.buttonText, { color: palette.text }]}>{filter.label}</Text></Pressable>)}</View>
      <View nativeID='owner-plans-actions' style={styles.actions}><Pressable nativeID='owner-plans-reload' accessibilityRole='button' disabled={page.mutating} onPress={page.reload} style={buttonStyle}><Icon name='refresh' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Reload`}</Text></Pressable><Pressable ref={addButton} nativeID='owner-plans-add' accessibilityRole='button' accessibilityState={{ disabled: !page.ready || page.busy || page.plans.length >= page.limit }} disabled={!page.ready || page.busy || page.plans.length >= page.limit} onPress={() => { opener.current = addButton.current; page.edit(); }} style={[styles.button, { borderColor: palette.gold, backgroundColor: palette.gold, opacity: !page.ready || page.busy || page.plans.length >= page.limit ? .5 : 1 }]}><Icon name='plus' size={14} color={palette.background} /><Text style={[styles.buttonText, { color: palette.background }]}>{`Add Plan`}</Text></Pressable></View>
      {page.loading ? <View nativeID='owner-plans-skeletons' accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={styles.stack}>{[0, 1].map((index) => <View key={index} nativeID={`owner-plans-skeleton-card-${index}`} style={[styles.record, { borderColor: palette.border, backgroundColor: palette.surface }]}><Skeleton id={`owner-plans-skeleton-title-${index}`} width='68%' height={18} /><Skeleton id={`owner-plans-skeleton-slug-${index}`} width='45%' height={10} /><Skeleton id={`owner-plans-skeleton-description-${index}`} width='100%' height={11} /><Skeleton id={`owner-plans-skeleton-price-${index}`} width={90} height={24} /><Skeleton id={`owner-plans-skeleton-updated-${index}`} width={112} height={10} /><View style={styles.actionsCell}><Skeleton id={`owner-plans-skeleton-status-${index}`} width={76} height={34} shape='block' /><Skeleton id={`owner-plans-skeleton-edit-${index}`} width={44} height={44} shape='block' /><Skeleton id={`owner-plans-skeleton-delete-${index}`} width={44} height={44} shape='block' /></View></View>)}</View> : page.ready && page.matchingPlans.length ? page.matchingPlans.map((plan) => { const rowId = `owner-plan-${plan.id}`; const saving = page.mutating && page.pendingRow === plan.id; return <View key={plan.id} nativeID={rowId} style={[styles.record, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <View nativeID={`${rowId}-identity`} style={styles.recordHeading}><Icon name={plan.highlighted ? `spark` : `book`} size={20} color={palette.gold} /><Text nativeID={`${rowId}-name`} accessibilityRole='header' style={[styles.recordTitle, { color: palette.text }]}>{`${plan.number}. ${plan.name}`}</Text></View>
        <Text nativeID={`${rowId}-slug`} style={[styles.small, { color: palette.muted }]}>{plan.slug}</Text><Text nativeID={`${rowId}-description`} numberOfLines={3} style={[styles.copy, { color: palette.muted }]}>{plan.description}</Text>
        <Text nativeID={`${rowId}-price`} style={[styles.price, { color: palette.text }]}>{`${formatPlanAmount(plan)} ${planIntervalLabel(plan)}`}</Text><Text nativeID={`${rowId}-features`} style={[styles.small, { color: palette.muted }]}>{`${plan.features.length} Feature(s) · ${plan.removesAds ? `Ad-Free Offer` : `Ad-Supported Offer`}${plan.highlighted ? ` · Highlighted` : ``}`}</Text><Text nativeID={`${rowId}-order`} style={[styles.small, { color: palette.muted }]}>{`Display Order ${plan.displayOrder}`}</Text><Text nativeID={`${rowId}-updated`} style={[styles.small, { color: palette.muted }]}>{`Updated ${formatPlanDate(plan.updatedAt)}`}</Text>
        <View nativeID={`${rowId}-actions`} style={styles.actionsCell}><Pressable nativeID={`${rowId}-status`} accessibilityRole='button' accessibilityLabel={`${plan.active ? `Hide` : `Publish`} ${plan.name}`} accessibilityState={{ selected: plan.active, disabled: page.busy, busy: saving }} disabled={page.busy} onPress={() => void page.changeStatus(plan)} style={[styles.rowStatus, { borderColor: palette.border, backgroundColor: palette.panel }]}><View style={styles.statusDotWrap}><View style={[styles.statusDot, { backgroundColor: plan.active ? `#38a778` : palette.muted }]} /></View><Text style={[styles.statusText, { color: plan.active ? `#38a778` : palette.muted }]}>{saving ? `Saving` : plan.active ? `Published` : `Hidden`}</Text></Pressable><Pressable ref={(element) => { editButtons.current[plan.id] = element; }} nativeID={`${rowId}-edit`} accessibilityRole='button' accessibilityLabel={`Edit ${plan.name}`} disabled={page.busy} onPress={() => { opener.current = editButtons.current?.[plan.id] ?? null; page.edit(plan); }} style={styles.iconButton}><Icon name='settings' size={17} color={palette.primary} /></Pressable><Pressable nativeID={`${rowId}-delete`} accessibilityRole='button' accessibilityLabel={`Delete ${plan.name}`} accessibilityState={{ expanded: page.deletingId === plan.id, disabled: page.busy }} disabled={page.busy} onPress={() => page.requestDelete(plan)} style={styles.iconButton}><Icon name='trash' size={17} color={palette.error} /></Pressable></View>
        {page.deletingId === plan.id ? <View nativeID={`${rowId}-confirmation`} style={[styles.confirmation, { borderColor: palette.error, backgroundColor: palette.panel }]}><Text nativeID={`${rowId}-delete-title`} accessibilityRole='header' style={[styles.copy, { color: palette.text }]}>{`Delete “${plan.name}”?`}</Text><Text nativeID={`${rowId}-delete-description`} style={[styles.small, { color: palette.muted }]}>{`This permanently removes the plan from the catalog and public pricing. It does not cancel subscriptions or change account access.`}</Text><View style={styles.actions}><Pressable nativeID={`${rowId}-confirm-delete`} accessibilityRole='button' disabled={page.busy} onPress={() => void page.remove(plan)} style={buttonStyle}><Icon name='trash' size={14} color={palette.error} /><Text style={[styles.buttonText, { color: palette.error }]}>{saving ? `Deleting` : `Delete`}</Text></Pressable><Pressable nativeID={`${rowId}-cancel-delete`} accessibilityRole='button' disabled={page.busy} onPress={page.cancelDelete} style={buttonStyle}><Icon name='close' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Cancel`}</Text></Pressable></View></View> : null}
      </View>; }) : <Text nativeID='owner-plans-empty' accessibilityLiveRegion='polite' style={[styles.copy, { color: palette.muted }]}>{!page.ready ? page.snapshot?.message ?? `Plans Unavailable` : page.plans.length ? `No Plans Match These Filters` : `No Plans Saved Yet`}</Text>}
      <Text nativeID='owner-plans-results' accessibilityLiveRegion='polite' style={[styles.small, { color: palette.muted }]}>{page.ready ? `${page.matchingPlans.length} Matching Plan(s) · ${page.plans.length} Plan(s) In The Catalog` : `Catalog Counts Unavailable`}</Text>
    </View>
    <PlanEditor page={page} focused={focused} onDismiss={() => { if (focused && page.permitted) focusControl(opener.current); }} />
  </AccountLayout>;
};

export default OwnerPlans;
