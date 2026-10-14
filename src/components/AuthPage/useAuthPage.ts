import { useAuth } from '../../shared/authContext';

export type AuthPageProps = { mode?: `signin` | `signup` };

export const useAuthPage = ({ mode = `signin` }: AuthPageProps) => {
  const { account, loading, status, message } = useAuth();
  const isSignUp = mode === `signup`;
  return {
    mode,
    account,
    loading,
    message,
    isSignUp,
    unavailable: status === `unavailable`,
    title: isSignUp ? `Begin your next chapter.` : `Welcome back, word wanderer.`,
    formTitle: isSignUp ? `Create your account` : `Sign in to your grimoire`,
    subtitle: isSignUp
      ? `A place for your favorite spells, new discoveries, and a little everyday wonder.`
      : `Every spell you love. Every world you wander. A little magic, all in one place.`,
  };
};
