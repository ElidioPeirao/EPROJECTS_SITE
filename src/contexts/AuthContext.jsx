
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, googleProvider, db, storage } from '@/lib/firebase';
import { useToast } from '@/components/ui/use-toast';
import { isAfter } from 'date-fns';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const signup = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      displayName,
      role: 'E-BASIC',
      status: 'active',
      createdAt: new Date().toISOString(),
      photoURL: null
    });

    return userCredential;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const userDocRef = doc(db, 'users', result.user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        email: result.user.email,
        displayName: result.user.displayName,
        role: 'E-BASIC',
        status: 'active',
        createdAt: new Date().toISOString(),
        photoURL: result.user.photoURL
      });
    }
    
    return result;
  };

  const logout = () => {
    return signOut(auth);
  };
  
  const updateUserProfileAndPhoto = async (updates, photoFile) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Nenhum usuário logado.");

    const userDocRef = doc(db, 'users', user.uid);
    let photoURL = user.photoURL;

    if (photoFile) {
        const photoRef = ref(storage, `profile_pictures/${user.uid}/${photoFile.name}`);
        await uploadBytes(photoRef, photoFile);
        photoURL = await getDownloadURL(photoRef);
        await updateProfile(user, { photoURL: photoURL });
    }

    const dbUpdates = { ...updates };
    if(photoURL) dbUpdates.photoURL = photoURL;
    if (dbUpdates.displayName && dbUpdates.displayName !== user.displayName) {
      await updateProfile(user, { displayName: dbUpdates.displayName });
    }
    if (dbUpdates.email && dbUpdates.email !== user.email) {
      await updateEmail(user, dbUpdates.email);
    }
    if (dbUpdates.password) {
      await updatePassword(user, dbUpdates.password);
      delete dbUpdates.password;
    }
    
    await updateDoc(userDocRef, dbUpdates);
  };
  
  const checkRoleExpiration = useCallback(async (userDocRef, userData) => {
    if (userData.roleExpiresAt && isAfter(new Date(), new Date(userData.roleExpiresAt))) {
        await updateDoc(userDocRef, {
            role: 'E-BASIC',
            roleExpiresAt: null
        });
        setUserRole('E-BASIC');
        toast({ title: "Seu cargo expirou", description: "Seu acesso foi redefinido para E-BASIC." });
        return 'E-BASIC';
    }
    return userData.role;
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserStatus(userData.status || 'active');
            if (userData.status === 'banned') {
                setUserRole(null);
            } else {
                const currentRole = await checkRoleExpiration(userDocRef, userData);
                setUserRole(currentRole);
            }
          } else {
            // Se o documento não existe (ex: primeiro login com Google)
            await setDoc(userDocRef, {
              email: user.email,
              displayName: user.displayName,
              role: 'E-BASIC',
              status: 'active',
              createdAt: new Date().toISOString(),
              photoURL: user.photoURL
            }, { merge: true });
            setUserRole('E-BASIC');
            setUserStatus('active');
          }
        } catch (error) {
            console.error("Erro ao buscar dados do usuário:", error);
            setUserRole(null);
            setUserStatus(null);
        }
      } else {
        setUserRole(null);
        setUserStatus(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [checkRoleExpiration]);

  const value = {
    currentUser,
    userRole,
    userStatus,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateUserProfileAndPhoto
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
