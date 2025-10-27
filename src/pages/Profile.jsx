
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift } from 'lucide-react';

const Profile = () => {
  const { currentUser, userRole, roleExpiresAt } = useAuth();
  const [newPhoto, setNewPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bonusCode, setBonusCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { toast } = useToast();

  const handlePhotoChange = (e) => {
    if (e.target.files[0]) {
      setNewPhoto(e.target.files[0]);
    }
  };

  const handlePhotoUpload = async () => {
    if (!newPhoto) return;
    setUploading(true);
    const filePath = `profile-pics/${currentUser.uid}/${newPhoto.name}`;
    const storageRef = ref(storage, filePath);
    try {
      const snapshot = await uploadBytes(storageRef, newPhoto);
      const photoURL = await getDownloadURL(snapshot.ref);

      await updateProfile(currentUser, { photoURL });
      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL });

      toast({ title: 'Foto de perfil atualizada!' });
      setNewPhoto(null);
    } catch (error) {
      toast({ title: 'Erro ao enviar foto', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
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

        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + codeData.durationDays);

        const batch = writeBatch(db);
        batch.update(doc(db, "users", currentUser.uid), {
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
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-center gap-8 mb-12">
          <div className="relative">
            <img alt="Foto de Perfil" class="w-32 h-32 rounded-full object-cover border-4 border-orange-500" src="https://images.unsplash.com/photo-1625708974337-fb8fe9af5711" />
            {newPhoto && <img src={URL.createObjectURL(newPhoto)} alt="nova preview" className="w-32 h-32 rounded-full object-cover absolute top-0 left-0" />}
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">{currentUser?.displayName || 'Usuário'}</h1>
            <p className="text-gray-400">{currentUser?.email}</p>
            <p className="text-orange-500 font-semibold mt-1">{userRole} <span className="text-gray-400 text-sm font-normal">({roleExpirationString})</span></p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">Atualizar Foto</h2>
                <Label htmlFor="photo-upload" className="text-gray-300">Escolha uma nova imagem de perfil</Label>
                <Input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="bg-white/5 border-white/10 text-white mt-2 mb-4 file:text-orange-500"/>
                <Button onClick={handlePhotoUpload} disabled={!newPhoto || uploading} className="w-full bg-orange-500 hover:bg-orange-600 text-black">
                    {uploading ? 'Enviando...' : 'Salvar Nova Foto'}
                </Button>
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
