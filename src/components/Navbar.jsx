
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Menu, X, User, LogOut, Settings, Shield, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Navbar = () => {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    // Escuta notificações individuais e de grupo
    const notificationsRef = collection(db, 'notifications');
    const q = query(
        notificationsRef, 
        where('audience', 'in', ['all', userRole, currentUser.uid]),
        orderBy('createdAt', 'desc'),
        limit(20) // Limita para não sobrecarregar
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
        try {
            const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
            const seenNotifications = userDocSnap.data()?.seenNotifications || [];
            
            const newNotifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setNotifications(newNotifications);
    
            const unread = newNotifications.some(n => !seenNotifications.includes(n.id));
            setHasUnread(unread);
        } catch (error) {
            console.error("Erro ao buscar notificações:", error);
        }
    });

    return () => unsubscribe();
  }, [currentUser, userRole]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const markAsSeen = async (notificationId) => {
    if (!currentUser) return;
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        const seen = userDoc.data()?.seenNotifications || [];
        if (!seen.includes(notificationId)) {
          await updateDoc(userRef, {
            seenNotifications: [...seen, notificationId]
          });
        }
    } catch(error) {
        console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  return (
    <nav className="glass-card border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="EPROJECTS" className="h-10" src="https://images.unsplash.com/photo-1572177812156-58036aae439c" />
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-white hover:text-orange-500 transition-colors">
              Início
            </Link>
            {currentUser && (
              <>
                <Link to="/tools" className="text-white hover:text-orange-500 transition-colors">
                  Ferramentas
                </Link>
                <Link to="/budgets" className="text-white hover:text-orange-500 transition-colors">
                  Orçamentos
                </Link>
                {(userRole === 'E-MASTER' || userRole === 'ADMIN') && (
                  <Link to="/courses" className="text-white hover:text-orange-500 transition-colors">
                    Cursos
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {currentUser ? (
              <>
                <DropdownMenu onOpenChange={(open) => open && setHasUnread(false)}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative">
                      <Bell className="w-5 h-5 text-white" />
                      {hasUnread && <span className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>}
                      {hasUnread && <span className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full"></span>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass-card border-white/10 w-80">
                    <div className="p-2 font-bold text-white">Notificações</div>
                    <DropdownMenuSeparator />
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? notifications.map(n => (
                          <DropdownMenuItem key={n.id} onSelect={() => markAsSeen(n.id)} className="flex flex-col items-start focus:bg-orange-500/10">
                            <p className="font-semibold text-white">{n.title}</p>
                            <p className="text-sm text-gray-400 whitespace-pre-wrap">{n.message}</p>
                          </DropdownMenuItem>
                        )) : <p className="p-2 text-sm text-gray-400">Nenhuma notificação.</p>}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                        {currentUser.photoURL ? (
                          <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-black" />
                        )}
                      </div>
                      <span className="text-white">{currentUser.displayName}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass-card border-white/10">
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="focus:bg-orange-500/10">
                      <Settings className="w-4 h-4 mr-2" />
                      Perfil
                    </DropdownMenuItem>
                    {userRole === 'ADMIN' && (
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="focus:bg-orange-500/10">
                        <Shield className="w-4 h-4 mr-2" />
                        Painel Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="focus:bg-red-500/20">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" onClick={() => navigate('/login')} className="text-white hover:text-orange-500">
                  Entrar
                </Button>
                <Button onClick={() => navigate('/register')} className="bg-orange-500 hover:bg-orange-600 text-black">
                  Cadastrar
                </Button>
              </div>
            )}
          </div>

          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-card border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-3">
              <Link to="/" className="block text-white hover:text-orange-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Início
              </Link>
              {currentUser && (
                <>
                  <Link to="/tools" className="block text-white hover:text-orange-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    Ferramentas
                  </Link>
                  <Link to="/budgets" className="block text-white hover:text-orange-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    Orçamentos
                  </Link>
                  {(userRole === 'E-MASTER' || userRole === 'ADMIN') && (
                    <Link to="/courses" className="block text-white hover:text-orange-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      Cursos
                    </Link>
                  )}
                  <Link to="/profile" className="block text-white hover:text-orange-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    Perfil
                  </Link>
                  {userRole === 'ADMIN' && (
                    <Link to="/admin" className="block text-white hover:text-orange-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      Painel Admin
                    </Link>
                  )}
                  <button onClick={() => {handleLogout(); setMobileMenuOpen(false);}} className="block w-full text-left text-white hover:text-orange-500 transition-colors">
                    Sair
                  </button>
                </>
              )}
              {!currentUser && (
                <>
                  <Link to="/login" className="block text-white hover:text-orange-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    Entrar
                  </Link>
                  <Link to="/register" className="block text-white hover:text-orange-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    Cadastrar
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
