import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { refreshToken, logoutUser } from '../store/slices/authSlice';

const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

export const useTokenRefresh = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { token, tokenExpiry, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const checkTokenExpiry = useCallback(() => {
    if (!isAuthenticated || !token || !tokenExpiry) {
      return;
    }

    const expiryDate = new Date(tokenExpiry);
    const now = new Date();
    const timeUntilExpiry = expiryDate.getTime() - now.getTime();

    if (timeUntilExpiry <= 0) {
      // Token has expired, logout
      dispatch(logoutUser());
    } else if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD) {
      // Token expires soon, refresh it
      dispatch(refreshToken());
    }
  }, [dispatch, isAuthenticated, token, tokenExpiry]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Check immediately
    checkTokenExpiry();

    // Set up interval to check every minute
    const interval = setInterval(checkTokenExpiry, 60 * 1000);

    return () => clearInterval(interval);
  }, [checkTokenExpiry, isAuthenticated]);

  return { checkTokenExpiry };
};
