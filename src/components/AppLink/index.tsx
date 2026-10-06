import { Link, type Href } from 'expo-router';
import { Text } from 'react-native';
import type { AnchorHTMLAttributes } from 'react';

export type AppLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

const AppLink = ({ href, id, children, 'aria-label': label }: AppLinkProps) => (
  <Link href={href as Href} accessibilityLabel={label}>
    <Text nativeID={id}>{children}</Text>
  </Link>
);

export default AppLink;
export { AppLink };
