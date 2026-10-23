import { Text } from 'react-native';
import { Link, type Href } from 'expo-router';
import type { AnchorHTMLAttributes } from 'react';
import { publicFeatureForHref } from '../../shared/featureFlags/values';
import { useFeatureFlags } from '../../shared/featureFlags/useFeatureFlags';

export type AppLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

const AppLink = ({ href, id, children, 'aria-label': label }: AppLinkProps) => {
  const features = useFeatureFlags();
  const feature = publicFeatureForHref(href);
  if ((feature === `contact` && !features.contactEnabled) || (feature === `notifications` && !features.notificationsEnabled)) return null;
  return <Link href={href as Href} accessibilityLabel={label}>
    <Text nativeID={id}>{children}</Text>
  </Link>;
};

export default AppLink;
export { AppLink };
