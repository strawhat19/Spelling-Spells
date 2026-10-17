import Icon from '../Icon';
import GoogleBrandMark from '../GoogleBrandMark';
import { getAccountSignInMethods, type AccountSignInMethodsProps } from './methods';
import './styles.scss';

const AccountSignInMethods = ({ id, providers }: AccountSignInMethodsProps) => <span id={id} className='account-signin-methods'>
  {getAccountSignInMethods(providers).map((method) => <span
    role='img'
    key={method.id}
    title={method.label}
    aria-label={method.label}
    id={`${id}-${method.id}`}
    className={`account-signin-method account-signin-method-${method.id}`}
  >
    {method.id === `google` ? <GoogleBrandMark size={15} id={`${id}-${method.id}-mark`} /> : <Icon size={15} name={method.id === `email` ? `mail` : `shield`} />}
  </span>)}
</span>;

export default AccountSignInMethods;
