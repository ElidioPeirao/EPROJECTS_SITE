import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
 apiKey: "AIzaSyDnpVYSC2v3Pbr4DGOxf-sKvcRhFFqtWRE",
  authDomain: "maintence-6ef08.firebaseapp.com",
  projectId: "maintence-6ef08",
  storageBucket: "maintence-6ef08.firebasestorage.app",
  messagingSenderId: "1085348103519",
  appId: "1:1085348103519:web:06c21952276975ab5022ea",
  measurementId: "G-31S2V238QE"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;