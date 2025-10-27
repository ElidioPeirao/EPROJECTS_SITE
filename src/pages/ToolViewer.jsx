
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Helmet } from 'react-helmet';

const ToolViewer = () => {
    const { toolId } = useParams();
    const [tool, setTool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTool = async () => {
            try {
                const toolDoc = await getDoc(doc(db, 'tools', toolId));
                if (toolDoc.exists()) {
                    setTool(toolDoc.data());
                } else {
                    setError('Ferramenta não encontrada.');
                }
            } catch (err) {
                setError('Erro ao carregar a ferramenta.');
            } finally {
                setLoading(false);
            }
        };

        fetchTool();
    }, [toolId]);

    // Bloquear clique direito e atalhos de inspeção
    useEffect(() => {
        const handleContextMenu = (e) => e.preventDefault();
        const handleKeyDown = (e) => {
            if (
                (e.ctrlKey && e.shiftKey && e.key === 'I') || // Ctrl+Shift+I
                (e.ctrlKey && e.shiftKey && e.key === 'C') || // Ctrl+Shift+C
                (e.ctrlKey && e.shiftKey && e.key === 'J') || // Ctrl+Shift+J
                (e.ctrlKey && e.key === 'U') || // Ctrl+U
                e.key === 'F12' // F12
            ) {
                e.preventDefault();
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    if (loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{tool?.name || 'Ferramenta'} - EPROJECTS</title>
                <style>{`
                    body, html {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        overflow: hidden; /* ou auto, dependendo do conteúdo */
                    }
                `}</style>
            </Helmet>
            <div
                className="w-full h-screen"
                dangerouslySetInnerHTML={{ __html: tool?.htmlContent }}
            />
        </>
    );
};

export default ToolViewer;
