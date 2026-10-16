import { useState } from 'react';
import { useOwnerRecords } from '../OwnerRecords/useOwnerRecords';

export type OwnerDashboardProps = { view?: `overview` | `analytics` };
export type ReportKind = `traffic` | `health`;

export const reportContent = {
  traffic: {
    title: `Traffic`,
    icon: `chart`,
    label: `Understand the archive’s visitors`,
    detail: `Visitor and page-view reports will appear here after an authorized analytics source is connected.`,
    source: `Web Analytics`,
    metrics: [`Visitors`, `Page views`, `Top source`],
    dimensions: [`Overview`, `Daily`, `Countries`, `Sources`, `Pages`, `Devices`],
  },
  health: {
    title: `Health`,
    icon: `shield`,
    label: `A clear view of service health`,
    detail: `Runtime requests, errors, and latency need a protected reporting service. No runtime measurements are available.`,
    source: `Runtime provider`,
    metrics: [`Requests`, `Errors`, `Latency`],
    dimensions: [`Compute`, `Memory`, `Requests`, `Latency`, `Routes`, `Statuses`, `Cache`],
  },
};

export const useOwnerDashboard = ({ view = `overview` }: OwnerDashboardProps) => {
  const auth = useOwnerRecords(`users`, view === `overview`);
  const owner = auth.permitted;
  const ready = owner && auth.snapshot?.state === `ready`;
  const records = ready ? auth.snapshot?.records ?? null : null;
  const metrics = [
    { id: `accounts`, label: `Accounts on this page`, icon: `user`, value: records?.length ?? null, status: ready ? `Server confirmed` : `Unavailable`, detail: `Newest 50 accounts; not a global total` },
    { id: `active`, label: `Active on this page`, icon: `shield`, value: records?.filter((record) => record.active).length ?? null, status: ready ? `Server confirmed` : `Unavailable`, detail: `Status within the loaded account page` },
    { id: `session`, label: `Current session`, icon: `user`, value: owner ? auth.account?.role ?? null : null, status: owner ? `Verified email` : `Unavailable`, detail: `Current account's trusted role` },
  ];
  const setupRequirements = [
    { id: `authentication`, title: `Current sign-in`, copy: `A confirmed Supabase session and private account are required.`, icon: `user`, status: auth.status === `signed-in` && auth.source === `server` ? `Session confirmed` : `Sign-in required` },
    { id: `owner`, title: `Trusted Owner access`, copy: `Privileges come from the protected account record.`, icon: `shield`, status: owner ? `Owner confirmed` : `Owner required` },
    { id: `records`, title: `Private account data`, copy: `Directory reads enforce Owner access through row-level security.`, icon: `bookmark`, status: ready ? `Page loaded` : auth.snapshot?.state === `error` ? `Read failed` : `Awaiting confirmed read` },
    { id: `reporting`, title: `Protected reporting`, copy: `Traffic, runtime and submission reports need separate services.`, icon: `chart`, status: `Unavailable` },
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
    owner,
    metrics,
    setupRequirements,
    view,
    report,
    setReport,
    period,
    setPeriod,
    dimension,
    presentation,
    setPresentation,
    selectDimension,
    content: reportContent[report],
    accountSource: view === `analytics` ? `Reporting unavailable` : ready ? `Account page loaded` : owner ? `Account page pending` : `Owner access required`,
    title: view === `analytics` ? `Archive analytics` : `The archive, at a glance.`,
  };
};
