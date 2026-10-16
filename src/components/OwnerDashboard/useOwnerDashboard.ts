import { useState } from 'react';
import { useSpells } from '../../shared/spellsContext';
import { useOwnerRecords } from '../OwnerRecords/useOwnerRecords';

export type OwnerDashboardProps = { view?: `overview` | `analytics` };
export type ReportKind = `traffic` | `health`;

export const reportContent = {
  traffic: {
    icon: `chart`,
    title: `Traffic`,
    source: `Web Analytics`,
    detail: `Visitor and page-view reports are unavailable until an authorized analytics source is connected.`,
    metrics: [`Visitors`, `Page Views`, `Top Source`],
    dimensions: [`Overview`, `Daily`, `Countries`, `Sources`, `Pages`, `Devices`],
  },
  health: {
    icon: `shield`,
    title: `Health`,
    source: `Runtime Provider`,
    detail: `Runtime requests, errors and latency are unavailable until a protected reporting service is connected.`,
    metrics: [`Requests`, `Errors`, `Latency`],
    dimensions: [`Compute`, `Memory`, `Requests`, `Latency`, `Routes`, `Statuses`, `Cache`],
  },
};

export const useOwnerDashboard = ({ view = `overview` }: OwnerDashboardProps) => {
  const catalog = useSpells();
  const auth = useOwnerRecords(`users`, view === `overview`);
  const owner = auth.permitted;
  const ready = owner && auth.snapshot?.state === `ready`;
  const records = ready ? auth.snapshot?.records ?? null : null;
  const catalogReady = catalog.ready && (!catalog.error || catalog.spells.length > 0);
  const totalSpells = catalogReady ? catalog.spells.length : null;
  const worldCounts = new Map<string, number>();
  catalog.spells.forEach((spell) => worldCounts.set(spell.worldId, (worldCounts.get(spell.worldId) ?? 0) + 1));
  const worlds = [...worldCounts].map(([id, count]) => ({
    id,
    count,
    label: catalog.worlds.find((world) => world.id === id)?.name ?? id,
    percent: totalSpells ? count / totalSpells * 100 : 0,
  })).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  let offset = 0;
  const etymologies = ([`Confirmed`, `Suggested`, `Unconfirmed`] as const).map((label) => {
    const count = catalog.spells.filter((spell) => spell.etymologyStatus === label).length;
    const percent = totalSpells ? count / totalSpells * 100 : 0;
    const segment = { label, count, percent, offset, id: label.toLowerCase() };
    offset += percent;
    return segment;
  });
  const metrics = [
    { id: `spells`, icon: `book`, href: `/spells`, label: `Spells`, value: totalSpells, detail: `Bundled catalog` },
    { id: `worlds`, icon: `globe`, href: `/worlds`, label: `Worlds`, value: catalogReady ? worlds.length : null, detail: `Worlds represented in the catalog` },
    { id: `accounts`, icon: `user`, href: `/users`, label: `Accounts on Page`, value: records?.length ?? null, detail: `Newest 50 accounts; not a global total` },
    { id: `active`, icon: `shield`, href: `/users`, label: `Active on Page`, value: records?.filter((record) => record.active).length ?? null, detail: `Active status within the loaded page` },
  ];
  const [report, setReportState] = useState<ReportKind>(`traffic`);
  const [dimension, setDimension] = useState(`Overview`);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [presentation, setPresentation] = useState<`chart` | `list`>(`chart`);
  const setReport = (next: ReportKind) => {
    setReportState(next);
    setDimension(reportContent[next].dimensions[0]);
  };
  const selectDimension = (next: string) => {
    if (reportContent[report].dimensions.includes(next)) setDimension(next);
  };
  return {
    ...auth,
    view,
    owner,
    worlds,
    report,
    period,
    metrics,
    setReport,
    setPeriod,
    dimension,
    etymologies,
    totalSpells,
    presentation,
    catalogReady,
    selectDimension,
    setPresentation,
    content: reportContent[report],
    title: view === `analytics` ? `Analytics` : `Dashboard`,
    catalogError: !catalog.spells.length ? catalog.error : null,
    catalogCoverage: `Bundled spell catalog · Distribution by record, not visitor activity`,
  };
};

export type OwnerDashboardPage = ReturnType<typeof useOwnerDashboard>;