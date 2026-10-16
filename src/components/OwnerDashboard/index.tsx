import Icon from '../Icon';
import styles from './styles.native';
import AccountLayout from '../AccountLayout';
import Svg, { Circle } from 'react-native-svg';
import { useRouter, type Href } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import { useTheme } from '../../shared/themeContext/useTheme';
import { reportContent, useOwnerDashboard, type ReportKind, type OwnerDashboardPage, type OwnerDashboardProps } from './useOwnerDashboard';

const ReportPanel = ({ kind, page, compact = false }: { kind: ReportKind; page: OwnerDashboardPage; compact?: boolean }) => {
  const { palette } = useTheme();
  const content = reportContent[kind];
  const panelId = `dashboard-report-${kind}`;
  return <View nativeID={panelId} style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
    <View nativeID={`${panelId}-heading`} style={styles.heading}><View style={styles.headingCopy}><Icon name={content.icon} size={19} color={palette.gold} /><Text nativeID={`${panelId}-title`} accessibilityRole='header' style={[styles.panelTitle, { color: palette.text }]}>{content.title}</Text></View><Text nativeID={`${panelId}-availability`} style={[styles.badge, { color: palette.muted, borderColor: palette.border }]}>Unavailable</Text></View>
    {!compact ? <>
      <View nativeID='analytics-period-controls' style={styles.switch}>{([7, 30, 90] as const).map((days) => <Pressable key={days} nativeID={`analytics-period-${days}`} accessibilityRole='button' accessibilityState={{ selected: page.period === days }} onPress={() => page.setPeriod(days)} style={[styles.switchButton, { backgroundColor: page.period === days ? palette.panel : `transparent` }]}><Text style={[styles.buttonText, { color: palette.text }]}>{days} Days</Text></Pressable>)}</View>
      <View nativeID='analytics-presentation-controls' style={styles.switch}>{([`chart`, `list`] as const).map((mode) => <Pressable key={mode} nativeID={`analytics-presentation-${mode}`} accessibilityRole='button' accessibilityState={{ selected: page.presentation === mode }} onPress={() => page.setPresentation(mode)} style={[styles.switchButton, { backgroundColor: page.presentation === mode ? palette.panel : `transparent` }]}><Icon name={mode === `chart` ? `chart` : `book`} size={14} color={palette.gold} /><Text style={[styles.buttonText, { color: palette.text }]}>{mode === `chart` ? `Chart` : `List`}</Text></Pressable>)}</View>
      <Text nativeID='analytics-filter-note' style={[styles.small, { color: palette.muted }]}>Layout Preview · No Report Requested</Text>
      <View nativeID='analytics-dimension-controls' style={styles.switch}>{content.dimensions.map((dimension, index) => <Pressable key={dimension} nativeID={`analytics-dimension-${index}`} accessibilityRole='button' accessibilityState={{ selected: page.dimension === dimension }} onPress={() => page.selectDimension(dimension)} style={[styles.switchButton, { backgroundColor: page.dimension === dimension ? palette.panel : `transparent` }]}><Text style={[styles.buttonText, { color: palette.text }]}>{dimension}</Text></Pressable>)}</View>
    </> : null}
    <View nativeID={`${panelId}-metrics`} style={styles.reportKpis}>{content.metrics.map((label, index) => <View key={label} nativeID={`${panelId}-kpi-${index}`} style={styles.reportKpi}><Text style={[styles.small, { color: palette.muted }]}>{label}</Text><Text accessibilityLabel='Unavailable' style={[styles.metricValue, { color: palette.text }]}>—</Text></View>)}</View>
    <View nativeID={`${panelId}-empty`} style={[styles.empty, { borderColor: palette.border }]}><Icon name={content.icon} size={24} color={palette.gold} /><View style={styles.flexCopy}><Text nativeID={`${panelId}-empty-title`} style={[styles.emptyTitle, { color: palette.text }]}>{compact ? `${content.title} Unavailable` : `${page.dimension}: Report Unavailable`}</Text><Text nativeID={`${panelId}-empty-description`} style={[styles.copy, { color: palette.muted }]}>{content.detail}</Text>{!compact && page.presentation === `list` ? <Text nativeID={`${panelId}-empty-list`} style={[styles.small, { color: palette.muted }]}>No report loaded. This is not a zero-record result.</Text> : null}</View></View>
    <View nativeID={`${panelId}-footer`} style={[styles.reportFooter, { borderColor: palette.border }]}><Text style={[styles.small, { color: palette.muted }]}>{content.source} · Not Connected</Text>{!compact ? <Text style={[styles.small, { color: palette.muted }]}>{page.period}-Day Preview · No Report Fetched</Text> : null}</View>
  </View>;
};

