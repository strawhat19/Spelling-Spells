import './styles.scss';
import Icon from '../Icon';
import AppLink from '../AppLink';
import AccountLayout from '../AccountLayout';
import { reportContent, useOwnerDashboard, type ReportKind, type OwnerDashboardPage, type OwnerDashboardProps } from './useOwnerDashboard';

const ReportPanel = ({ kind, page, compact = false }: { kind: ReportKind; page: OwnerDashboardPage; compact?: boolean }) => {
  const content = reportContent[kind];
  const panelId = `dashboard-report-${kind}`;
  return <section id={panelId} className={`dashboard-report${compact ? ` is-compact` : ``}`} aria-labelledby={`${panelId}-title`}>
    <header id={`${panelId}-heading`} className='dashboard-report-heading'>
      <div id={`${panelId}-heading-copy`} className='dashboard-report-heading-copy'><Icon name={content.icon} size={19} /><h2 id={`${panelId}-title`}>{content.title}</h2></div>
      <span id={`${panelId}-availability`} className='dashboard-availability'>Unavailable</span>
    </header>
    {!compact ? <>
      <div id='analytics-filter-preview' className='dashboard-filter-preview'>
        <div id='analytics-period-controls' className='dashboard-control-group' aria-label='Preview Reporting Period'>{([7, 30, 90] as const).map((days) => <button key={days} id={`analytics-period-${days}`} type='button' aria-pressed={page.period === days} className={page.period === days ? `is-active` : ``} onClick={() => page.setPeriod(days)}>{days} Days</button>)}</div>
        <div id='analytics-presentation-controls' className='dashboard-control-group' aria-label='Report Presentation'>{([`chart`, `list`] as const).map((mode) => <button key={mode} id={`analytics-presentation-${mode}`} type='button' aria-pressed={page.presentation === mode} className={page.presentation === mode ? `is-active` : ``} onClick={() => page.setPresentation(mode)}><Icon name={mode === `chart` ? `chart` : `book`} size={14} />{mode === `chart` ? `Chart` : `List`}</button>)}</div>
        <span id='analytics-filter-note' className='dashboard-filter-note'>Layout Preview · No Report Requested</span>
      </div>
      <div id='analytics-dimension-controls' className='dashboard-dimensions' role='toolbar' aria-label={`${content.title} Report Dimensions`}>
        {content.dimensions.map((dimension, index) => <button key={dimension} id={`analytics-dimension-${index}`} type='button' aria-pressed={page.dimension === dimension} tabIndex={page.dimension === dimension ? 0 : -1} className={page.dimension === dimension ? `is-active` : ``} onClick={() => page.selectDimension(dimension)} onKeyDown={(event) => {
          const last = content.dimensions.length - 1;
          const next = event.key === `Home` ? 0 : event.key === `End` ? last : event.key === `ArrowRight` ? (index + 1) % (last + 1) : event.key === `ArrowLeft` ? (index + last) % (last + 1) : null;
          if (next === null) return;
          event.preventDefault();
          page.selectDimension(content.dimensions[next]);
          document.getElementById(`analytics-dimension-${next}`)?.focus();
        }}>{dimension}</button>)}
      </div>
    </> : null}
    <div id={`${panelId}-content`} className='dashboard-report-content'>
      <dl id={`${panelId}-metrics`} className='dashboard-report-kpis'>{content.metrics.map((label, index) => <div key={label} id={`${panelId}-kpi-${index}`} className='dashboard-report-kpi'><dt id={`${panelId}-kpi-${index}-label`}>{label}</dt><dd id={`${panelId}-kpi-${index}-value`} aria-label='Unavailable'>—</dd></div>)}</dl>
      <div id={`${panelId}-empty`} className='dashboard-empty-report'>
        <Icon name={content.icon} size={25} /><div id={`${panelId}-empty-copy`} className='dashboard-empty-copy'><h3 id={`${panelId}-empty-title`}>{compact ? `${content.title} Unavailable` : `${page.dimension}: Report Unavailable`}</h3><p id={`${panelId}-empty-description`}>{content.detail}</p></div>
        {!compact && page.presentation === `list` ? <div id={`${panelId}-empty-table`} className='dashboard-empty-table'><table id={`${panelId}-table`}><thead><tr><th scope='col'>{page.dimension === `Daily` ? `Date` : `Dimension`}</th><th scope='col'>Measurement</th></tr></thead><tbody><tr><td colSpan={2}>No report loaded. This is not a zero-record result.</td></tr></tbody></table></div> : null}
      </div>
    </div>
    <footer id={`${panelId}-footer`} className='dashboard-report-footer'><span id={`${panelId}-source`}>{content.source} · Not Connected</span>{!compact ? <span id={`${panelId}-period`}>{page.period}-Day Preview · No Report Fetched</span> : null}</footer>
  </section>;
};

