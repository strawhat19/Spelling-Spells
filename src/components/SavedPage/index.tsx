import { Redirect } from 'expo-router';
import CatalogPage from '../CatalogPage';
import PageMetadata from '../PageMetadata';
import { useAuth } from '../../shared/authContext';
import AccountGate from '../AccountLayout/AccountGate';
import { canAccessAccount } from '../../shared/authentication/types';

const SavedPage = () => {
  const auth = useAuth();
  if (auth.loading || auth.status === `loading`) return <>
    <PageMetadata noIndex title='Saved spells' description='Your private account collection of saved spells.' />
    <AccountGate returnTo='/saved' />
  </>;
  if (auth.status !== `signed-in` || !canAccessAccount(auth.account)) return <Redirect href='/signin' />;
  return <CatalogPage savedOnly />;
};

export default SavedPage;
