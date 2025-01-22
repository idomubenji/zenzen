// Session timeout duration (30 minutes)
export const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds

// Valid user roles
export const UserRoles = {
  ADMINISTRATOR: 'Administrator',
  WORKER: 'Worker',
  PENDING_WORKER: 'PendingWorker',
  CUSTOMER: 'Customer',
} as const

export type UserRole = typeof UserRoles[keyof typeof UserRoles]

// Function to validate role
export const isValidRole = (role: string): role is UserRole => {
  return Object.values(UserRoles).includes(role as UserRole)
}

// Function to check if a role is a worker type (including pending)
export const isWorkerRole = (role: UserRole): boolean => {
  return role === UserRoles.WORKER || role === UserRoles.PENDING_WORKER
}

// Function to check if user can access worker dashboard
export const canAccessWorkerDashboard = (role: UserRole): boolean => {
  return role === UserRoles.WORKER || role === UserRoles.ADMINISTRATOR
} 