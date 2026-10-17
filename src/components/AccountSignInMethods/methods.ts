export type AccountSignInMethodsProps = { id: string; providers: readonly string[] | null };

export const getAccountSignInMethods = (providers: AccountSignInMethodsProps[`providers`]) => {
  const supported = [
    { id: `email`, label: `Email + Password` },
    { id: `google`, label: `Google` },
  ].filter((method) => providers?.includes(method.id));
  return supported.length ? supported : [{ id: `unavailable`, label: providers == null ? `Sign-In Method Unavailable` : `No Supported Sign-In Methods` }];
};
