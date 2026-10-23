import { AppState } from 'react-native';

export const subscribeGrimoireRefresh = (refresh: () => void): (() => void) => {
  const subscription = AppState.addEventListener(`change`, (state) => { if (state === `active`) refresh(); });
  return () => subscription.remove();
};