const CatalogCharts = ({ page }: { page: OwnerDashboardPage }) => {
  const { palette } = useTheme();
  const colors = { Confirmed: palette.gold, Suggested: palette.primary, Unconfirmed: palette.muted };
  return <View nativeID='dashboard-catalog-charts' style={styles.charts}>
    {page.catalogError ? <Text nativeID='dashboard-catalog-error' accessibilityRole='alert' style={[styles.copy, { color: palette.error }]}>{page.catalogError}</Text> : null}
    <View nativeID='dashboard-worlds' style={[styles.chartPanel, styles.worldPanel, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.heading}><Text nativeID='dashboard-worlds-title' accessibilityRole='header' style={[styles.panelTitle, { color: palette.text }]}>Archive by World</Text><Text style={[styles.small, { color: palette.muted }]}>Spell(s)</Text></View>
      {page.catalogReady && page.worlds.length ? <View nativeID='dashboard-worlds-chart' style={styles.worldChart}>{page.worlds.map((world, index) => <View key={world.id} nativeID={`dashboard-world-${world.id}`} style={styles.worldRow}><Text nativeID={`dashboard-world-${world.id}-label`} style={[styles.copy, { color: palette.muted }]}>{world.label}</Text><View style={styles.barRow}><View nativeID={`dashboard-world-${world.id}-track`} style={[styles.barTrack, { backgroundColor: palette.panel }]}><View nativeID={`dashboard-world-${world.id}-bar`} style={[styles.bar, { width: `${world.percent}%`, backgroundColor: index % 3 === 0 ? palette.gold : index % 3 === 1 ? palette.primary : palette.muted }]} /></View><Text nativeID={`dashboard-world-${world.id}-value`} style={[styles.barValue, { color: palette.text }]}>{world.count}</Text></View></View>)}</View> : <Text style={[styles.chartEmpty, { color: palette.muted }]}>{!page.catalogReady ? `Catalog Unavailable` : `No Spells in the Catalog`}</Text>}
      <Text nativeID='dashboard-worlds-coverage' style={[styles.small, { color: palette.muted }]}>{page.catalogCoverage}</Text>
    </View>
    <View nativeID='dashboard-etymology' style={[styles.chartPanel, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.heading}><Text nativeID='dashboard-etymology-title' accessibilityRole='header' style={[styles.panelTitle, { color: palette.text }]}>Etymology Status</Text><Text style={[styles.small, { color: palette.muted }]}>Catalog Distribution</Text></View>
      {page.catalogReady && page.totalSpells ? <View nativeID='dashboard-etymology-chart' style={styles.distribution}>
        <View accessible accessibilityRole='image' accessibilityLabel={`Etymology Distribution: ${page.etymologies.map((item) => `${item.label} ${item.count}`).join(`, `)}`} nativeID='dashboard-etymology-donut' style={styles.donut}>
          <Svg nativeID='dashboard-etymology-rings' width={132} height={132} viewBox='0 0 132 132' style={styles.donutRings}><Circle cx={66} cy={66} r={52} fill='none' stroke={palette.panel} strokeWidth={14} />{page.etymologies.filter((item) => item.count > 0).map((item) => <Circle key={item.id} id={`dashboard-etymology-segment-${item.id}`} cx={66} cy={66} r={52} fill='none' strokeWidth={14} stroke={colors[item.label]} rotation={-90} origin='66,66' strokeDasharray={[item.percent / 100 * 326.726, 326.726]} strokeDashoffset={-item.offset / 100 * 326.726} />)}</Svg>
          <Text style={[styles.donutValue, { color: palette.text }]}>{page.totalSpells}</Text><Text style={[styles.small, { color: palette.muted }]}>Spell(s)</Text>
        </View>
        <View nativeID='dashboard-etymology-legend' style={styles.legend}>{page.etymologies.map((item) => <View key={item.id} nativeID={`dashboard-etymology-${item.id}`} style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: colors[item.label] }]} /><Text style={[styles.legendLabel, { color: palette.muted }]}>{item.label}</Text><Text style={[styles.barValue, { color: palette.text }]}>{item.count}</Text></View>)}</View>
      </View> : <Text style={[styles.chartEmpty, { color: palette.muted }]}>{!page.catalogReady ? `Catalog Unavailable` : `No Spells in the Catalog`}</Text>}
      <Text nativeID='dashboard-etymology-coverage' style={[styles.small, { color: palette.muted }]}>Current catalog classifications · Dated activity history unavailable</Text>
    </View>
  </View>;
};

