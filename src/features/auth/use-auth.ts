'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import type { UserRole } from '@prisma/client';

export function useAuth() {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const user = session?.user ?? null;

  function hasRole(role: UserRole): boolean {
    return user?.role === role;
  }

  function hasAnyRole(roles: UserRole[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
  }

  const isAdmin = hasRole('admin');

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    hasRole,
    hasAnyRole,
    signIn,
    signOut,
  };
}
