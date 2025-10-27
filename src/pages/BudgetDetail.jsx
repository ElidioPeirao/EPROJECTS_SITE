
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Send, Paperclip, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const BudgetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [newStatus, setNewStatus] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadBudget();
  }, [id]);

  const loadBudget = async () => {
    try {
      const budgetDoc = await getDoc(doc(db, 'budgets', id));
      
      if (!budgetDoc.exists()) {
        toast({
          title: 'Orçamento não encontrado',
          variant: 'destructive',
        });
        navigate('/budgets');
        return;
      }

      const budgetData = { id: budgetDoc.id, ...budgetDoc.data() };
      
      if (userRole !== 'ADMIN' && budgetData.userId !== currentUser.uid) {
        toast({
          title: 'Acesso negado',
          variant: 'destructive',
        });
        navigate('/budgets');
        return;
      }

      setBudget(budgetData);
      setNewStatus(budgetData.status);
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && files.length === 0) return;

    try {
      const fileUrls = [];
      
      for (const file of files) {
        const fileRef = ref(storage, `budgets/${id}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        fileUrls.push({ name: file.name, url });
      }

      const newMessage = {
        sender: currentUser.displayName,
        senderRole: userRole,
        text: message,
        files: fileUrls,
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, 'budgets', id), {
        messages: arrayUnion(newMessage)
      });

      setMessage('');
      setFiles([]);
      loadBudget();

      toast({
        title: 'Mensagem enviada!',
      });
    } catch (error) {
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async () => {
    if (userRole !== 'ADMIN') return;

    try {
      await updateDoc(doc(db, 'budgets', id), {
        status: newStatus
      });

      toast({
        title: 'Status atualizado!',
      });

      loadBudget();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!budget) return null;

  return (
    <>
      <Helmet>
        <title>Orçamento #{id.slice(0, 8)} - EPROJECTS</title>
        <meta name="description" content="Detalhes do orçamento" />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/budgets')}
          className="mb-6 text-white hover:text-orange-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-lg mb-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{budget.type}</h1>
              <p className="text-gray-400">
                Criado em {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
              </p>
              {userRole === 'ADMIN' && (
                <p className="text-gray-400">Cliente: {budget.userName} ({budget.userEmail})</p>
              )}
            </div>
            {userRole === 'ADMIN' && (
              <div className="flex items-center space-x-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    <SelectItem value="Em análise">Em análise</SelectItem>
                    <SelectItem value="Aprovado">Aprovado</SelectItem>
                    <SelectItem value="Em produção">Em produção</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleStatusChange} className="bg-orange-500 hover:bg-orange-600 text-black">
                  Atualizar
                </Button>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">Descrição</h2>
            <p className="text-gray-300">{budget.description}</p>
          </div>

          {budget.files && budget.files.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Anexos</h2>
              <div className="space-y-2">
                {budget.files.map((file, index) => (
                  <a
                    key={index}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-orange-500 hover:text-orange-400"
                  >
                    <Download className="w-4 h-4" />
                    <span>{file.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-lg"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Comunicação</h2>

          <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
            {budget.messages && budget.messages.length > 0 ? (
              budget.messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    msg.senderRole === 'ADMIN' ? 'bg-orange-500/10' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{msg.sender}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {msg.text && <p className="text-gray-300">{msg.text}</p>}
                  {msg.files && msg.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.files.map((file, i) => (
                        <a
                          key={i}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-orange-500 hover:text-orange-400 text-sm"
                        >
                          <Download className="w-3 h-3" />
                          <span>{file.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">Nenhuma mensagem ainda</p>
            )}
          </div>

          <div className="space-y-4">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="bg-white/5 border-white/10 text-white"
            />

            <div className="flex items-center space-x-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files))}
                  className="hidden"
                />
                <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <Paperclip className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">
                    {files.length > 0 ? `${files.length} arquivo(s)` : 'Anexar'}
                  </span>
                </div>
              </label>

              <Button
                onClick={handleSendMessage}
                className="bg-orange-500 hover:bg-orange-600 text-black ml-auto"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default BudgetDetail;
