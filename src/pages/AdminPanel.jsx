
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, writeBatch, query, where, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Users, Bell, Shield, Code, Calendar as CalendarIcon, Edit, Trash2, Ban } from 'lucide-react';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [bonusCodes, setBonusCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [dialogOpen, setDialogopen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [bonusCodeDialogOpen, setBonusCodeDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({ role: '', roleExpiresAt: null, status: '' });
  const [notificationData, setNotificationData] = useState({ message: '', userId: '' });
  const [bonusCodeData, setBonusCodeData] = useState({ role: 'E-MASTER', durationDays: 7, uses: 1 });

  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setUsers(usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const codesSnapshot = await getDocs(collection(db, 'bonusCodes'));
      setBonusCodes(codesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (e) { toast({ title: 'Erro ao carregar dados', description: e.message, variant: 'destructive' }); } 
    finally { setLoading(false); }
  }, [toast]);
  
  useEffect(() => { loadData(); }, [loadData]);
  
  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);
  
  const openEditDialog = (user) => {
    setEditingUser(user);
    setFormData({ 
      role: user.role, 
      roleExpiresAt: user.roleExpiresAt?.toDate() || null,
      status: user.status || 'active'
    });
    setDialogopen(true);
  };
  
  const handleUserUpdate = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        role: formData.role,
        roleExpiresAt: formData.roleExpiresAt,
        status: formData.status
      });
      toast({ title: 'Usuário atualizado!' });
      setDialogopen(false);
      loadData();
    } catch(e) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };
  
  const handleBanUser = async (user) => {
    try {
      await updateDoc(doc(db, 'users', user.id), { status: 'banned' });
      toast({ title: `${user.name} foi banido.` });
      loadData();
    } catch (e) { toast({ title: 'Erro ao banir', description: e.message, variant: 'destructive' }); }
  };
  
  const handleSendNotification = async () => {
    if(!notificationData.message) return;
    try {
        const audience = notificationData.userId ? [notificationData.userId] : users.map(u => u.id);
        const batch = writeBatch(db);
        audience.forEach(userId => {
            const ref = doc(collection(db, 'notifications'));
            batch.set(ref, {
                message: notificationData.message,
                userId: userId,
                createdAt: serverTimestamp(),
                read: false,
            });
        });
        await batch.commit();
        toast({title: 'Notificação enviada!'});
        setNotificationDialogOpen(false);
        setNotificationData({ message: '', userId: '' });
    } catch (e) { toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' }); }
  };

  const generateRandomCode = (length = 8) => {
    return [...Array(length)].map(() => Math.random().toString(36)[2]).join('').toUpperCase();
  };

  const handleCreateBonusCode = async () => {
    try {
        const code = generateRandomCode();
        await addDoc(collection(db, 'bonusCodes'), {
            code,
            role: bonusCodeData.role,
            durationDays: Number(bonusCodeData.durationDays),
            usesLeft: Number(bonusCodeData.uses),
            createdAt: serverTimestamp()
        });
        toast({title: 'Código Bônus Criado!', description: `Código: ${code}`});
        setBonusCodeDialogOpen(false);
        loadData();
    } catch (e) { toast({ title: 'Erro ao criar código', description: e.message, variant: 'destructive' }); }
  };

  const handleDeleteBonusCode = async (codeId) => {
     try {
        await deleteDoc(doc(db, 'bonusCodes', codeId));
        toast({title: 'Código excluído!'});
        loadData();
    } catch (e) { toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' }); }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div></div>;

  return (
    <>
      <Helmet><title>Painel Admin - EPROJECTS</title></Helmet>
      <div className="max-w-6xl mx-auto">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold text-white mb-8">Painel Administrativo</motion.h1>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-black/20 mb-6">
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Usuários</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-2" />Notificações</TabsTrigger>
            <TabsTrigger value="bonus-codes"><Code className="w-4 h-4 mr-2" />Códigos Bônus</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Input placeholder="Buscar por nome ou email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white/5 border-white/10 text-white mb-6" />
            <div className="glass-card p-4 rounded-lg">
              {filteredUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 border-b border-white/10 last:border-b-0">
                  <div className="flex items-center gap-4">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}&background=ff6a00&color=000`} alt={user.name} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-semibold text-white">{user.name} {user.status === 'banned' && <span className="text-red-500 text-xs ml-2">(Banido)</span>}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">{user.role}</span>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}><Edit className="w-4 h-4 text-gray-400" /></Button>
                    {user.status !== 'banned' && user.role !== 'ADMIN' && (
                       <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Ban className="w-4 h-4 text-red-500" /></Button></AlertDialogTrigger>
                          <AlertDialogContent className="glass-card">
                            <AlertDialogHeader><AlertDialogTitle>Banir {user.name}?</AlertDialogTitle><AlertDialogDescription>O usuário perderá o acesso à plataforma. Esta ação pode ser revertida.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleBanUser(user)}>Confirmar Banimento</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="glass-card p-6 rounded-lg">
                <Button onClick={() => setNotificationDialogOpen(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-black">Enviar Nova Notificação</Button>
            </div>
          </TabsContent>
          
          {/* Bonus Codes Tab */}
          <TabsContent value="bonus-codes">
            <div className="glass-card p-6 rounded-lg">
                <Button onClick={() => setBonusCodeDialogOpen(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-black mb-6">Gerar Novo Código Bônus</Button>
                <h3 className="text-white text-lg font-semibold mb-4">Códigos Ativos</h3>
                {bonusCodes.map(code => (
                    <div key={code.id} className="flex items-center justify-between p-3 border-b border-white/10 last:border-b-0">
                        <div>
                            <p className="font-mono text-lg text-orange-400">{code.code}</p>
                            <p className="text-sm text-gray-300">Dá <span className="font-bold">{code.durationDays} dias</span> de <span className="font-bold">{code.role}</span>. Usos restantes: <span className="font-bold">{code.usesLeft}</span></p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-500"/></Button></AlertDialogTrigger>
                            <AlertDialogContent className="glass-card"><AlertDialogHeader><AlertDialogTitle>Excluir código?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>handleDeleteBonusCode(code.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                        </AlertDialog>
                    </div>
                ))}
            </div>
          </TabsContent>

        </Tabs>
      </div>
      
      {/* Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogopen}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle className="text-white">Editar Usuário: {editingUser?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-white">Cargo</Label><Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}><SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent className="glass-card"><SelectItem value="E-BASIC">E-BASIC</SelectItem><SelectItem value="E-TOOL">E-TOOL</SelectItem><SelectItem value="E-MASTER">E-MASTER</SelectItem><SelectItem value="ADMIN">ADMIN</SelectItem></SelectContent></Select></div>
            <div><Label className="text-white">Status</Label><Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}><SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent className="glass-card"><SelectItem value="active">Ativo</SelectItem><SelectItem value="banned">Banido</SelectItem></SelectContent></Select></div>
            <div><Label className="text-white">Expiração do Cargo</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className="w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">{formData.roleExpiresAt ? format(formData.roleExpiresAt, "PPP", {locale: ptBR}) : <span>Sem data de expiração</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0 glass-card"><Calendar mode="single" selected={formData.roleExpiresAt} onSelect={(d) => setFormData({...formData, roleExpiresAt: d})} initialFocus /></PopoverContent></Popover></div>
            <Button onClick={handleUserUpdate} className="w-full bg-orange-500 hover:bg-orange-600 text-black">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}><DialogContent className="glass-card"><DialogHeader><DialogTitle className="text-white">Enviar Notificação</DialogTitle></DialogHeader><div className="space-y-4"> <Label className="text-white">Mensagem</Label><Textarea value={notificationData.message} onChange={(e)=>setNotificationData({...notificationData, message: e.target.value})} className="bg-white/5 border-white/10 text-white"/> <Label className="text-white">Destinatário</Label><Select value={notificationData.userId} onValueChange={(v)=>setNotificationData({...notificationData, userId: v})}><SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Todos os usuários"/></SelectTrigger><SelectContent className="glass-card"><SelectItem value="">Todos os usuários</SelectItem>{users.map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select> <Button onClick={handleSendNotification} className="w-full bg-orange-500 hover:bg-orange-600 text-black">Enviar</Button></div></DialogContent></Dialog>
      
      {/* Create Bonus Code Dialog */}
      <Dialog open={bonusCodeDialogOpen} onOpenChange={setBonusCodeDialogOpen}><DialogContent className="glass-card"><DialogHeader><DialogTitle className="text-white">Gerar Código Bônus</DialogTitle></DialogHeader><div className="space-y-4"> <Label className="text-white">Cargo Concedido</Label><Select defaultValue="E-MASTER" onValueChange={(v)=>setBonusCodeData({...bonusCodeData, role: v})}><SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue/></SelectTrigger><SelectContent className="glass-card"><SelectItem value="E-TOOL">E-TOOL</SelectItem><SelectItem value="E-MASTER">E-MASTER</SelectItem></SelectContent></Select> <Label className="text-white">Duração (dias)</Label><Input type="number" value={bonusCodeData.durationDays} onChange={(e)=>setBonusCodeData({...bonusCodeData, durationDays: e.target.value})} className="bg-white/5 border-white/10 text-white"/> <Label className="text-white">Quantidade de Usos</Label><Input type="number" value={bonusCodeData.uses} onChange={(e)=>setBonusCodeData({...bonusCodeData, uses: e.target.value})} className="bg-white/5 border-white/10 text-white"/> <Button onClick={handleCreateBonusCode} className="w-full bg-orange-500 hover:bg-orange-600 text-black">Gerar Código</Button></div></DialogContent></Dialog>

    </>
  );
};

export default AdminPanel;
