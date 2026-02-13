
// Centralized Demo User Configuration
// To remove demo functionality, delete this file and remove references in Auth.tsx and authService.ts

export const DEMO_USER = {
  email: 'demo@dj-ai.com',
  password: 'demo-password',
  name: 'Demo Investor',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoInvestor'
};

export const isDemoCredentials = (email: string) => {
  return email.toLowerCase() === DEMO_USER.email.toLowerCase();
};