const CatalogCharts = ({ page }: { page: OwnerDashboardPage }) => <>
  {page.catalogError ? <p id='dashboard-catalog-error' className='dashboard-data-error' role='alert'>{page.catalogError}</p> : null}
  <div id='dashboard-catalog-charts' className='dashboard-catalog-charts'>
    <section id='dashboard-worlds' className='dashboard-chart-panel' aria-labelledby='dashboard-worlds-title'>
      <header id='dashboard-worlds-heading' className='dashboard-chart-heading'><h2 id='dashboard-worlds-title'>Archive by World</h2><span id='dashboard-worlds-unit'>Spell(s)</span></header>
      {page.catalogReady && page.worlds.length ? <dl id='dashboard-worlds-chart' className='dashboard-world-chart'>{page.worlds.map((world) => <div key={world.id} id={`dashboard-world-${world.id}`} className='dashboard-world-row'><dt id={`dashboard-world-${world.id}-label`}>{world.label}</dt><dd id={`dashboard-world-${world.id}-count`}><span id={`dashboard-world-${world.id}-track`} className='dashboard-world-track' aria-hidden='true'><span id={`dashboard-world-${world.id}-bar`} className='dashboard-world-bar' style={{ width: `${world.percent}%` }} /></span><strong id={`dashboard-world-${world.id}-value`}>{world.count}</strong></dd></div>)}</dl> : <p id='dashboard-worlds-empty' className='dashboard-chart-empty'>{!page.catalogReady ? `Catalog Unavailable` : `No Spells in the Catalog`}</p>}
      <p id='dashboard-worlds-coverage' className='dashboard-chart-note'>{page.catalogCoverage}</p>
    </section>
    <section id='dashboard-etymology' className='dashboard-chart-panel' aria-labelledby='dashboard-etymology-title'>
      <header id='dashboard-etymology-heading' className='dashboard-chart-heading'><h2 id='dashboard-etymology-title'>Etymology Status</h2><span id='dashboard-etymology-unit'>Catalog Distribution</span></header>
      {page.catalogReady && page.totalSpells ? <div id='dashboard-etymology-chart' className='dashboard-distribution'>
        <div id='dashboard-etymology-donut' className='dashboard-donut'><svg id='dashboard-etymology-rings' className='dashboard-donut-rings' viewBox='0 0 132 132' role='img' aria-label={`Etymology Distribution: ${page.etymologies.map((item) => `${item.label} ${item.count}`).join(`, `)}`}><circle className='dashboard-donut-track' cx='66' cy='66' r='52' />{page.etymologies.filter((item) => item.count > 0).map((item) => <circle key={item.id} id={`dashboard-etymology-segment-${item.id}`} className={`dashboard-donut-segment is-${item.id}`} cx='66' cy='66' r='52' strokeDasharray={`${item.percent / 100 * 326.726} 326.726`} strokeDashoffset={-item.offset / 100 * 326.726} />)}</svg><div id='dashboard-etymology-total' className='dashboard-donut-total'><strong>{page.totalSpells}</strong><span>Spell(s)</span></div></div>
        <ul id='dashboard-etymology-legend' className='dashboard-chart-legend'>{page.etymologies.map((item) => <li key={item.id} id={`dashboard-etymology-${item.id}`}><span id={`dashboard-etymology-${item.id}-dot`} className={`dashboard-chart-dot is-${item.id}`} aria-hidden='true' /><span id={`dashboard-etymology-${item.id}-label`}>{item.label}</span><strong id={`dashboard-etymology-${item.id}-value`}>{item.count}</strong></li>)}</ul>
      </div> : <p id='dashboard-etymology-empty' className='dashboard-chart-empty'>{!page.catalogReady ? `Catalog Unavailable` : `No Spells in the Catalog`}</p>}
      <p id='dashboard-etymology-coverage' className='dashboard-chart-note'>Current catalog classifications · Dated activity history unavailable</p>
    </section>
  </div>
</>;

const OwnerDashboard = (props: OwnerDashboardProps) => {
  const page = useOwnerDashboard(props);
  return <AccountLayout section='admin' title={page.title} eyebrow={`Admin · ${page.title}`}>
    {page.owner ? <div id='dashboard-workspace' className='owner-dashboard'>
      {page.view !== `overview` ? <ReportPanel page={page} kind={page.report} /> : <>
        <ReportPanel compact page={page} kind='traffic' />
        <ReportPanel compact page={page} kind='health' />
        <CatalogCharts page={page} />
        <div id='dashboard-summary' className='dashboard-counts'>{page.metrics.map((metric) => <AppLink key={metric.id} id={`dashboard-metric-${metric.id}`} className='dashboard-count' href={metric.href} title={metric.detail} aria-label={`${metric.label}: ${metric.value ?? `Unavailable`}. ${metric.detail}`}><Icon name={metric.icon} size={15} /><span id={`dashboard-metric-${metric.id}-label`}>{metric.label}</span><strong id={`dashboard-metric-${metric.id}-value`}>{metric.value ?? `—`}</strong><Icon name='arrow-right' size={13} /></AppLink>)}</div>
        <div id='dashboard-account-status' className={`dashboard-account-status${page.snapshot?.state === `error` || page.snapshot?.state === `denied` ? ` is-error` : ``}`}><p id='dashboard-account-coverage' role={page.snapshot?.state === `error` || page.snapshot?.state === `denied` ? `alert` : `status`}>{page.snapshot?.message ?? `Loading the Private Account Directory`}</p><button id='dashboard-accounts-reload' type='button' disabled={!page.snapshot || page.snapshot.state === `loading`} onClick={page.retry}><Icon name='refresh' size={14} />Reload Accounts</button></div>
      </>}
    </div> : null}
  </AccountLayout>;
};

export default OwnerDashboard;
