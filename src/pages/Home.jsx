
import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Wrench, Calculator, FileText, Zap } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Wrench className="w-8 h-8" />,
      title: 'Ferramentas Avançadas',
      description: 'Acesso a calculadoras e simuladores de engenharia'
    },
    {
      icon: <Calculator className="w-8 h-8" />,
      title: 'Orçamentos Rápidos',
      description: 'Sistema inteligente de cotação e acompanhamento'
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Gestão de Projetos',
      description: 'Organize e acompanhe seus projetos industriais'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Prototipagem 3D',
      description: 'Cálculo automático para impressão 3D'
    }
  ];

  return (
    <>
      <Helmet>
        <title>EPROJECTS - Soluções em Engenharia</title>
        <meta name="description" content="Plataforma completa para projetos industriais, manutenção, consultoria e prototipagem" />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        <section className="flex-1 flex items-center justify-center py-20">
          <div className="text-center space-y-8 max-w-4xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
                Bem-vindo à <span className="text-orange-500">EPROJECTS</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-8">
                Soluções completas em engenharia industrial
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button 
                size="lg" 
                className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                onClick={() => navigate('/register')}
              >
                Começar Agora
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black"
                onClick={() => navigate('/budgets')}
              >
                Solicitar Orçamento
              </Button>
            </motion.div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-4xl font-bold text-center text-white mb-12"
            >
              Nossos Serviços
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card glass-card-hover p-6 rounded-lg"
                >
                  <div className="text-orange-500 mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Home;
