
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, getDocs, query, orderBy, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';
import { Plus, BookOpen, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Courses = () => {
  const { userRole } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', imageFile: null });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try {
      const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      toast({ title: 'Erro ao carregar cursos', variant: 'destructive', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', imageFile: null });
    setEditingCourse(null);
  }

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return toast({ title: 'Preencha todos os campos', variant: 'destructive' });

    try {
      let imageUrl = editingCourse?.imageUrl || '';
      if (formData.imageFile) {
        const imageRef = ref(storage, `courses/images/${Date.now()}_${formData.imageFile.name}`);
        await uploadBytes(imageRef, formData.imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const courseData = { title: formData.title, description: formData.description, imageUrl };

      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), courseData);
        toast({ title: 'Curso atualizado!' });
      } else {
        await addDoc(collection(db, 'courses'), { ...courseData, createdAt: new Date().toISOString() });
        toast({ title: 'Curso criado!' });
      }
      
      setDialogOpen(false);
      resetForm();
      loadCourses();

    } catch (error) {
      toast({ title: 'Erro ao salvar curso', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteCourse = async (courseId, imageUrl) => {
    try {
      // Deletar o documento do curso no Firestore
      await deleteDoc(doc(db, 'courses', courseId));

      // Se houver uma imagem, deletá-la do Storage
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(err => console.warn("Imagem não encontrada no storage, pode já ter sido removida:", err));
      }

      toast({ title: 'Curso excluído com sucesso!' });
      loadCourses();
    } catch (error) {
      toast({ title: 'Erro ao excluir curso', description: error.message, variant: 'destructive' });
    }
  };

  const openEditDialog = (course) => {
    setEditingCourse(course);
    setFormData({ title: course.title, description: course.description, imageFile: null });
    setDialogOpen(true);
  };
  
  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div></div>;

  return (
    <>
      <Helmet><title>Cursos - EPROJECTS</title></Helmet>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold text-white mb-2">Cursos</h1>
            <p className="text-gray-400">Aprenda com nossos especialistas</p>
          </motion.div>
          {userRole === 'ADMIN' && (
            <Dialog open={dialogOpen} onOpenChange={(isOpen) => { if(!isOpen) resetForm(); setDialogOpen(isOpen);}}>
              <DialogTrigger asChild><Button onClick={openCreateDialog} className="bg-orange-500 hover:bg-orange-600 text-black"><Plus className="w-4 h-4 mr-2" />Novo Curso</Button></DialogTrigger>
              <DialogContent className="glass-card border-white/10">
                <DialogHeader><DialogTitle className="text-white">{editingCourse ? 'Editar Curso' : 'Criar Novo Curso'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSaveCourse} className="space-y-4">
                  <div><Label className="text-white">Título</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-white/5 border-white/10 text-white" required /></div>
                  <div><Label className="text-white">Descrição</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-white/5 border-white/10 text-white" required /></div>
                  <div><Label className="text-white">Imagem de Capa</Label><Input type="file" accept="image/*" onChange={(e) => setFormData({...formData, imageFile: e.target.files[0]})} className="bg-white/5 border-white/10 text-white file:text-orange-500"/></div>
                  {(editingCourse?.imageUrl || formData.imageFile) && <div className="text-center"><img src={formData.imageFile ? URL.createObjectURL(formData.imageFile) : editingCourse.imageUrl} alt="preview" className="w-full h-32 object-cover rounded-md mt-2"/></div>}
                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-black">Salvar Curso</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {courses.length === 0 ? (
          <div className="glass-card p-12 rounded-lg text-center"><BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" /><h2 className="text-2xl font-semibold text-white mb-2">Nenhum curso disponível</h2><p className="text-gray-400">Novos cursos serão adicionados em breve.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => (
              <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="glass-card glass-card-hover rounded-lg overflow-hidden flex flex-col group">
                <div className="relative">
                    <img src={course.imageUrl || `https://source.unsplash.com/random/400x225?technology,engineering&sig=${index}`} alt={course.title} className="w-full h-40 object-cover" />
                    {userRole === 'ADMIN' && (
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" onClick={(e) => {e.stopPropagation(); openEditDialog(course)}} className="bg-black/50 hover:bg-black/70"><Edit className="w-4 h-4 text-white"/></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button size="icon" variant="ghost" onClick={(e) => e.stopPropagation()} className="bg-black/50 hover:bg-black/70"><Trash2 className="w-4 h-4 text-red-400"/></Button></AlertDialogTrigger>
                                <AlertDialogContent className="glass-card">
                                    <AlertDialogHeader><AlertDialogTitle>Excluir este curso?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Todas as aulas e materiais do curso serão perdidos.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={(e) => {e.stopPropagation(); handleDeleteCourse(course.id, course.imageUrl)}}>Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>
                <div className="p-6 flex flex-col flex-grow cursor-pointer" onClick={() => navigate(`/courses/${course.id}`)}>
                    <h3 className="text-xl font-semibold text-white mb-2">{course.title}</h3>
                    <p className="text-gray-400 line-clamp-3 flex-grow">{course.description}</p>
                    <Button variant="link" className="text-orange-500 p-0 mt-4 self-start">Ver curso &rarr;</Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Courses;
