
// --- BACKEND CONFIGURATION ---
export const USE_REAL_BACKEND = false;
export const BASE_URL = "http://localhost:8080/api/v1";

// --- TOKEN MANAGEMENT ---
let authToken = localStorage.getItem('jwt_token');

export const setToken = (token: string) => {
  authToken = token;
  localStorage.setItem('jwt_token', token);
};

export const clearToken = () => {
  authToken = null;
  localStorage.removeItem('jwt_token');
};

export const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Authorization': authToken ? `Bearer ${authToken}` : ''
  };
};

// Helper to simulate network latency for UI testing
export const simulateDelay = (ms: number = 800) => new Promise(resolve => setTimeout(resolve, ms));
