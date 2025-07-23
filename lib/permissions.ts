// Utility functions for checking permissions across the app
export interface UserRole {
  id: string
  name: string
  color: string
  isDefault: boolean
  isAdmin: boolean
}

export interface User {
  id: string
  name: string
  email: string
  roles: string[]
  organizationId: string
  [key: string]: any
}

export const ADMIN_ROLES = ["Group Owner", "President", "Treasurer"]
export const EXECUTIVE_ROLES = ["Group Owner", "President"]
export const OWNER_ROLES = ["Group Owner"]

export function hasRole(user: User | null, roleName: string): boolean {
  if (!user || !user.roles) return false
  return user.roles.includes(roleName)
}

export function hasAnyRole(user: User | null, roleNames: string[]): boolean {
  if (!user || !user.roles) return false
  return user.roles.some((role) => roleNames.includes(role))
}

export function isAdmin(user: User | null): boolean {
  return hasAnyRole(user, ADMIN_ROLES)
}

export function isExecutive(user: User | null): boolean {
  return hasAnyRole(user, EXECUTIVE_ROLES)
}

export function isGroupOwner(user: User | null): boolean {
  return hasRole(user, "Group Owner")
}

export function canManageMembers(user: User | null): boolean {
  return isAdmin(user)
}

export function canManageOrganization(user: User | null): boolean {
  return isExecutive(user)
}

export function canDeleteOrganization(user: User | null): boolean {
  return isGroupOwner(user)
}

export function canTransferOwnership(user: User | null): boolean {
  return isGroupOwner(user)
}

export function canManageEvents(user: User | null): boolean {
  return isAdmin(user)
}

export function canManageAnnouncements(user: User | null): boolean {
  return isAdmin(user)
}

export function canManageLibrary(user: User | null): boolean {
  return isAdmin(user)
}

export function canViewAdminStats(user: User | null): boolean {
  return isAdmin(user)
}

export function getRoleColor(roleName: string): string {
  const roleColors = {
    "Group Owner": "#7c3aed",
    President: "#dc2626",
    Treasurer: "#059669",
    Active: "#2563eb",
    "New Member": "#f59e0b",
  }
  return roleColors[roleName] || "#6b7280"
}

export function getRoleDisplayName(roleName: string): string {
  // Handle any role name formatting
  return roleName
}

export function sortRolesByImportance(roles: string[]): string[] {
  const roleOrder = ["Group Owner", "President", "Treasurer", "Active", "New Member"]
  return roles.sort((a, b) => {
    const aIndex = roleOrder.indexOf(a)
    const bIndex = roleOrder.indexOf(b)
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })
}
