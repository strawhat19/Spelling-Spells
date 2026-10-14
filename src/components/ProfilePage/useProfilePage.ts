import { useAuth } from '../../shared/authContext';
import { useTheme } from '../../shared/themeContext/useTheme';
import { canAccessAccount, getAccountAvatar } from '../../shared/authentication/types';

export type ProfilePageProps = { view?: `profile` | `connections` };

export const connectionRequirements = [
  { id: `identity`, icon: `user`, name: `Account identity`, detail: `Google and email sign-in through a verified authentication provider.`, status: `Not connected` },
  { id: `sync`, icon: `bookmark`, name: `Cross-device collection`, detail: `Private account-scoped spell bookmarks and preferences.`, status: `Not connected` },
  { id: `contributions`, icon: `edit`, name: `Your contributions`, detail: `Confirmed submissions and their private review history.`, status: `Not connected` },
];

export const useProfilePage = ({ view = `profile` }: ProfilePageProps) => {
  const auth = useAuth();
  const theme = useTheme();
  return {
    ...auth,
    ...theme,
    view,
    avatarUrl: getAccountAvatar(auth.account),
    allowed: !auth.loading && canAccessAccount(auth.account),
    title: view === `connections` ? `Private connections` : `Your profile`,
    description: view === `connections` ? `A private home for your account services. Your credentials never belong in a public profile.` : `A little about you, and the way you explore the archive.`,
  };
};
