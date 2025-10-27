import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, User, Lock, Mail } from 'lucide-react';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Profile = () => {
  const { currentUser, userRole, roleExpiresAt, updateUserProfileAndPhoto, loading: authLoading } = useAuth();
  const [newPhoto, setNewPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bonusCode, setBonusCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { toast } = useToast();

  const [profileData, setProfileData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setProfileData({
        displayName: currentUser.displayName || '',
        email: currentUser.email || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [currentUser]);

  const handleProfileDataChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async () => {
    if (profileData.password && profileData.password !== profileData.confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
    if (profileData.password && profileData.password.length < 6) {
      toast({ title: 'Erro', description: 'A nova senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const updates = {
        displayName: profileData.displayName,
        email: profileData.email,
      };
      if (profileData.password) {
        updates.password = profileData.password;
      }
      
      await updateUserProfileAndPhoto(updates, newPhoto);

      toast({ title: 'Sucesso!', description: 'Seu perfil foi atualizado.' });
      setNewPhoto(null);
      setProfileData(prev => ({ ...prev, password: '', confirmPassword: '' }));

    } catch (error) {
      toast({ title: 'Erro ao atualizar perfil', description: error.message, variant: 'destructive' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePhotoChange = (e) => {
    if (e.target.files[0]) {
      setNewPhoto(e.target.files[0]);
    }
  };

  const handleRedeemCode = async () => {
    if (!bonusCode.trim()) return;
    setIsRedeeming(true);

    try {
        const q = query(collection(db, "bonusCodes"), where("code", "==", bonusCode.trim().toUpperCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error("Código inválido ou já utilizado.");
        }

        const codeDoc = snapshot.docs[0];
        const codeData = codeDoc.data();

        if (codeData.usesLeft <= 0) {
            throw new Error("Este código já atingiu o limite de usos.");
        }

        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        const currentRoleExpiresAt = userDoc.data()?.roleExpiresAt?.toDate() || new Date();
        
        const newExpiryDate = new Date(Math.max(new Date(), currentRoleExpiresAt));
        newExpiryDate.setDate(newExpiryDate.getDate() + codeData.durationDays);

        const batch = writeBatch(db);
        batch.update(userDocRef, {
            role: codeData.role,
            roleExpiresAt: newExpiryDate
        });
        batch.update(doc(db, "bonusCodes", codeDoc.id), {
            usesLeft: codeData.usesLeft - 1
        });
        await batch.commit();

        toast({ title: "Código resgatado!", description: `Você agora é ${codeData.role} por ${codeData.durationDays} dias!` });
        setBonusCode('');
        
    } catch (error) {
        toast({ title: 'Erro ao resgatar', description: error.message, variant: 'destructive' });
    } finally {
        setIsRedeeming(false);
    }
  }

  const roleExpirationString = roleExpiresAt ? `Expira em: ${roleExpiresAt.toLocaleDateString()}` : 'Acesso vitalício';

  return (
    <>
      <Helmet>
        <title>Meu Perfil - EPROJECTS</title>
      </Helmet>
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-center gap-8 mb-12">
          <div className="relative">
            <img 
              alt="Foto de Perfil" 
              className="w-32 h-32 rounded-full object-cover border-4 border-orange-500" 
              src={newPhoto ? URL.createObjectURL(newPhoto) : currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName || 'U'}&background=ff6a00&color=000`} 
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">{currentUser?.displayName || 'Usuário'}</h1>
            <p className="text-gray-400">{currentUser?.email}</p>
            <p className="text-orange-500 font-semibold mt-1">{userRole} <span className="text-gray-400 text-sm font-normal">({roleExpirationString})</span></p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-card p-6 rounded-lg lg:col-span-2">
                <h2 className="text-2xl font-semibold text-white mb-6">Editar Perfil</h2>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-gray-300 flex items-center gap-2"><User size={16}/> Nome de Exibição</Label>
                        <Input id="displayName" name="displayName" value={profileData.displayName} onChange={handleProfileDataChange} className="bg-white/5 border-white/10 text-white"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300 flex items-center gap-2"><Mail size={16}/> Email</Label>
                        <Input id="email" name="email" type="email" value={profileData.email} onChange={handleProfileDataChange} className="bg-white/5 border-white/10 text-white"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-300 flex items-center gap-2"><Lock size={16}/> Nova Senha</Label>
                            <Input id="password" name="password" type="password" value={profileData.password} onChange={handleProfileDataChange} placeholder="Deixe em branco para não alterar" className="bg-white/5 border-white/10 text-white"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-gray-300 flex items-center gap-2"><Lock size={16}/> Confirmar Nova Senha</Label>
                            <Input id="confirmPassword" name="confirmPassword" type="password" value={profileData.confirmPassword} onChange={handleProfileDataChange} className="bg-white/5 border-white/10 text-white"/>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="photo-upload" className="text-gray-300">Alterar Foto de Perfil</Label>
                        <Input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="bg-white/5 border-white/10 text-white file:text-orange-500"/>
                    </div>
                    <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile || authLoading} className="w-full bg-orange-500 hover:bg-orange-600 text-black">
                        {isUpdatingProfile ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </div>
            
            <div className="glass-card p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2"><Gift className="text-orange-400"/> Resgatar Código Bônus</h2>
                <Label htmlFor="bonus-code" className="text-gray-300">Tem um código? Insira abaixo!</Label>
                <Input 
                    id="bonus-code" 
                    placeholder="EX: MASTER-PROMO" 
                    value={bonusCode}
                    onChange={(e) => setBonusCode(e.target.value)}
                    className="bg-white/5 border-white/10 text-white mt-2 mb-4 uppercase placeholder:normal-case"
                />
                <Button onClick={handleRedeemCode} disabled={!bonusCode || isRedeeming} className="w-full bg-orange-500 hover:bg-orange-600 text-black">
                    {isRedeeming ? 'Resgatando...' : 'Resgatar Código'}
                </Button>
            </div>
        </motion.div>
      </div>
    </>
  );
};

export default Profile;
