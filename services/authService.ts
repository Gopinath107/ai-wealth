
import { AuthResponse } from '../types';
import { BASE_URL, setToken, clearToken, getHeaders, simulateDelay, shouldUseBackend, setDemoMode } from './apiConfig';
import { DEMO_USER, isDemoCredentials } from '../config/demoUser';

/**
 * Helper: Hash password using SHA-256 before sending to network.
 * Uses native Web Crypto API to avoid external dependencies.
 */
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Standard API Response Structure
interface ApiResponse<T> {
  success: boolean;
  result: T;
  errors: string[];
  errorCount: number;
}

export const authService = {

  // 1. Sign Up - ALWAYS requires backend, no mock fallback
  signup: async (name: string, email: string, password: string): Promise<void> => {
    console.log('[Auth] Signup attempt for:', email);

    const hashedPassword = await hashPassword(password);

    try {
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name, email, password: hashedPassword })
      });

      console.log('[Auth] Signup response status:', res.status);

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        console.error('[Auth] Signup failed:', res.status, errText);
        throw new Error(`Signup failed: Backend returned ${res.status}`);
      }

      const data: ApiResponse<any> = await res.json();

      if (!data.success) {
        console.error('[Auth] Signup API returned error:', data.errors);
        throw new Error(data.errors?.[0] || 'Signup failed');
      }

      console.log('[Auth] Signup successful');
      // NOTE: We do NOT set the token here. The user must log in manually after signup.
      return;
    } catch (error) {
      console.error('[Auth] Backend signup error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Backend not reachable. Please ensure the server is running at ' + BASE_URL);
      }
      throw error;
    }
  },

  // 2. Login
  login: async (email: string, password: string): Promise<AuthResponse> => {
    // Check for Demo User Login First
    if (isDemoCredentials(email)) {
      console.log('[Auth] Demo login detected');
      await simulateDelay(800);
      setDemoMode(true); // Enable demo mode globally
      const mockToken = "demo-user-token";
      setToken(mockToken);
      return {
        token: mockToken,
        user: {
          id: "demo-user-id",
          fullName: DEMO_USER.name,
          email: DEMO_USER.email,
          avatar: DEMO_USER.avatar
        }
      };
    }

    // For real login: ALWAYS require backend, NO mock fallback
    // Clear any stale demo mode first
    setDemoMode(false);

    console.log('[Auth] Real login attempt for:', email);

    const hashedPassword = await hashPassword(password);

    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: hashedPassword })
      });

      console.log('[Auth] Login response status:', res.status);

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        console.error('[Auth] Login failed:', res.status, errText);
        throw new Error(`Login failed: Backend returned ${res.status}`);
      }

      const data: ApiResponse<{ token: string; userId?: number; fullName?: string; email?: string; user?: any }> = await res.json();

      if (!data.success) {
        console.error('[Auth] Login API returned error:', data.errors);
        throw new Error(data.errors?.[0] || 'Login failed - Invalid credentials');
      }

      console.log('[Auth] Login successful, setting token');
      setToken(data.result.token);

      // The API returns userId directly in result, not nested in user object
      const userId = data.result.userId;
      const userObj = {
        id: userId || 1, // Use userId from response, default to 1 if missing
        fullName: data.result.fullName || data.result.user?.fullName || email.split('@')[0],
        email: data.result.email || data.result.user?.email || email
      };

      // Store userId for other services (Watchlist, AI Chat) to use
      if (userId) {
        localStorage.setItem('userId', String(userId));
        console.log('[Auth] Stored userId in localStorage:', userId);
      }

      return {
        token: data.result.token,
        user: userObj
      };
    } catch (error) {
      console.error('[Auth] Backend login error:', error);
      // Re-throw with clear error message - NO mock fallback
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Backend not reachable. Please ensure the server is running at ' + BASE_URL);
      }
      throw error;
    }
  },

  // 3. Logout
  logout: async () => {
    setDemoMode(false); // Clear demo mode
    localStorage.removeItem('userId'); // Clear stored user ID

    if (shouldUseBackend()) {
      try {
        await fetch(`${BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: getHeaders()
        });
      } catch (e) {
        console.error("Logout failed on server", e);
      }
    } else {
      await simulateDelay(500);
    }
    clearToken();
  },

  // 4. Forgot Password - ALWAYS requires backend, no mock fallback
  forgotPassword: async (email: string): Promise<string> => {
    console.log('[Auth] Forgot password request for:', email);

    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password?email=${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`Request failed: Backend returned ${res.status}`);
      }

      const data: ApiResponse<any> = await res.json();

      if (!data.success) {
        throw new Error(data.errors?.[0] || 'Failed to process request');
      }

      console.log('[Auth] Forgot password request successful');
      return data.result;
    } catch (error) {
      console.error('[Auth] Forgot password error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Backend not reachable. Please ensure the server is running at ' + BASE_URL);
      }
      throw error;
    }
  },

  // 5. Reset Password - ALWAYS requires backend, no mock fallback
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    console.log('[Auth] Reset password attempt');

    const hashedPassword = await hashPassword(newPassword);

    try {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token, newPassword: hashedPassword })
      });

      if (!res.ok) {
        throw new Error(`Reset failed: Backend returned ${res.status}`);
      }

      const data: ApiResponse<any> = await res.json();
      if (!data.success) {
        throw new Error(data.errors?.[0] || 'Reset password failed');
      }

      console.log('[Auth] Password reset successful');
      return;
    } catch (error) {
      console.error('[Auth] Reset password error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Backend not reachable. Please ensure the server is running at ' + BASE_URL);
      }
      throw error;
    }
  }
};
