
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, orderBy, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calculator, Wrench, Cog, Lock, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from 'react-router-dom';

const ROLE_HIERARCHY = { 'E-BASIC': 1, 'E-TOOL': 2, 'E-MASTER': 3, 'ADMIN': 4 };

const Tools = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [toolForm, setToolForm] = useState({ name: '', description: '', icon: 'wrench', requiredRole: 'E-BASIC', categoryId: '', htmlContent: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '' });

  const loadAllData = useCallback(async () => {
    setLoading(true);
    if (!userRole) return;
    try {
      const categoriesSnapshot = await getDocs(query(collection(db, 'toolCategories'), orderBy('name')));
      const categoriesList = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(categoriesList);

      const toolsSnapshot = await getDocs(collection(db, 'tools'));
      const toolsList = toolsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const userLevel = ROLE_HIERARCHY[userRole] || 0;
      setTools(toolsList.filter(tool => userLevel >= (ROLE_HIERARCHY[tool.requiredRole] || 0)));
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: "Erro ao carregar ferramentas", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userRole, toast]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const openTool = (tool) => {
    if (tool.htmlContent) {
      navigate(`/tool/${tool.id}`);
    } else {
      toast({ title: '🚧 Em desenvolvimento', description: 'Esta ferramenta ainda não tem conteúdo.' });
    }
  };

  const getIcon = (iconName) => ({
    calculator: <Calculator className="w-8 h-8" />,
    wrench: <Wrench className="w-8 h-8" />,
    cog: <Cog className="w-8 h-8" />,
  }[iconName] || <Wrench className="w-8 h-8" />);

  // TOOL CRUD
  const handleSaveTool = async () => {
    try {
      if (editingTool) {
        await updateDoc(doc(db, 'tools', editingTool.id), toolForm);
        toast({ title: 'Ferramenta atualizada!' });
      } else {
        await addDoc(collection(db, 'tools'), toolForm);
        toast({ title: 'Ferramenta criada!' });
      }
      setToolDialogOpen(false); loadAllData();
    } catch (e) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  };
  const handleDeleteTool = async (id) => {
    try { await deleteDoc(doc(db, 'tools', id)); toast({ title: 'Ferramenta excluída!' }); loadAllData(); }
    catch (e) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  };
  const openToolDialog = (tool = null) => {
    setEditingTool(tool);
    setToolForm(tool ? { name: tool.name, description: tool.description, icon: tool.icon, requiredRole: tool.requiredRole, categoryId: tool.categoryId || '', htmlContent: tool.htmlContent || '' } : { name: '', description: '', icon: 'wrench', requiredRole: 'E-BASIC', categoryId: '', htmlContent: '' });
    setToolDialogOpen(true);
  };

  // CATEGORY CRUD
  const handleSaveCategory = async () => {
    if(!categoryForm.name) return;
    try {
        if (editingCategory) {
            await updateDoc(doc(db, 'toolCategories', editingCategory.id), categoryForm);
            toast({ title: 'Categoria atualizada!' });
        } else {
            await addDoc(collection(db, 'toolCategories'), categoryForm);
            toast({ title: 'Categoria criada!' });
        }
        setCategoryDialogOpen(false); loadAllData();
    } catch (e) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  };
  const handleDeleteCategory = async (id) => {
    try { await deleteDoc(doc(db, 'toolCategories', id)); toast({ title: 'Categoria excluída!' }); loadAllData(); }
    catch (e) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  };
   const openCategoryDialog = (category = null) => {
    setEditingCategory(category);
    setCategoryForm(category ? { name: category.name } : { name: '' });
    setCategoryDialogOpen(true);
  };
  
  const toolsByCategory = categories.map(cat => ({
      ...cat,
      tools: tools.filter(tool => tool.categoryId === cat.id)
  })).filter(cat => cat.tools.length > 0);
  
  const uncategorizedTools = tools.filter(tool => !tool.categoryId || !categories.some(c => c.id === tool.categoryId));

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div></div>;

  return (
    <>
      <Helmet><title>Ferramentas - EPROJECTS</title></Helmet>
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Ferramentas</h1>
            <p className="text-gray-400">Seu nível: <span className="text-orange-500 font-semibold">{userRole}</span></p>
          </div>
          {userRole === 'ADMIN' && (
            <div className="flex gap-2">
                <Button onClick={() => openToolDialog()} className="bg-orange-500 hover:bg-orange-600 text-black"><Plus className="w-4 h-4 mr-2" />Nova Ferramenta</Button>
                <Button onClick={() => openCategoryDialog()} variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10"><Plus className="w-4 h-4 mr-2" />Nova Categoria</Button>
            </div>
          )}
        </motion.div>

        {tools.length === 0 && !loading ? (
          <div className="glass-card p-12 rounded-lg text-center"><Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" /><h2 className="text-2xl font-semibold text-white mb-2">Nenhuma ferramenta disponível</h2><p className="text-gray-400">Entre em contato com o administrador para obter acesso ou crie novas ferramentas.</p></div>
        ) : (
          <div className="space-y-12">
            {toolsByCategory.map(category => (
                <div key={category.id}>
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold text-white">{category.name}</h2>
                        {userRole === 'ADMIN' && (
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => openCategoryDialog(category)}><Edit className="w-4 h-4"/></Button>
                                <AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="w-8 h-8"><Trash2 className="w-4 h-4 text-red-500"/></Button></AlertDialogTrigger><AlertDialogContent className="glass-card"><AlertDialogHeader><AlertDialogTitle>Excluir Categoria?</AlertDialogTitle><AlertDialogDescription>Isso não excluirá as ferramentas dentro dela. Elas ficarão sem categoria.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{category.tools.map((tool, index) => <ToolCard key={tool.id} tool={tool} index={index} getIcon={getIcon} openTool={openTool} openToolDialog={openToolDialog} handleDeleteTool={handleDeleteTool} isAdmin={userRole === 'ADMIN'}/>)}</div>
                </div>
            ))}
            {uncategorizedTools.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Outras Ferramentas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{uncategorizedTools.map((tool, index) => <ToolCard key={tool.id} tool={tool} index={index} getIcon={getIcon} openTool={openTool} openToolDialog={openToolDialog} handleDeleteTool={handleDeleteTool} isAdmin={userRole === 'ADMIN'}/>)}</div>
                </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={toolDialogOpen} onOpenChange={setToolDialogOpen}><DialogContent className="glass-card max-w-2xl"><DialogHeader><DialogTitle className="text-white">{editingTool ? 'Editar' : 'Nova'} Ferramenta</DialogTitle></DialogHeader><div className="space-y-4"><Label className="text-white">Nome</Label><Input value={toolForm.name} onChange={(e)=>setToolForm({...toolForm, name: e.target.value})} className="bg-white/5 border-white/10 text-white"/> <Label className="text-white">Descrição</Label><Textarea value={toolForm.description} onChange={(e)=>setToolForm({...toolForm, description: e.target.value})} className="bg-white/5 border-white/10 text-white"/> <div className="grid grid-cols-2 gap-4"><div><Label className="text-white">Ícone</Label><Select value={toolForm.icon} onValueChange={(v)=>setToolForm({...toolForm, icon: v})}><SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue/></SelectTrigger><SelectContent className="glass-card"><SelectItem value="calculator">Calculadora</SelectItem><SelectItem value="wrench">Chave</SelectItem><SelectItem value="cog">Engrenagem</SelectItem></SelectContent></Select></div><div><Label className="text-white">Nível</Label><Select value={toolForm.requiredRole} onValueChange={(v)=>setToolForm({...toolForm, requiredRole: v})}><SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue/></SelectTrigger><SelectContent className="glass-card"><SelectItem value="E-BASIC">E-BASIC</SelectItem><SelectItem value="E-TOOL">E-TOOL</SelectItem><SelectItem value="E-MASTER">E-MASTER</SelectItem></SelectContent></Select></div></div> <Label className="text-white">Categoria</Label><Select value={toolForm.categoryId} onValueChange={(v)=>setToolForm({...toolForm, categoryId: v})}><SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Sem categoria"/></SelectTrigger><SelectContent className="glass-card">{categories.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select> <Label className="text-white">Código HTML</Label><Textarea value={toolForm.htmlContent} onChange={(e) => setToolForm({...toolForm, htmlContent: e.target.value})} className="bg-black/50 border-white/10 text-white font-mono h-40" placeholder="Cole seu código HTML aqui..."/> <Button onClick={handleSaveTool} className="w-full bg-orange-500 hover:bg-orange-600 text-black">Salvar</Button></div></DialogContent></Dialog>
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}><DialogContent className="glass-card"><DialogHeader><DialogTitle className="text-white">{editingCategory ? 'Editar' : 'Nova'} Categoria</DialogTitle></DialogHeader><div className="space-y-4"><Label className="text-white">Nome da Categoria</Label><Input value={categoryForm.name} onChange={(e)=>setCategoryForm({name: e.target.value})} className="bg-white/5 border-white/10 text-white"/> <Button onClick={handleSaveCategory} className="w-full bg-orange-500 hover:bg-orange-600 text-black">Salvar</Button></div></DialogContent></Dialog>
    </>
  );
};

const ToolCard = ({ tool, index, getIcon, openTool, openToolDialog, handleDeleteTool, isAdmin }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="glass-card glass-card-hover p-6 rounded-lg group flex flex-col">
        <div className="flex justify-between items-start">
            <div className="text-orange-500 mb-4">{getIcon(tool.icon)}</div>
            {isAdmin && <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button size="icon" variant="ghost" className="w-8 h-8" onClick={()=>openToolDialog(tool)}><Edit className="w-4 h-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="w-8 h-8"><Trash2 className="w-4 h-4 text-red-500"/></Button></AlertDialogTrigger><AlertDialogContent className="glass-card"><AlertDialogHeader><AlertDialogTitle>Excluir Ferramenta?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>handleDeleteTool(tool.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>}
        </div>
        <div onClick={() => openTool(tool)} className="cursor-pointer flex-grow flex flex-col">
            <h3 className="text-xl font-semibold text-white mb-2">{tool.name}</h3>
            <p className="text-gray-400 mb-4 h-10 flex-grow">{tool.description}</p>
            <span className="text-xs px-3 py-1 rounded-full bg-orange-500/20 text-orange-500 self-start">{tool.requiredRole}</span>
        </div>
    </motion.div>
);

export default Tools;
