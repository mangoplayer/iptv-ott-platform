'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, User } from '../types/app';
import { xtreamApi } from '../services/xtream-api';

interface AuthStore extends AuthState {
  login: (serverUrl: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUserInfo: () => Promise<void>;
  initializeApi: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      serverUrl: '',
      loading: false,
      error: null,

      // Initialize API with stored credentials
      initializeApi: () => {
        const { isAuthenticated, serverUrl, user } = get();
        
        if (isAuthenticated && serverUrl && user && user.password) {
          xtreamApi.initialize({
            serverUrl,
            username: user.username,
            password: user.password,
          });
          console.log('API initialized from stored credentials');
        }
      },

      login: async (serverUrl: string, username: string, password: string) => {
        set({ loading: true, error: null });
        
        try {
          // Initialize the API with credentials
          xtreamApi.initialize({
            serverUrl,
            username,
            password,
          });
          
          // Authenticate and get user info
          const authResponse = await xtreamApi.authenticate();
          
          if (authResponse.user_info.auth !== 1) {
            throw new Error('Authentication failed: Invalid credentials');
          }
          
          // Map the user info to our User type
          const user: User = {
            username: authResponse.user_info.username,
            password, // Store password for API calls
            expiryDate: authResponse.user_info.exp_date,
            maxConnections: parseInt(authResponse.user_info.max_connections),
            activeConnections: parseInt(authResponse.user_info.active_cons),
            status: authResponse.user_info.status === 'Active' ? 'active' : 'expired',
            isTrial: authResponse.user_info.is_trial === '1',
            createdAt: authResponse.user_info.created_at,
          };
          
          set({
            isAuthenticated: true,
            user,
            serverUrl,
            loading: false,
            error: null,
          });
        } catch (error) {
          console.error('Login error:', error);
          set({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      },
      
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          serverUrl: '',
          loading: false,
          error: null,
        });
      },
      
      refreshUserInfo: async () => {
        const { isAuthenticated, serverUrl, user } = get();
        
        if (!isAuthenticated || !user) {
          return;
        }
        
        set({ loading: true });
        
        try {
          // Ensure API is initialized
          if (user.password) {
            xtreamApi.initialize({
              serverUrl,
              username: user.username,
              password: user.password,
            });
          }
          
          // Re-authenticate to get fresh user info
          const authResponse = await xtreamApi.authenticate();
          
          if (authResponse.user_info.auth !== 1) {
            throw new Error('Session expired');
          }
          
          // Update user info
          const updatedUser: User = {
            ...user,
            expiryDate: authResponse.user_info.exp_date,
            maxConnections: parseInt(authResponse.user_info.max_connections),
            activeConnections: parseInt(authResponse.user_info.active_cons),
            status: authResponse.user_info.status === 'Active' ? 'active' : 'expired',
          };
          
          set({
            user: updatedUser,
            loading: false,
            error: null,
          });
        } catch (error) {
          console.error('Refresh user info error:', error);
          
          // If authentication fails, log the user out
          if (error instanceof Error && error.message === 'Session expired') {
            get().logout();
          } else {
            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Failed to refresh user info',
            });
          }
        }
      },
    }),
    {
      name: 'iptv-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user ? {
          ...state.user,
          // Exclude sensitive data if needed
          // password: undefined,
        } : null,
        serverUrl: state.serverUrl,
      }),
    }
  )
);