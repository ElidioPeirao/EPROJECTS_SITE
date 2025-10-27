
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Video, Paperclip, Trash2, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';
import YouTube from 'react-youtube';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', videoType: 'youtube', videoUrl: '', videoFile: null, materials: [] });
  const { toast } = useToast();

  const loadCourseData = useCallback(async () => {
    try {
      const courseDoc = await getDoc(doc(db, 'courses', id));
      if (!courseDoc.exists()) {
        toast({ title: 'Curso não encontrado', variant: 'destructive' });
        navigate('/courses');
        return;
      }
      setCourse({ id: courseDoc.id, ...courseDoc.data() });

      const lessonsRef = collection(db, 'courses', id, 'lessons');
      const q = query(lessonsRef, orderBy('createdAt', 'asc'));
      const lessonsSnapshot = await getDocs(q);
      const lessonsList = lessonsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLessons(lessonsList);
      if (lessonsList.length > 0) {
        setSelectedLesson(lessonsList[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do curso:", error);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  const handleAddLesson = async (e) => {
    e.preventDefault();
    try {
      let finalVideoUrl = lessonForm.videoUrl;
      if (lessonForm.videoType === 'upload' && lessonForm.videoFile) {
        const fileRef = ref(storage, `courses/${id}/videos/${Date.now()}_${lessonForm.videoFile.name}`);
        await uploadBytes(fileRef, lessonForm.videoFile);
        finalVideoUrl = await getDownloadURL(fileRef);
      }

      const materialUrls = [];
      for (const file of lessonForm.materials) {
        const materialRef = ref(storage, `courses/${id}/materials/${Date.now()}_${file.name}`);
        await uploadBytes(materialRef, file);
        const url = await getDownloadURL(materialRef);
        materialUrls.push({ name: file.name, url });
      }

      await addDoc(collection(db, 'courses', id, 'lessons'), {
        title: lessonForm.title,
        videoType: lessonForm.videoType,
        videoUrl: finalVideoUrl,
        materials: materialUrls,
        createdAt: new Date().toISOString(),
      });

      toast({ title: 'Aula adicionada!' });
      setDialogOpen(false);
      setLessonForm({ title: '', videoType: 'youtube', videoUrl: '', videoFile: null, materials: [] });
      loadCourseData();
    } catch (error) {
      toast({ title: 'Erro ao adicionar aula', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    try {
        await deleteDoc(doc(db, 'courses', id, 'lessons', lessonId));
        toast({ title: 'Aula excluída!' });
        loadCourseData();
    } catch (error) {
        toast({ title: 'Erro ao excluir aula', description: error.message, variant: 'destructive' });
    }
  };

  const getYoutubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div></div>;
  if (!course) return null;

  return (
    <>
      <Helmet><title>{course.title} - EPROJECTS</title></Helmet>
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/courses')} className="mb-6 text-white hover:text-orange-500"><ArrowLeft className="w-4 h-4 mr-2" />Voltar para Cursos</Button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
            <div className="glass-card rounded-lg overflow-hidden mb-6">
              {selectedLesson ? (
                <>
                  <div className="aspect-video bg-black flex items-center justify-center">
                    {selectedLesson.videoType === 'youtube' ? (
                      <YouTube videoId={getYoutubeVideoId(selectedLesson.videoUrl)} opts={{ width: '100%', height: '100%' }} containerClassName="w-full h-full" />
                    ) : (
                      <video src={selectedLesson.videoUrl} controls className="w-full h-full" />
                    )}
                  </div>
                  <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-4">{selectedLesson.title}</h2>
                    {selectedLesson.materials.length > 0 && (
                      <>
                        <h3 className="text-lg font-semibold text-white mt-6 mb-2">Materiais de Apoio</h3>
                        <div className="space-y-2">
                          {selectedLesson.materials.map((mat, i) => (
                            <a key={i} href={mat.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-orange-500 hover:underline"><Paperclip className="w-4 h-4" /><span>{mat.name}</span></a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="aspect-video bg-black flex items-center justify-center p-6"><p className="text-gray-400">Selecione uma aula para começar.</p></div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
            <div className="glass-card p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Aulas</h2>
                {userRole === 'ADMIN' && (
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black"><Plus className="w-4 h-4" /></Button></DialogTrigger>
                    <DialogContent className="glass-card border-white/10">
                      <DialogHeader><DialogTitle className="text-white">Adicionar Nova Aula</DialogTitle></DialogHeader>
                      <form onSubmit={handleAddLesson} className="space-y-4">
                        <div><Label className="text-white">Título da Aula</Label><Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} className="bg-white/5 border-white/10 text-white" required /></div>
                        <div className="flex items-center space-x-4"><Label className="text-white">Tipo de Vídeo:</Label>
                          <div className="flex items-center space-x-2"><input type="radio" id="youtube" name="videoType" value="youtube" checked={lessonForm.videoType === 'youtube'} onChange={(e) => setLessonForm({ ...lessonForm, videoType: e.target.value })} /><Label htmlFor="youtube" className="text-white">YouTube</Label></div>
                          <div className="flex items-center space-x-2"><input type="radio" id="upload" name="videoType" value="upload" checked={lessonForm.videoType === 'upload'} onChange={(e) => setLessonForm({ ...lessonForm, videoType: e.target.value })} /><Label htmlFor="upload" className="text-white">Upload</Label></div>
                        </div>
                        {lessonForm.videoType === 'youtube' ? (
                          <div><Label className="text-white">URL do Vídeo (YouTube)</Label><Input value={lessonForm.videoUrl} onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} className="bg-white/5 border-white/10 text-white" /></div>
                        ) : (
                          <div><Label className="text-white">Arquivo de Vídeo</Label><Input type="file" accept="video/*" onChange={(e) => setLessonForm({ ...lessonForm, videoFile: e.target.files[0] })} className="bg-white/5 border-white/10 text-white" /></div>
                        )}
                        <div><Label className="text-white">Materiais de Apoio</Label><Input type="file" multiple onChange={(e) => setLessonForm({ ...lessonForm, materials: Array.from(e.target.files) })} className="bg-white/5 border-white/10 text-white" /></div>
                        <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-black">Adicionar Aula</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <ul className="space-y-2">
                {lessons.map((lesson, index) => (
                  <li key={lesson.id} onClick={() => setSelectedLesson(lesson)} className={`p-3 rounded-lg cursor-pointer transition-colors flex justify-between items-center ${selectedLesson?.id === lesson.id ? 'bg-orange-500/20' : 'hover:bg-white/5'}`}>
                    <span className="text-white">{index + 1}. {lesson.title}</span>
                    {userRole === 'ADMIN' && (
                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }} className="w-8 h-8"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default CourseDetail;
