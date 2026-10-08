import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, UserRole } from '../types';

let activeRoleOverride: UserRole | null = null;

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      return null;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as User;
        const currentRole = activeRoleOverride || data.role || 'admin';
        return {
          ...data,
          id: fbUser.uid,
          uid: fbUser.uid,
          role: currentRole,
        };
      } else {
        // Create initial user document in Firestore
        const defaultRole: UserRole = activeRoleOverride || (fbUser.email?.includes('cashier') ? 'cashier' : fbUser.email?.includes('manager') ? 'manager' : 'admin');
        const initialUser: User = {
          id: fbUser.uid,
          uid: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Store Staff',
          email: fbUser.email || 'staff@janani.com',
          role: defaultRole,
          avatarUrl: fbUser.photoURL || undefined,
          active: true,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', fbUser.uid), {
          ...initialUser,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return initialUser;
      }
    } catch {
      return {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: fbUser.displayName || 'Authorized Staff',
        email: fbUser.email || 'staff@janani.com',
        role: activeRoleOverride || 'admin',
        active: true,
        createdAt: new Date().toISOString(),
      };
    }
  },

  async loginWithEmail(email: string, password: string, desiredRole?: UserRole): Promise<User> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      // If user doesn't exist yet, auto create for smooth testing / presets
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-login-credentials'
      ) {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (createErr) {
          throw err;
        }
      } else {
        throw err;
      }
    }

    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('Authentication failed');

    // Ensure user profile in Firestore
    const userRef = doc(db, 'users', fbUser.uid);
    const existingSnap = await getDoc(userRef);

    const role: UserRole = desiredRole || (email.toLowerCase().includes('cashier') ? 'cashier' : email.toLowerCase().includes('manager') ? 'manager' : 'admin');
    const name = email.split('@')[0].toUpperCase();

    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        id: fbUser.uid,
        uid: fbUser.uid,
        name,
        email: fbUser.email || email,
        role,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (desiredRole) {
      await updateDoc(userRef, {
        role: desiredRole,
        updatedAt: serverTimestamp(),
      });
    }

    const current = await this.getCurrentUser();
    return current!;
  },

  async signUpWithEmail(email: string, password: string, name: string, role: UserRole): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      try {
        await updateProfile(cred.user, { displayName: name });
      } catch {
        // Ignore displayName error
      }
    }

    const newUser: User = {
      id: cred.user.uid,
      uid: cred.user.uid,
      name: name || email.split('@')[0],
      email: cred.user.email || email,
      role: role.toLowerCase() as UserRole,
      active: true,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', cred.user.uid), {
      ...newUser,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const current = await this.getCurrentUser();
    return current!;
  },

  async loginWithGoogle(): Promise<User> {
    await signInWithPopup(auth, googleProvider);
    const current = await this.getCurrentUser();
    return current!;
  },

  async logout(): Promise<void> {
    activeRoleOverride = null;
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
  },

  async switchRole(role: UserRole): Promise<User | null> {
    activeRoleOverride = role;
    const fbUser = auth.currentUser;
    if (fbUser) {
      try {
        await updateDoc(doc(db, 'users', fbUser.uid), {
          role: role.toLowerCase(),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Fallback in memory override
      }
    }
    return this.getCurrentUser();
  },

  subscribeUsers(callback: (users: User[]) => void, onError?: (err: Error) => void) {
    return onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const users = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as User[];
        callback(users);
      },
      (err) => {
        console.error('Users snapshot error:', err);
        if (onError) onError(err);
      }
    );
  },

  async getUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    } catch {
      return [];
    }
  },
};
