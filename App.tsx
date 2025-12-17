import React, { useState, useEffect, useRef } from 'react';
import { Plus, Video, CheckCircle2, Inbox, Bell, ShoppingBag, CalendarDays, Wrench, Sparkles, User, TrendingUp, LayoutGrid, Mic, Megaphone, CheckCircle, RefreshCw, Eraser, Clock } from 'lucide-react';
import { VideoItem, ItemStatus, ExternalVideo, ToolConfig } from './types';
import { VideoItemCard } from './components/VideoItemCard';
import { PostedVideoList } from './components/PostedVideoList';
import { AddItemModal } from './components/AddItemModal';
import { ExternalVideoList } from './components/ExternalVideoList';
import { generateVideoContent, findSimilarProducts } from './services/geminiService';
import { deleteVideo } from './services/videoStorage';
import { fetchExternalVideos } from './services/csvService';
import { ToolModal } from './components/ToolModal';

// Valid short audio (beep/silent wav) to prevent "The element has no supported sources" error.
const VALID_AUDIO_BASE64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==";

const TOOLS: ToolConfig[] = [
  { id: 'reels_script', title: 'Roteiro de Reels', icon: Video, color: 'bg-pink-500', description: 'Crie roteiros virais para TikTok/Reels.', inputLabel: 'Sobre o que é o vídeo?', inputPlaceholder: 'Ex: Um processador de alimentos manual...', buttonLabel: 'Gerar Roteiro' },
  { id: 'stories_phrases', title: 'Frases para Stories', icon: LayoutGrid, color: 'bg-orange-500', description: 'Gere frases de engajamento.', inputLabel: 'Produto/Tema', inputPlaceholder: 'Ex: Garrafa térmica...', buttonLabel: 'Gerar Frases' },
  { id: 'narration_script', title: 'Texto para Narração', icon: Mic, color: 'bg-blue-500', description: 'Texto fluido para voz em off.', inputLabel: 'Produto/Cena', inputPlaceholder: 'Descreva o que aparece no vídeo...', buttonLabel: 'Gerar Texto' },
  { id: 'tts', title: 'Gerador de Voz (IA)', icon: Megaphone, color: 'bg-purple-600', description: 'Transforme texto em áudio natural.', inputLabel: 'Texto para falar', inputPlaceholder: 'Digite o texto aqui...', buttonLabel: 'Gerar Áudio' },
  { id: 'daily_plan', title: 'Planejamento Diário', icon: CalendarDays, color: 'bg-green-500', description: 'Ideias de posts para o dia.', inputLabel: 'Nicho/Produto', inputPlaceholder: 'Ex: Casa e Cozinha', buttonLabel: 'Gerar Plano' },
  { id: 'persuasive_invite', title: 'Convite Persuasivo', icon: Bell, color: 'bg-red-500', description: 'Convite para grupos/lives.', inputLabel: 'Oferta/Evento', inputPlaceholder: 'Ex: Grupo de Promoções...', buttonLabel: 'Gerar Convite' },
  { id: 'viral_ad', title: 'Copy para Anúncio', icon: Sparkles, color: 'bg-yellow-500', description: 'Texto para Ads (Tráfego Pago).', inputLabel: 'Produto/Benefício', inputPlaceholder: 'Ex: Fone Bluetooth...', buttonLabel: 'Gerar Copy' },
  { id: 'bio_generator', title: 'Gerador de Bio', icon: User, color: 'bg-cyan-500', description: 'Bio profissional para perfil.', inputLabel: 'Seu Nicho/Nome', inputPlaceholder: 'Ex: Achadinhos da Maria...', buttonLabel: 'Gerar Bio' },
  { id: 'product_validation', title: 'Análise de Produto', icon: CheckCircle, color: 'bg-indigo-500', description: 'Pontos fortes e objeções.', inputLabel: 'Produto', inputPlaceholder: 'Ex: Mini liquidificador...', buttonLabel: 'Analisar' },
  { id: 'trends', title: 'Ideias de Trends', icon: TrendingUp, color: 'bg-rose-500', description: 'Adapte trends para seu nicho.', inputLabel: 'Nicho', inputPlaceholder: 'Ex: Maquiagem...', buttonLabel: 'Buscar Ideias' },
];

