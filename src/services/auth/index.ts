/**
 * Authentication Services
 * Centralized exports for all authentication-related services
 */

export { authService } from './AuthService';
export { ProductionAuthService } from './ProductionAuthService';

// Re-export types
export type { AuthResult } from './AuthService';