const OwnerDashboard = (props: OwnerDashboardProps) => {
  const page = useOwnerDashboard(props);
  const router = useRouter();
  const { palette } = useTheme();
  return <AccountLayout section='admin' title={page.title} eyebrow={`Admin · ${page.title}`}>
    {page.owner ? <View nativeID='dashboard-workspace' style={styles.stack}>
      {page.view !== `overview` ? <ReportPanel page={page} kind={page.report} /> : <>
        <ReportPanel compact page={page} kind='traffic' />
        <ReportPanel compact page={page} kind='health' />
        <CatalogCharts page={page} />
        <View nativeID='dashboard-summary' style={styles.counts}>{page.metrics.map((metric) => <Pressable key={metric.id} nativeID={`dashboard-metric-${metric.id}`} accessibilityRole='link' accessibilityLabel={`${metric.label}: ${metric.value ?? `Unavailable`}. ${metric.detail}`} onPress={() => router.push(metric.href as Href)} style={[styles.count, { borderColor: palette.border, backgroundColor: palette.surface }]}><Icon name={metric.icon} color={palette.gold} size={15} /><Text nativeID={`dashboard-metric-${metric.id}-label`} style={[styles.countLabel, { color: palette.muted }]}>{metric.label}</Text><Text nativeID={`dashboard-metric-${metric.id}-value`} style={[styles.countValue, { color: palette.text }]}>{metric.value ?? `—`}</Text><Icon name='arrow-right' color={palette.gold} size={13} /></Pressable>)}</View>
        <View nativeID='dashboard-account-status' style={styles.accountStatus}><Text nativeID='dashboard-account-coverage' accessibilityLiveRegion='polite' accessibilityRole={page.snapshot?.state === `error` || page.snapshot?.state === `denied` ? `alert` : undefined} style={[styles.small, styles.statusCopy, { color: page.snapshot?.state === `error` || page.snapshot?.state === `denied` ? palette.error : palette.muted }]}>{page.snapshot?.message ?? `Loading the Private Account Directory`}</Text><Pressable nativeID='dashboard-accounts-reload' accessibilityRole='button' accessibilityState={{ disabled: !page.snapshot || page.snapshot.state === `loading` }} disabled={!page.snapshot || page.snapshot.state === `loading`} onPress={page.retry} style={[styles.switchButton, { backgroundColor: palette.panel, opacity: !page.snapshot || page.snapshot.state === `loading` ? .5 : 1 }]}><Icon name='refresh' size={14} color={palette.gold} /><Text style={[styles.buttonText, { color: palette.text }]}>Reload Accounts</Text></Pressable></View>
      </>}
    </View> : null}
  </AccountLayout>;
};

export default OwnerDashboard;
