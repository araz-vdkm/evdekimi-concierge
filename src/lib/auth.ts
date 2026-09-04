import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Defensive: Firebase's default persistence tries IndexedDB first
// (indexedDBLocalPersistence). In some browsers/environments (Safari private
// browsing, in-app WebViews like Instagram/LinkedIn, storage-restricted
// contexts) IndexedDB itself throws (e.g. "Database is closing"), which
// surfaces as a hard login failure. Explicitly using browserLocalPersistence
// (localStorage-backed, no IndexedDB dependency) avoids that whole class of
// failures for auth session storage.
setPersistence(auth, browserLocalPersistence).catch((e) => {
  console.warn('Failed to set browserLocalPersistence, falling back to SDK default:', e);
});

const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
export const storage = getStorage(app);



export const createGoogleProvider = (withGmailScope = false) => {
  const p = new GoogleAuthProvider();
  if (withGmailScope) {
    p.addScope('https://www.googleapis.com/auth/gmail.send');
  }
  p.setCustomParameters({ prompt: "select_account" });
  return p;
};

// Superuser (Root Admin) allowlist — grants the same master RBAC / full-visibility
// privileges as roman@evdekimi.com. Add additional emails (lowercase) here to
// grant the same rights to another account.
export const SUPERUSER_EMAILS = ['roman@evdekimi.com', 'arazm@evdekimi.com'];
export const isSuperUserEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return SUPERUSER_EMAILS.includes(email.toLowerCase());
};

const provider = createGoogleProvider();
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = localStorage.getItem('googleOAuthToken');
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const googleProv = createGoogleProvider(true);
    const result = await signInWithPopup(auth, googleProv);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get Google access token with Gmail permissions");
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('googleOAuthToken', cachedAccessToken);
    if (result.user?.email) {
      localStorage.setItem('concierge_connected_email', result.user.email);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      const friendlyErr = new Error('Sign-in window was closed before completing authentication.');
      (friendlyErr as any).code = error.code;
      throw friendlyErr;
    }
    console.warn("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (user) {
    try {
      const idToken = await user.getIdToken(true);
      if (idToken) return idToken;
    } catch (e) {}
  }
  return '';
};

export const getGoogleToken = (): string => {
  return localStorage.getItem('googleOAuthToken') || '';
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('googleOAuthToken');
  localStorage.removeItem('conciergeAuth');
};

export const registerUser = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCredential.user);
  return userCredential.user;
};

export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export { onAuthStateChanged, signOut, sendEmailVerification };

export const signInWithSocial = async (providerName) => {
  isSigningIn = true;
  try {
    const provider = providerName === 'apple' 
      ? new OAuthProvider('apple.com') 
      : createGoogleProvider();
      
    const result = await signInWithPopup(auth, provider);
    
    if (providerName === 'google') {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        localStorage.setItem('googleOAuthToken', cachedAccessToken);
        if (result.user?.email) {
          localStorage.setItem('concierge_connected_email', result.user.email);
        }
      }
    }
    return result.user;
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      const friendlyErr = new Error('Sign-in window was closed before completing authentication.');
      (friendlyErr as any).code = err.code;
      throw friendlyErr;
    }
    console.error("Social sign in error", err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};
