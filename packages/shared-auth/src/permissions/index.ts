import { USER_ROLE, type UserRole } from '@ojekdes/shared-constants';

/**
 * Grup role bawaan untuk kemudahan pengecekan akses.
 */
export const ROLE_GROUPS = {
  ALL_ADMINS: [USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN] as UserRole[],
  ALL_STAFF: [USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.OPERATOR] as UserRole[],
  DRIVERS: [USER_ROLE.DRIVER] as UserRole[],
  CUSTOMERS: [USER_ROLE.CUSTOMER] as UserRole[],
} as const;

/**
 * Mengecek apakah user memiliki role tertentu.
 *
 * @example
 * hasRole(user.role, USER_ROLE.ADMIN) // → true/false
 */
export function hasRole(userRole: string, requiredRole: string): boolean {
  return userRole === requiredRole;
}

/**
 * Mengecek apakah user memiliki salah satu dari beberapa role yang diizinkan.
 *
 * @example
 * hasAnyRole(user.role, ROLE_GROUPS.ALL_ADMINS) // → true/false
 * hasAnyRole(user.role, [USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN]) // → true/false
 */
export function hasAnyRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Mengecek apakah user adalah admin (SUPER_ADMIN atau ADMIN).
 */
export function isAdmin(userRole: string): boolean {
  return hasAnyRole(userRole, ROLE_GROUPS.ALL_ADMINS);
}

/**
 * Mengecek apakah user adalah staf (SUPER_ADMIN, ADMIN, atau OPERATOR).
 */
export function isStaff(userRole: string): boolean {
  return hasAnyRole(userRole, ROLE_GROUPS.ALL_STAFF);
}

/**
 * Mengecek apakah user adalah driver.
 */
export function isDriver(userRole: string): boolean {
  return hasRole(userRole, USER_ROLE.DRIVER);
}

/**
 * Mengecek apakah user adalah customer.
 */
export function isCustomer(userRole: string): boolean {
  return hasRole(userRole, USER_ROLE.CUSTOMER);
}
