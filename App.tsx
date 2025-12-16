import React, { useState, useEffect } from 'react';
import { Plus, Video, CheckCircle2, Clock, Inbox, Bell, RefreshCw, Eraser, Check, X } from 'lucide-react';
import { VideoItem, ItemStatus, ExternalVideo } from './types';
import { VideoItemCard } from './components/VideoItemCard';
import { PostedVideoList } from './components/PostedVideoList';
import { AddItemModal } from './components/AddItemModal';
import { ExternalVideoList } from './components/ExternalVideoList';
import { generateVideoContent, findSimilarProducts } from './services/geminiService';
import { deleteVideo, saveVideo } from './services/videoStorage';
import { fetchExternalVideos } from './services/csvService';
import { cleanVideoMetadata, generateThumbnail } from './services/metadataCleaner';

// Som de Gato (Meow Short) em Base64 para não depender de arquivos externos
const CAT_SOUND_BASE64 = "data:audio/mp3;base64,//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NkxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

function App() {
  // Alterado o estado para suportar as novas abas
  const [activeTab, setActiveTab] = useState<'inbox' | 'pending' | 'posted'>('inbox');
  
  const [items, setItems] = useState<VideoItem[]>(() => {
    try {
      const saved = localStorage.getItem('shopee_video_items');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [inboxVideos, setInboxVideos] = useState<ExternalVideo[]>([]);
  const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>([]);
  
  const [dismissedInboxIds, setDismissedInboxIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shopee_inbox_dismissed');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [loadingInbox, setLoadingInbox] = useState(false);
  const [newInboxCount, setNewInboxCount] = useState(0);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{current: number, total: number} | null>(null);

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [findingSimilarId, setFindingSimilarId] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- EFEITOS ---

  // Request Notification Permission on Mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // Carregar Inbox Inicial e Configurar Auto-Refresh (1h)
  useEffect(() => {
    loadInboxData(); // Carga inicial

    const oneHour = 60 * 60 * 1000;
    const intervalId = setInterval(() => {
      console.log("Executando atualização automática do Inbox...");
      loadInboxData(true); // true indica que é background refresh
    }, oneHour);

    return () => clearInterval(intervalId);
  }, []);

  // Calcular contagem de novos vídeos
  useEffect(() => {
    const visibleNew = inboxVideos.filter(v => v.isNew && !dismissedInboxIds.includes(v.id));
    setNewInboxCount(visibleNew.length);
  }, [dismissedInboxIds, inboxVideos]);

  // Salvar Items LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('shopee_video_items', JSON.stringify(items));
    } catch (e) {
      console.error("Storage Limit Exceeded:", e);
      alert("Atenção: Limite de armazenamento local atingido. Exclua itens antigos.");
    }
  }, [items]);

  // Limpeza Automática de Postados (24h)
  useEffect(() => {
    const cleanOldPostedVideos = async () => {
      const oneDayInMs = 24 * 60 * 60 * 1000;
      const now = Date.now();
      
      const keptItems: VideoItem[] = [];
      const idsToDelete: string[] = [];

      items.forEach(item => {
        if (item.status === 'posted') {
          // Usa postedAt se existir, senão usa createdAt como fallback
          const timeRef = item.postedAt || item.createdAt;
          if (now - timeRef > oneDayInMs) {
            idsToDelete.push(item.id);
            return; // Não adiciona ao keptItems
          }
        }
        keptItems.push(item);
      });

      if (idsToDelete.length > 0) {
        console.log(`Removendo ${idsToDelete.length} vídeos postados há mais de 24h.`);
        setItems(keptItems);
        // Remove também os arquivos do IndexedDB
        for (const id of idsToDelete) {
           await deleteVideo(id).catch(e => console.warn(e));
        }
      }
    };

    cleanOldPostedVideos();
  }, []); // Roda apenas uma vez ao montar o componente

  // --- FUNÇÕES CORE ---

  const sendBrowserNotification = (count: number) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Novos Vídeos Shopee!", {
        body: `${count} novos vídeos chegaram na sua lista.`,
        icon: "/vite.svg" // Fallback icon
      });
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio(CAT_SOUND_BASE64);
      audio.volume = 0.7; // Volume confortável
      // Navegadores bloqueiam autoplay se o usuário não interagiu com a página ainda.
      // Adicionamos catch para evitar erros no console.
      audio.play().catch(e => {
        console.warn("Autoplay bloqueado pelo navegador. O usuário precisa interagir com a página primeiro.", e);
      });
    } catch (e) {
      console.error("Erro ao tocar som", e);
    }
  };

  const loadInboxData = async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setLoadingInbox(true);
    try {
      const lastVisitStr = localStorage.getItem('shopee_inbox_last_visit');
      const lastVisit = lastVisitStr ? parseInt(lastVisitStr) : 0;
      
      // Ler o cutoff (Timestamp de "Exclusão do Log")
      const cutoffStr = localStorage.getItem('shopee_inbox_cutoff');
      const cutoff = cutoffStr ? parseInt(cutoffStr) : 0;

      const videos = await fetchExternalVideos(lastVisit);

      // Filtra vídeos anteriores ao momento que o usuário "limpou o log"
      const filteredVideos = videos.filter(v => v.timestamp > cutoff);
      
      // Lógica de Notificação (Browser + Som)
      if (isBackgroundRefresh) {
        const newItemsCount = filteredVideos.filter(v => v.isNew).length;
        
        // Se encontrarmos novos itens que não tínhamos antes
        if (newItemsCount > 0) {
           sendBrowserNotification(newItemsCount);
           playNotificationSound(); // Toca o miado do gato
           showToast(`${newItemsCount} novos vídeos chegaram!`, 'success');
        }
      }

      setInboxVideos(filteredVideos);
    } catch (e) {
      console.error("Failed to load inbox", e);
    } finally {
      if (!isBackgroundRefresh) setLoadingInbox(false);
    }
  };

  const handleDismissInboxItem = (id: string) => {
    setDismissedInboxIds(prev => {
      const newState = [...prev, id];
      localStorage.setItem('shopee_inbox_dismissed', JSON.stringify(newState));
      return newState;
    });
    // Remove from selection if dismissed
    setSelectedInboxIds(prev => prev.filter(selectedId => selectedId !== id));
    showToast("Vídeo removido da lista.");
  };

  const handleClearInbox = () => {
    if (confirm("ATENÇÃO: Isso limpará TODOS os vídeos da aba Recebidos e simulará a exclusão do log original (filtrando itens antigos). Apenas novos vídeos aparecerão daqui para frente. Deseja continuar?")) {
      // Define o ponto de corte para o momento atual
      localStorage.setItem('shopee_inbox_cutoff', Date.now().toString());
      
      // Reseta dismissals pois antigos já serão filtrados
      localStorage.removeItem('shopee_inbox_dismissed');
      setDismissedInboxIds([]);
      
      // Limpa visualmente agora
      setInboxVideos([]);
      setNewInboxCount(0);
      
      showToast("Log e Inbox limpos com sucesso!");
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Excluir este vídeo permanentemente?')) {
      setItems(prev => prev.filter(i => i.id !== id));
      deleteVideo(id).catch(e => console.error("Erro ao deletar arquivo do DB:", e));
      showToast("Vídeo excluído com sucesso.");
    }
  };

  // Lógica Core de Importação (Reutilizável)
  const processImportVideo = async (video: ExternalVideo): Promise<VideoItem | null> => {
    console.log(`Iniciando importação: ${video.videoUrl}`);
    
    // Variáveis para construção do Item
    let thumbUrl: string | undefined = undefined;
    let hasVideo = false;
    let cleanFile: File | undefined = undefined;

    // 1. Tentar Baixar o Vídeo
    if (video.videoUrl) {
      try {
        let response = await fetch(video.videoUrl, { 
          referrerPolicy: 'no-referrer',
          cache: 'no-store'
        });

        // Fallback Strategy para Dropbox
        if (response.status === 404 && video.videoUrl.includes('dl.dropboxusercontent.com')) {
           const fallbackUrl = video.videoUrl
             .replace('dl.dropboxusercontent.com', 'www.dropbox.com')
             + (video.videoUrl.includes('?') ? '&raw=1' : '?raw=1');
           response = await fetch(fallbackUrl, { referrerPolicy: 'no-referrer' });
        }

        if (response.ok) {
           const blob = await response.blob();
           if (!blob.type.includes('text/html')) {
             const file = new File([blob], "imported_video.mp4", { type: blob.type || "video/mp4" });
             cleanFile = await cleanVideoMetadata(file);
             thumbUrl = await generateThumbnail(cleanFile);
             hasVideo = true;
           } else {
             console.warn("Link retornou HTML, ignorando vídeo.");
           }
        } else {
           throw new Error(`HTTP ${response.status}`);
        }
      } catch (networkError: any) {
        console.warn("Falha no download do vídeo (CORS/Rede). Importando apenas metadados.", networkError);
        showToast("Vídeo não pôde ser baixado. Importando apenas texto.", "warning");
        // Continuamos sem o arquivo de vídeo
      }
    }

    try {
      // 2. Salvar Vídeo se existir
      const newId = crypto.randomUUID();
      if (hasVideo && cleanFile) {
         await saveVideo(newId, cleanFile);
      }

      // 3. Gerar IA e Buscar Semelhantes (funciona mesmo sem imagem)
      const [aiContent, similar] = await Promise.all([
        generateVideoContent({
          productName: video.productName,
          description: "Importado de Lista de Ofertas",
          affiliateLink: video.affiliateLink,
          imageBase64: thumbUrl // Se undefined, IA usa apenas texto
        }),
        findSimilarProducts(video.productName, video.affiliateLink, thumbUrl)
      ]);

      const newItem: VideoItem = {
        id: newId,
        productName: aiContent.productName || video.productName,
        description: hasVideo ? 'Importado com Vídeo' : 'Importado (Sem Vídeo)',
        category: 'Ofertas',
        affiliateLink: video.affiliateLink,
        thumbnailUrl: thumbUrl, // Pode ser undefined
        generatedContent: aiContent,
        similarProducts: similar,
        status: 'ready',
        createdAt: Date.now(),
        hasVideo: hasVideo,
      };

      return newItem;

    } catch (error: any) {
      console.error(`Erro crítico ao gerar item ${video.id}:`, error);
      return null;
    }
  };

  const handleImportVideo = async (video: ExternalVideo) => {
    setImportingId(video.id);
    try {
      const newItem = await processImportVideo(video);
      if (newItem) {
        setItems(prev => [newItem, ...prev]);
        handleDismissInboxItem(video.id);
        setActiveTab('pending');
        if (newItem.hasVideo) {
          showToast("Vídeo importado e gerado com sucesso!");
        } else {
          showToast("Item importado (sem arquivo de vídeo).", "warning");
        }
      } else {
        alert("Erro ao importar. Verifique o console.");
      }
    } finally {
      setImportingId(null);
    }
  };

  const handleBulkImport = async () => {
    if (selectedInboxIds.length === 0) return;
    
    // Filtra os vídeos completos baseado nos IDs selecionados
    const videosToProcess = inboxVideos.filter(v => selectedInboxIds.includes(v.id));
    
    if (videosToProcess.length === 0) {
       alert("Nenhum vídeo selecionado encontrado na lista.");
       return;
    }

    if (!confirm(`Deseja processar ${videosToProcess.length} vídeos? Isso pode levar alguns minutos.`)) {
       return;
    }

    setBulkProgress({ current: 0, total: videosToProcess.length });
    const successfulIds: string[] = [];
    
    try {
        for (let i = 0; i < videosToProcess.length; i++) {
            const video = videosToProcess[i];
            
            // Atualiza progresso e UI
            setBulkProgress({ current: i + 1, total: videosToProcess.length });
            setImportingId(video.id); 

            // Processa o vídeo
            const newItem = await processImportVideo(video);
            
            if (newItem) {
              setItems(prev => [newItem, ...prev]);
              successfulIds.push(video.id);
            }
        }
    } catch (e) {
        console.error("Erro crítico no processamento em massa:", e);
        alert("Ocorreu um erro durante o processamento. Verifique o console.");
    } finally {
      setImportingId(null);
      setBulkProgress(null);
      
      if (successfulIds.length > 0) {
        // Atualiza Dismissed APENAS NO FINAL para evitar que a lista mude enquanto o loop roda
        setDismissedInboxIds(prev => {
          const newState = [...prev, ...successfulIds];
          localStorage.setItem('shopee_inbox_dismissed', JSON.stringify(newState));
          return newState;
        });

        // Limpa seleção dos itens processados
        setSelectedInboxIds(prev => prev.filter(id => !successfulIds.includes(id)));

        showToast(`${successfulIds.length} vídeos processados com sucesso!`);
        setActiveTab('pending'); // Mudado para pending
      } else {
        alert("Nenhum vídeo pôde ser processado. Verifique a conexão e os links.");
      }
    }
  };

  const handleToggleSelectInbox = (id: string) => {
    setSelectedInboxIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllInbox = () => {
    const visibleIds = inboxVideos
      .filter(v => !dismissedInboxIds.includes(v.id))
      .map(v => v.id);
      
    if (selectedInboxIds.length === visibleIds.length) {
      setSelectedInboxIds([]);
    } else {
      setSelectedInboxIds(visibleIds);
    }
  };

  const handleTabChange = (tab: 'inbox' | 'pending' | 'posted') => {
    setActiveTab(tab);
    if (tab === 'inbox') {
      const now = Date.now();
      localStorage.setItem('shopee_inbox_last_visit', now.toString());
      setTimeout(() => {
        setInboxVideos(prev => prev.map(v => ({...v, isNew: false})));
      }, 3000);
    }
  };

  const handleAddItem = (newItem: VideoItem) => {
    setItems(prev => [newItem, ...prev]);
    setActiveTab('pending'); // Mudado para pending
    showToast("Vídeo adicionado com sucesso!");
  };

  const handleStatusChange = (id: string, status: ItemStatus) => {
    setItems(prev => prev.map(i => {
      if (i.id === id) {
        return { 
          ...i, 
          status,
          // Se mudou para posted, atualiza o timestamp, senão limpa
          postedAt: status === 'posted' ? Date.now() : undefined 
        };
      }
      return i;
    }));
    if (status === 'posted') showToast("Item movido para Postados.");
    if (status === 'ready') showToast("Item movido para Pendentes.");
  };

  const handleRegenerate = async (item: VideoItem) => {
    setGeneratingId(item.id);
    try {
      const newContent = await generateVideoContent({
        productName: item.productName,
        description: item.description,
        category: item.category,
        imageBase64: item.thumbnailUrl,
        affiliateLink: item.affiliateLink
      });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, generatedContent: newContent } : i));
      showToast("Conteúdo regerado com sucesso!");
    } catch (error) {
      alert("Falha ao regerar conteúdo com IA.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleFindSimilar = async (item: VideoItem) => {
    setFindingSimilarId(item.id);
    try {
      const similar = await findSimilarProducts(item.productName, item.affiliateLink, item.thumbnailUrl);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, similarProducts: similar } : i));
      showToast("Busca de semelhantes concluída!");
    } catch (error) {
      alert("Falha ao buscar produtos semelhantes.");
    } finally {
      setFindingSimilarId(null);
    }
  };

  // Separação de Listas
  const pendingItems = items
    .filter(i => i.status !== 'posted')
    .sort((a, b) => {
       const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : a.createdAt;
       const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : b.createdAt;
       return dateB - dateA;
    });

  const postedItems = items
    .filter(i => i.status === 'posted')
    .sort((a, b) => (b.postedAt || b.createdAt) - (a.postedAt || a.createdAt));

  const visibleInboxVideos = inboxVideos.filter(v => !dismissedInboxIds.includes(v.id));
  
  // --- DASHBOARD METRICS ---
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const dashboardStats = {
    postedToday: items.filter(i => i.status === 'posted' && (i.postedAt || i.createdAt) >= startOfDay).length,
    postedMonth: items.filter(i => i.status === 'posted' && (i.postedAt || i.createdAt) >= startOfMonth).length,
    pending: pendingItems.length,
    inbox: visibleInboxVideos.length
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3">
          
          {/* Top Row: Logo & Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-shopee-500 p-2 rounded-lg text-white">
                <Video size={20} />
              </div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                Shopee<span className="text-shopee-500">Manager</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
               <button 
                onClick={handleClearInbox}
                className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                title="Limpar Caixa de Entrada / Resetar Log"
              >
                <Eraser size={20} />
              </button>
              <button 
                onClick={() => setIsAddItemModalOpen(true)}
                className="bg-shopee-500 hover:bg-shopee-600 text-white p-2 rounded-full shadow-lg shadow-shopee-500/30 transition-all active:scale-95"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>

          {/* Dashboard Row */}
          <div className="grid grid-cols-4 gap-2 mb-1">
             <div className="bg-green-50 rounded-lg p-2 border border-green-100 flex flex-col items-center">
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Hoje</span>
                <span className="text-lg font-bold text-green-700 leading-none">{dashboardStats.postedToday}</span>
             </div>
             <div className="bg-blue-50 rounded-lg p-2 border border-blue-100 flex flex-col items-center">
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Mês</span>
                <span className="text-lg font-bold text-blue-700 leading-none">{dashboardStats.postedMonth}</span>
             </div>
             <div className="bg-orange-50 rounded-lg p-2 border border-orange-100 flex flex-col items-center">
                <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">Pendentes</span>
                <span className="text-lg font-bold text-orange-700 leading-none">{dashboardStats.pending}</span>
             </div>
             <div className="bg-gray-50 rounded-lg p-2 border border-gray-200 flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Inbox</span>
                <span className="text-lg font-bold text-gray-700 leading-none">{dashboardStats.inbox}</span>
             </div>
          </div>

        </div>
        
        {/* Navigation Tabs (NOVA ESTRUTURA COM CONTADORES) */}
        <div className="flex border-t border-gray-100 max-w-4xl mx-auto">
          <button 
            onClick={() => handleTabChange('inbox')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 relative ${activeTab === 'inbox' ? 'text-shopee-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <div className="relative">
              <Inbox size={18} />
              {newInboxCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
                  {newInboxCount > 9 ? '9+' : newInboxCount}
                </span>
              )}
            </div>
            <span>Recebidos</span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{visibleInboxVideos.length}</span>
            {activeTab === 'inbox' && <div className="absolute bottom-0 w-full h-0.5 bg-shopee-500"></div>}
          </button>
          
          <button 
            onClick={() => handleTabChange('pending')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 relative ${activeTab === 'pending' ? 'text-shopee-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Clock size={18} />
            <span>Pendentes</span>
            <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold">{pendingItems.length}</span>
            {activeTab === 'pending' && <div className="absolute bottom-0 w-full h-0.5 bg-shopee-500"></div>}
          </button>
          
          <button 
            onClick={() => handleTabChange('posted')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 relative ${activeTab === 'posted' ? 'text-shopee-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <CheckCircle2 size={18} />
            <span>Postados</span>
            <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-xs font-bold">{postedItems.length}</span>
            {activeTab === 'posted' && <div className="absolute bottom-0 w-full h-0.5 bg-shopee-500"></div>}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* VIEW: INBOX */}
        {activeTab === 'inbox' && (
          <div className="animate-in fade-in duration-300">
             <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
               <h2 className="font-bold text-gray-800 flex items-center gap-2">
                 <Bell size={18} className="text-shopee-500"/>
                 Chegaram Recentemente
               </h2>
               <div className="flex items-center gap-2">
                 <button 
                    onClick={() => loadInboxData(false)}
                    className="text-xs text-shopee-600 font-medium hover:bg-shopee-50 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border border-shopee-100"
                  >
                    <RefreshCw size={12} className={loadingInbox ? "animate-spin" : ""} />
                    Atualizar
                 </button>
               </div>
             </div>
             <ExternalVideoList 
               videos={visibleInboxVideos} 
               isLoading={loadingInbox} 
               onDismiss={handleDismissInboxItem} 
               onImport={handleImportVideo}
               importingId={importingId}
               // Bulk Props
               selectedIds={selectedInboxIds}
               onToggleSelect={handleToggleSelectInbox}
               onSelectAll={handleSelectAllInbox}
               onBulkImport={handleBulkImport}
               bulkProgress={bulkProgress}
             />
          </div>
        )}

        {/* VIEW: PENDENTES */}
        {activeTab === 'pending' && (
          <div className="animate-in fade-in duration-300">
            {pendingItems.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                   <Clock className="text-gray-300" size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Tudo em dia!</h3>
                <p className="text-gray-500 max-w-sm mx-auto mb-6">Não há vídeos pendentes. Adicione novos ou importe da aba Recebidos.</p>
                <button 
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="px-6 py-3 bg-shopee-500 text-white font-medium rounded-xl shadow-lg shadow-shopee-500/25 hover:bg-shopee-600 transition-all"
                >
                  Adicionar Vídeo
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-4 text-sm text-gray-500 font-medium">
                   {pendingItems.length} vídeos aguardando postagem
                </div>
                {pendingItems.map(item => (
                    <VideoItemCard 
                      key={item.id} 
                      item={item} 
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                      onRegenerate={handleRegenerate}
                      isGenerating={generatingId === item.id}
                      onFindSimilar={handleFindSimilar}
                      isFindingSimilar={findingSimilarId === item.id}
                    />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: POSTADOS */}
        {activeTab === 'posted' && (
          <div className="animate-in fade-in duration-300">
             {postedItems.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                     <CheckCircle2 className="text-green-200" size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">Nenhum histórico</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">Os vídeos marcados como "Postados" aparecerão aqui por 24 horas.</p>
                </div>
             ) : (
                <div className="space-y-4">
                  <div className="mb-4 text-sm text-gray-500 font-medium flex items-center gap-2">
                     <CheckCircle2 size={14} className="text-green-600" />
                     Histórico recente (Últimas 24h)
                  </div>
                  <PostedVideoList 
                    items={postedItems}
                    onStatusChange={handleStatusChange}
                  />
                </div>
             )}
          </div>
        )}

      </main>

      <AddItemModal 
        isOpen={isAddItemModalOpen} 
        onClose={() => setIsAddItemModalOpen(false)} 
        onAdd={handleAddItem}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-[90vw]">
          <div className={`p-1 rounded-full ${toast.type === 'error' ? 'bg-red-500' : toast.type === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}>
            {toast.type === 'error' ? <X size={14} /> : <Check size={14} />}
          </div>
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

    </div>
  );
}

export default App;