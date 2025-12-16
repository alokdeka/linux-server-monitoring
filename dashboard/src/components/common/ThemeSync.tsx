import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { useTheme } from '../../styles/ThemeProvider';
import { loadSettings } from '../../store/slices/appSlice';

/**
 * Component that synchronizes Redux settings theme with the UI theme system
 */
const ThemeSync: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { settings, initialized } = useSelector(
    (state: RootState) => state.app
  );
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { themeType, setTheme } = useTheme();

  // Load settings when user is authenticated
  useEffect(() => {
    if (isAuthenticated && initialized && !settings) {
      dispatch(loadSettings());
    }
  }, [dispatch, isAuthenticated, initialized, settings]);

  // Sync theme when settings are loaded or changed
  useEffect(() => {
    if (settings && settings.display.theme !== themeType) {
      setTheme(settings.display.theme);
    }
  }, [settings, themeType, setTheme]);

  return null; // This component doesn't render anything
};

export default ThemeSync;
