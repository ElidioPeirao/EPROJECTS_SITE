
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, FileText, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Budgets = () => {
  const { currentUser, userRole } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    files: []
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadBudgets();
  }, [currentUser, userRole]);

  const loadBudgets = async () => {
    try {
      const budgetsRef = collection(db, 'budgets');
      let q;
      
      if (userRole === 'ADMIN') {
        q = query(budgetsRef, orderBy('createdAt', 'desc'));
      } else {
        q = query(budgetsRef, where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      const budgetsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBudgets(budgetsList);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, files: Array.from(e.target.files) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.type || !formData.description) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      const fileUrls = [];
      
      for (const file of formData.files) {
        const fileRef = ref(storage, `budgets/${currentUser.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        fileUrls.push({ name: file.name, url });
      }

      await addDoc(collection(db, 'budgets'), {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userEmail: currentUser.email,
        type: formData.type,
        description: formData.description,
        files: fileUrls,
        status: 'Em análise',
        createdAt: new Date().toISOString(),
        messages: []
      });

      toast({
        title: 'Orçamento enviado!',
        description: 'Entraremos em contato em breve',
      });

      setDialogOpen(false);
      setFormData({ type: '', description: '', files: [] });
      loadBudgets();
    } catch (error) {
      toast({
        title: 'Erro ao enviar orçamento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Em análise': 'bg-yellow-500/20 text-yellow-500',
      'Aprovado': 'bg-green-500/20 text-green-500',
      'Em produção': 'bg-blue-500/20 text-blue-500',
      'Concluído': 'bg-purple-500/20 text-purple-500',
      'Cancelado': 'bg-red-500/20 text-red-500'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Orçamentos - EPROJECTS</title>
        <meta name="description" content="Gerencie seus orçamentos" />
      </Helmet>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-white mb-2">Orçamentos</h1>
            <p className="text-gray-400">Gerencie suas solicitações</p>
          </motion.div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-black">
                <Plus className="w-4 h-4 mr-2" />
                Novo Orçamento
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Solicitar Orçamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="type" className="text-white">Tipo de Serviço</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="Projeto Industrial">Projeto Industrial</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                      <SelectItem value="Consultoria">Consultoria</SelectItem>
                      <SelectItem value="Prototipagem">Prototipagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-white/5 border-white/10 text-white min-h-[120px]"
                    placeholder="Descreva seu projeto em detalhes..."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="files" className="text-white">Anexos (opcional)</Label>
                  <div className="mt-1">
                    <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-orange-500/50 transition-colors">
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm text-gray-400">
                          Clique para selecionar arquivos
                        </span>
                      </div>
                      <input
                        id="files"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.stl"
                      />
                    </label>
                    {formData.files.length > 0 && (
                      <p className="text-sm text-gray-400 mt-2">
                        {formData.files.length} arquivo(s) selecionado(s)
                      </p>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-black">
                  Enviar Orçamento
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {budgets.length === 0 ? (
          <div className="glass-card p-12 rounded-lg text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">Nenhum orçamento ainda</h2>
            <p className="text-gray-400 mb-6">Comece solicitando seu primeiro orçamento</p>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-black"
            >
              Solicitar Orçamento
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {budgets.map((budget, index) => (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card glass-card-hover p-6 rounded-lg cursor-pointer"
                onClick={() => navigate(`/budgets/${budget.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">{budget.type}</h3>
                    <p className="text-sm text-gray-400">
                      {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(budget.status)}`}>
                    {budget.status}
                  </span>
                </div>
                <p className="text-gray-300 line-clamp-2">{budget.description}</p>
                {userRole === 'ADMIN' && (
                  <p className="text-sm text-gray-400 mt-2">Cliente: {budget.userName}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Budgets;
