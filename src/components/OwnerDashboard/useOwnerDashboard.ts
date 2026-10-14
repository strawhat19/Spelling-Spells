import { useState } from 'react';
import { useAuth } from '../../shared/authContext';
import { canAccessOwner } from '../../shared/authentication/types';

export type OwnerDashboardProps = { view?: `overview` | `analytics` };
export type ReportKind = `traffic` | `health`;

export const dashboardMetrics = [
  { id: `visitors`, label: `Visitors`, icon: `globe`, value: null, detail: `Website audience` },
  { id: `views`, label: `Page views`, icon: `book`, value: null, detail: `Archive exploration` },
  { id: `contributions`, label: `Submissions`, icon: `edit`, value: null, detail: `Confirmed contributions` },
];

export const setupRequirements = [
  { id: `authentication`, title: `Verified sign-in`, copy: `Connect Google and email authentication.`, icon: `user` },
  { id: `owner`, title: `Trusted Owner access`, copy: `Assign Owner privileges through a trusted server.`, icon: `shield` },
  { id: `records`, title: `Private account data`, copy: `Connect account-scoped storage and access rules.`, icon: `bookmark` },
  { id: `reporting`, title: `Protected reporting`, copy: `Connect authorized analytics and runtime sources.`, icon: `chart` },
];

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
    dimensions: [`Requests`, `Latency`, `Routes`, `Statuses`],
  },
};

export const useOwnerDashboard = ({ view = `overview` }: OwnerDashboardProps) => {
  const auth = useAuth();
  const [report, setReport] = useState<ReportKind>(`traffic`);
  return {
    ...auth,
    view,
    report,
    setReport,
    content: reportContent[report],
    owner: !auth.loading && canAccessOwner(auth.account),
    title: view === `analytics` ? `Archive analytics` : `The archive, at a glance.`,
  };
};
