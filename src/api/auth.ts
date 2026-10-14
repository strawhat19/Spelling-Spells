import { authenticationService } from '../shared/authentication/service';

export const authAPI = authenticationService;
export type { Account, AuthResult, AuthStatus, EmailSignIn, EmailSignUp } from '../shared/authentication/types';