export const App = () => {
    const [videoItems, setVideoItems] = useState<VideoItem[]>(() => {
        try {
            const saved = localStorage.getItem('shopee_video_items');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    // New state to persist dismissed/deleted external video IDs
    const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('shopee_dismissed_ids');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    
    const [externalVideos, setExternalVideos] = useState<ExternalVideo[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'posted' | 'inbox' | 'tools'>('inbox');
    
    const [loadingExternal, setLoadingExternal] = useState(false);
    const [lastVisit, setLastVisit] = useState(() => Number(localStorage.getItem('shopee_last_visit') || 0));

    const [selectedTool, setSelectedTool] = useState<ToolConfig | null>(null);
    const [generatingItems, setGeneratingItems] = useState<Record<string, boolean>>({});
    const [findingSimilar, setFindingSimilar] = useState<Record<string, boolean>>({});

    const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>([]);
    const [bulkProgress, setBulkProgress] = useState<{current: number, total: number} | null>(null);
    const [importingId, setImportingId] = useState<string | null>(null);

    // Initializing with valid audio source to prevent errors
    const catAudio = useRef(new Audio(VALID_AUDIO_BASE64));

    useEffect(() => {
        localStorage.setItem('shopee_video_items', JSON.stringify(videoItems));
    }, [videoItems]);

    useEffect(() => {
        localStorage.setItem('shopee_dismissed_ids', JSON.stringify(dismissedIds));
    }, [dismissedIds]);

    useEffect(() => {
        if (activeTab === 'inbox') {
            loadExternalVideos();
        }
    }, [activeTab]);

    // Auto-refresh every 1 hour (3600000 ms)
    useEffect(() => {
        const interval = setInterval(() => {
            console.log("Auto-refreshing external videos...");
            loadExternalVideos();
        }, 3600000);
        return () => clearInterval(interval);
    }, [dismissedIds]); 

    const playMeow = () => {
        try {
            catAudio.current.currentTime = 0;
            const playPromise = catAudio.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    // Auto-play was prevented or source issue
                    console.log("Audio play prevented:", e);
                });
            }
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    const loadExternalVideos = async () => {
        setLoadingExternal(true);
        try {
            const videos = await fetchExternalVideos(lastVisit);
            // Filter out videos that have been dismissed/deleted by the user
            const filteredVideos = videos.filter(v => !dismissedIds.includes(v.id));
            setExternalVideos(filteredVideos);
            
            const now = Date.now();
            setLastVisit(now);
            localStorage.setItem('shopee_last_visit', String(now));
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingExternal(false);
        }
    };

    const handleDismissExternal = (id: string) => {
        setDismissedIds(prev => [...prev, id]);
        setExternalVideos(prev => prev.filter(v => v.id !== id));
    };

    const handleAddItem = (newItem: VideoItem) => {
        setVideoItems(prev => [newItem, ...prev]);
        playMeow();
        if (activeTab === 'inbox') setActiveTab('pending');
    };

    const handleDeleteItem = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir?')) {
            await deleteVideo(id);
            setVideoItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const handleStatusChange = (id: string, status: ItemStatus) => {
        setVideoItems(prev => prev.map(item => 
            item.id === id ? { ...item, status, postedAt: status === 'posted' ? Date.now() : undefined } : item
        ));
    };

    const handleRegenerate = async (item: VideoItem) => {
        setGeneratingItems(prev => ({ ...prev, [item.id]: true }));
        try {
             const aiContent = await generateVideoContent({
                productName: item.productName,
                description: item.description,
                affiliateLink: item.affiliateLink,
                imageBase64: item.thumbnailUrl
             });
             
             setVideoItems(prev => prev.map(i => 
                i.id === item.id ? { ...i, generatedContent: aiContent } : i
             ));
             playMeow();
        } catch (e) {
            alert('Erro ao regerar conteúdo');
        } finally {
            setGeneratingItems(prev => ({ ...prev, [item.id]: false }));
        }
    };

    const handleFindSimilar = async (item: VideoItem) => {
        setFindingSimilar(prev => ({ ...prev, [item.id]: true }));
        try {
            const similar = await findSimilarProducts(item.productName, item.affiliateLink);
            setVideoItems(prev => prev.map(i => 
                i.id === item.id ? { ...i, similarProducts: similar } : i
            ));
        } catch (e) {
            console.error(e);
        } finally {
            setFindingSimilar(prev => ({ ...prev, [item.id]: false }));
        }
    };

    const handleImportExternal = async (extVideo: ExternalVideo) => {
         setImportingId(extVideo.id);
         try {
             // Generate both Content AND SEO (Similar Products) in parallel
             const [aiContent, similarProducts] = await Promise.all([
                 generateVideoContent({
                     productName: extVideo.productName,
                     description: extVideo.caption || '',
                     affiliateLink: extVideo.affiliateLink
                 }),
                 findSimilarProducts(extVideo.productName, extVideo.affiliateLink)
             ]);

             const newItem: VideoItem = {
                 id: crypto.randomUUID(),
                 productName: aiContent.productName || extVideo.productName,
                 description: extVideo.caption || 'Importado de Recebidos',
                 category: 'Recebidos',
                 affiliateLink: extVideo.affiliateLink,
                 generatedContent: aiContent,
                 similarProducts: similarProducts, // Auto-populated
                 status: 'ready',
                 createdAt: Date.now(),
                 hasVideo: false
             };
             
             handleAddItem(newItem);
             
             // Dismiss from inbox so it doesn't reappear on refresh
             handleDismissExternal(extVideo.id);
         } catch(e) {
             alert('Erro ao importar');
             console.error(e);
         } finally {
             setImportingId(null);
         }
    };

    const handleBulkImport = async () => {
        if (selectedInboxIds.length === 0) return;
        
        const videosToImport = externalVideos.filter(v => selectedInboxIds.includes(v.id));
        setBulkProgress({ current: 0, total: videosToImport.length });

        for (let i = 0; i < videosToImport.length; i++) {
            const video = videosToImport[i];
            await handleImportExternal(video);
            setBulkProgress({ current: i + 1, total: videosToImport.length });
        }

        setBulkProgress(null);
        setSelectedInboxIds([]);
        setActiveTab('pending');
    };

    // Stats Calculations
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

    const todayCount = videoItems.filter(i => i.createdAt >= startOfDay).length;
    const monthCount = videoItems.filter(i => i.createdAt >= startOfMonth).length;
    const pendingCount = videoItems.filter(i => i.status !== 'posted').length;
    const inboxCount = externalVideos.length;
    
    const inboxTodayCount = externalVideos.filter(v => v.timestamp >= startOfDay).length;

    const pendingItems = videoItems.filter(i => i.status !== 'posted').sort((a,b) => b.createdAt - a.createdAt);
    const postedItemsList = videoItems.filter(i => i.status === 'posted').sort((a,b) => (b.postedAt || 0) - (a.postedAt || 0));

    return (
        <div className="min-h-screen bg-white text-gray-800 font-sans pb-20 md:pb-0">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <div className="bg-shopee-500 text-white p-1.5 rounded-lg">
                        <Video size={20} />
                    </div>
                    <h1 className="font-bold text-xl tracking-tight">
                        <span className="text-shopee-500">Shopee</span><span className="text-gray-800">Manager</span>
                    </h1>
                </div>
                
                <div className="flex items-center gap-3">
                    <button className="text-gray-400 hover:text-gray-600 p-2" title="Limpar Cache/Tema">
                        <Eraser size={20} />
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-shopee-500 hover:bg-shopee-600 text-white p-2 rounded-full shadow-lg hover:scale-105 transition-transform active:scale-95"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-4 sm:p-6">
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-green-50 rounded-xl p-4 flex flex-col items-center justify-center border border-green-100">
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Hoje</span>
                        <span className="text-2xl font-bold text-green-700">{todayCount}</span>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 flex flex-col items-center justify-center border border-blue-100">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Mês</span>
                        <span className="text-2xl font-bold text-blue-700">{monthCount}</span>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4 flex flex-col items-center justify-center border border-orange-100">
                        <span className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Pendentes</span>
                        <span className="text-2xl font-bold text-orange-700">{pendingCount}</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center border border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Recebidos</span>
                        <span className="text-2xl font-bold text-gray-700">{inboxCount}</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center border-b border-gray-100 mb-6 overflow-x-auto no-scrollbar">
                     <button
                        onClick={() => setActiveTab('inbox')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'inbox' ? 'border-shopee-500 text-shopee-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                     >
                        <Inbox size={18} />
                        Recebidos
                        <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'inbox' ? 'bg-shopee-100 text-shopee-600' : 'bg-gray-100 text-gray-500'}`}>{inboxCount}</span>
                     </button>

                     <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'pending' ? 'border-shopee-500 text-shopee-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                     >
                        <Clock size={18} />
                        Pendentes
                        <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'pending' ? 'bg-shopee-100 text-shopee-600' : 'bg-gray-100 text-gray-500'}`}>{pendingCount}</span>
                     </button>

                     <button
                        onClick={() => setActiveTab('posted')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'posted' ? 'border-shopee-500 text-shopee-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                     >
                        <CheckCircle2 size={18} />
                        Postados
                        <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'posted' ? 'bg-shopee-100 text-shopee-600' : 'bg-gray-100 text-gray-500'}`}>{postedItemsList.length}</span>
                     </button>

                     <button
                        onClick={() => setActiveTab('tools')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'tools' ? 'border-shopee-500 text-shopee-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                     >
                        <Wrench size={18} />
                        Ferramentas
                     </button>
                </div>

                {activeTab === 'pending' && (
                    <div className="space-y-6">
                        {pendingItems.length === 0 ? (
                             <div className="text-center py-20 opacity-50 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <Video size={48} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-gray-500">Nenhum vídeo pendente</p>
                             </div>
                        ) : (
                            pendingItems.map(item => (
                                <VideoItemCard 
                                    key={item.id}
                                    item={item}
                                    onDelete={handleDeleteItem}
                                    onStatusChange={handleStatusChange}
                                    onRegenerate={handleRegenerate}
                                    isGenerating={generatingItems[item.id]}
                                    onFindSimilar={handleFindSimilar}
                                    isFindingSimilar={findingSimilar[item.id]}
                                />
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'inbox' && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                           <h2 className="font-bold text-gray-700 flex items-center gap-2 text-lg">
                               <Bell size={20} className="text-shopee-500"/> 
                               Chegaram Recentemente
                               {inboxTodayCount > 0 && (
                                   <span className="bg-shopee-100 text-shopee-600 text-xs px-2 py-1 rounded-full border border-shopee-200">
                                       +{inboxTodayCount} hoje
                                   </span>
                               )}
                           </h2>
                           <button 
                               onClick={loadExternalVideos}
                               disabled={loadingExternal}
                               className="text-sm flex items-center gap-2 text-shopee-600 hover:bg-shopee-50 px-3 py-1.5 rounded-lg transition-colors font-medium border border-shopee-100"
                           >
                              <RefreshCw size={16} className={loadingExternal ? 'animate-spin' : ''} />
                              Atualizar
                           </button>
                        </div>
                        <ExternalVideoList 
                            videos={externalVideos}
                            isLoading={loadingExternal}
                            onDismiss={handleDismissExternal}
                            onImport={handleImportExternal}
                            importingId={importingId}
                            selectedIds={selectedInboxIds}
                            onToggleSelect={(id) => setSelectedInboxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                            onSelectAll={() => setSelectedInboxIds(prev => prev.length === externalVideos.length ? [] : externalVideos.map(v => v.id))}
                            onBulkImport={handleBulkImport}
                            bulkProgress={bulkProgress}
                        />
                    </>
                )}

                {activeTab === 'tools' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {TOOLS.map(tool => (
                            <div 
                                key={tool.id}
                                onClick={() => setSelectedTool(tool)}
                                className={`bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-${tool.color.replace('bg-', '')}`}
                            >
                                <div className={`${tool.color} w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                                    <tool.icon size={24} />
                                </div>
                                <h3 className="font-bold text-gray-800 text-base mb-1">{tool.title}</h3>
                                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{tool.description}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'posted' && (
                    <PostedVideoList 
                        items={postedItemsList}
                        onStatusChange={handleStatusChange}
                    />
                )}

            </main>

            <AddItemModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddItem}
            />
            
            <ToolModal 
                tool={selectedTool}
                onClose={() => setSelectedTool(null)}
            />
        </div>
    );
};