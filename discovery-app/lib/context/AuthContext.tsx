'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { User, AuthContextType } from '../../types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setAuthCookie(loggedIn: boolean) {
  if (typeof document === 'undefined') return;
  if (loggedIn) {
    document.cookie = 'soloberty_auth=1; path=/; max-age=2592000; SameSite=Lax';
  } else {
    document.cookie = 'soloberty_auth=; path=/; max-age=0; SameSite=Lax';
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkProfileStatus = async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setIsProfileCompleted(false);
      setAuthCookie(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      const isCompleted = Boolean(userDoc.exists() && userDoc.data()?.profileCompleted);

      if (isCompleted) {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || undefined,
          photoURL: fbUser.photoURL || undefined,
          profileCompleted: true,
        });
        setIsProfileCompleted(true);
        setAuthCookie(true);
      } else {
        setUser(null);
        setIsProfileCompleted(false);
        setAuthCookie(false);
      }
    } catch (err) {
      console.warn('Error checking Firestore user profile status:', err);
      setUser(null);
      setIsProfileCompleted(false);
      setAuthCookie(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      await checkProfileStatus(fbUser);
      setLoading(false);
    }, (err) => {
      console.warn('Firebase Auth State listener error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfileStatus = async () => {
    if (auth.currentUser) {
      await checkProfileStatus(auth.currentUser);
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await signInWithEmailAndPassword(auth, email, pass);
      setUser({
        uid: res.user.uid,
        email: res.user.email || email,
      });
      setAuthCookie(true);
    } catch (err: any) {
      const msg = err?.message || 'Failed to log in. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string): Promise<User> => {
    try {
      setLoading(true);
      setError(null);
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser: User = {
        uid: res.user.uid,
        email: res.user.email || email,
      };
      setUser(newUser);
      return newUser;
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setAuthCookie(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isProfileCompleted,
        loading,
        error,
        login,
        signup,
        logout,
        clearError,
        refreshProfileStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
