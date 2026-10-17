import { useRouter, type Href } from 'expo-router';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { announcePageNavigation, getNavigationKey } from '../../shared/navigation';

export type AppLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

const AppLink = ({ href, onClick, children, ...props }: AppLinkProps) => {
  const router = useRouter();
  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (props.target || !href.startsWith(`/`) || event.currentTarget.hasAttribute(`download`)) return;
    if (!getNavigationKey(href, window.location.href)) return;
    event.preventDefault();
    announcePageNavigation(href);
    router.push(href as Href);
  };

  return <a {...props} href={href} onClick={navigate}>{children}</a>;
};

export default AppLink;
export { AppLink };
