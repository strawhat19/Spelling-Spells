import { useContext } from 'react';
import { FeatureFlagsContext } from './FeatureFlagsContext';

export const useFeatureFlags = () => {
  const value = useContext(FeatureFlagsContext);
  if (!value) throw new Error(`useFeatureFlags Must Be Used Within FeatureFlagsProvider`);
  return value;
};
