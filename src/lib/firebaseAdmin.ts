import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let app: App | undefined;

export async function verifyFirebaseIdToken(idToken: string) {
  if (!app) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    }

    app = getApps()[0] || initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  return getAuth(app).verifyIdToken(idToken);
}


