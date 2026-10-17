export const navigation = [
  { href: `/about`, icon: `info`, label: `About` },
  { href: `/spells`, icon: `book`, label: `Spells` },
  { href: `/worlds`, icon: `globe`, label: `Worlds` },
  { href: `/pronunciation`, icon: `audio`, label: `Pronunciation` },
  { href: `/submit`, icon: `edit`, label: `Contribute` },
  { href: `/contact`, icon: `mail`, label: `Contact` },
];

export const footerNavigation = [
  { href: `/about`, label: `About` },
  { href: `/help`, label: `Help` },
  { href: `/guidelines`, label: `Editorial Guidelines` },
  { href: `/terms`, label: `Terms` },
  { href: `/contact`, label: `Contact` },
  { href: `/privacy`, label: `Privacy Policy` },
];

export const routeAliases = {
  '/login': `/signin`,
  '/sign-in': `/signin`,
  '/register': `/signup`,
  '/sign-up': `/signup`,
  '/alerts': `/notifications`,
  '/notification': `/notifications`,
  '/about-us': `/about`,
  '/contact-us': `/contact`,
  '/privacy-policy': `/privacy`,
  '/terms-of-service': `/terms`,
};

export type AccountRoute = {
  href: string;
  icon: string;
  label: string;
  parent?: string;
  access: 'account' | 'owner';
  section: 'account' | 'admin';
};

export const accountNavigation: AccountRoute[] = [
  { href: `/profile`, icon: `user`, label: `Profile`, access: `account`, section: `account` },
  { href: `/profile/connections`, icon: `link`, label: `Connections`, parent: `/profile`, access: `account`, section: `account` },
  { href: `/submissions`, icon: `edit`, label: `My Submissions`, parent: `/profile`, access: `account`, section: `account` },
  { href: `/dashboard`, icon: `dashboard`, label: `Dashboard`, access: `owner`, section: `admin` },
  { href: `/users`, icon: `user`, label: `Users`, access: `owner`, section: `admin` },
  { href: `/admin/notifications`, icon: `bell`, label: `Notifications`, access: `owner`, section: `admin` },
  { href: `/health`, icon: `shield`, label: `Health`, access: `owner`, section: `admin` },
  { href: `/analytics`, icon: `chart`, label: `Analytics`, access: `owner`, section: `admin` },
  { href: `/feedback`, icon: `edit`, label: `Feedback`, access: `owner`, section: `admin` },
  { href: `/contacts`, icon: `mail`, label: `Contacts`, parent: `/feedback`, access: `owner`, section: `admin` },
  { href: `/review`, icon: `shield`, label: `Requests`, parent: `/feedback`, access: `owner`, section: `admin` },
];

export const getAccountRoute = (pathname: string) => accountNavigation.find((route) => route.href === pathname);

export const safeReturnPath = (value: string | string[] | undefined): string => {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !path.startsWith(`/`) || path.startsWith(`//`) || /[\\\s]/.test(path)) return `/profile`;
  const allowed = [`/`, `/saved`, `/submit`, `/notifications`, ...navigation.map((route) => route.href), ...accountNavigation.map((route) => route.href)];
  return allowed.includes(path) ? path : `/profile`;
};
