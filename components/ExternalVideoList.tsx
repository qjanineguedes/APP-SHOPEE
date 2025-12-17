import React, { useState } from 'react';
import { ExternalVideo } from '../types';
import { Download, Link as LinkIcon, Check, Copy, ExternalLink, Calendar, ShoppingBag, Trash2, Sparkles, Loader2, FileText, Send, Square, CheckSquare, ArrowDownAZ, ArrowUpAZ, ArrowDownWideNarrow, ArrowUpWideNarrow, Clock } from 'lucide-react';

// Utility para cópia segura
const copyToClipboard = async (text: string) => {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (err) {
    console.error('Failed to copy', err);
    return false;
  }
};

interface ExternalVideoListProps {
  videos: ExternalVideo[];
  isLoading: boolean;
  onDismiss: (id: string) => void;
  onImport: (video: ExternalVideo) => void;
  importingId?: string | null;
  
  // Bulk Selection Props
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onBulkImport?: () => void;
  bulkProgress?: { current: number, total: number } | null;

  // Sort Props
  sortType: 'date' | 'name';
  sortOrder: 'asc' | 'desc';
  onSortChange: (type: 'date' | 'name', order: 'asc' | 'desc') => void;
}

export const ExternalVideoList: React.FC<ExternalVideoListProps> = ({ 
  videos, 
  isLoading, 
  onDismiss, 
  onImport, 
  importingId,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  onBulkImport,
  bulkProgress,
  sortType,
  sortOrder,
  onSortChange
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleCopyLink = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownload = async (e: React.MouseEvent, url: string, name: string, id: string) => {
    e.stopPropagation();
    if (downloadingId) return;

    setDownloadingId(id);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha no download');
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${name.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.mp4`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        }, 100);
    } catch (err) {
        console.error("Download failed, fallback to new tab", err);
        window.open(url, '_blank');
    } finally {
        setDownloadingId(null);
    }
  };

  // Determine if bulk mode is active purely by the presence of bulkProgress object
  const isBulkProcessing = !!bulkProgress;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm animate-pulse flex gap-4">
             <div className="w-6 h-6 bg-gray-200 rounded mr-2"></div>
            <div className="w-16 h-24 bg-gray-200 rounded-lg"></div>
            <div className="flex-1 space-y-2 py-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="text-gray-300" size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-700">Tudo limpo!</h3>
        <p className="text-gray-400 text-sm">Nenhum vídeo novo encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative pb-20">
      
      {/* Header Actions & Sort */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm gap-3">
        <button 
          onClick={onSelectAll}
          disabled={isBulkProcessing}
          className={`flex items-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto ${isBulkProcessing ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-gray-600 hover:text-shopee-600'}`}
        >
          {selectedIds.length > 0 && selectedIds.length === videos.length ? (
            <CheckSquare size={18} className="text-shopee-500" />
          ) : (
            <Square size={18} className="text-gray-400" />
          )}
          {selectedIds.length > 0 ? `${selectedIds.length} selecionados` : 'Selecionar Todos'}
        </button>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button 
                onClick={() => onSortChange('date', sortOrder === 'asc' && sortType === 'date' ? 'desc' : 'asc')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all whitespace-nowrap ${sortType === 'date' ? 'bg-shopee-50 border-shopee-200 text-shopee-600 font-bold' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
                <Clock size={14} />
                Data
                {sortType === 'date' && (
                    sortOrder === 'desc' ? <ArrowDownWideNarrow size={14}/> : <ArrowUpWideNarrow size={14}/>
                )}
            </button>
             <button 
                onClick={() => onSortChange('name', sortOrder === 'asc' && sortType === 'name' ? 'desc' : 'asc')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all whitespace-nowrap ${sortType === 'name' ? 'bg-shopee-50 border-shopee-200 text-shopee-600 font-bold' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
                <FileText size={14} />
                Nome
                 {sortType === 'name' && (
                    sortOrder === 'desc' ? <ArrowDownAZ size={14}/> : <ArrowUpAZ size={14}/>
                )}
            </button>
        </div>
      </div>

      {videos.map((video) => {
        const isSelected = selectedIds.includes(video.id);
        const isProcessingThis = importingId === video.id;
        const isDownloadingThis = downloadingId === video.id;

        return (
          <div 
            key={video.id} 
            className={`
              bg-white rounded-xl p-4 border transition-all hover:shadow-lg flex flex-col gap-4 relative overflow-hidden group/card
              ${isSelected ? 'border-shopee-300 bg-shopee-50/10' : 'border-gray-100'}
              ${video.isNew && !isSelected ? 'border-shopee-200 shadow-md ring-2 ring-shopee-500 ring-offset-2' : ''}
              ${isProcessingThis ? 'opacity-80' : ''}
            `}
            onClick={() => !isBulkProcessing && onToggleSelect && onToggleSelect(video.id)} // Disable click during bulk
          >
            {/* Selection Checkbox (Absolute Left) */}
            <div className="absolute top-4 left-4 z-20">
               <div className={`
                 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer
                 ${isSelected ? 'bg-shopee-500 border-shopee-500 text-white' : 'bg-white border-gray-300 text-transparent hover:border-gray-400'}
               `}>
                 <Check size={14} strokeWidth={3} />
               </div>
            </div>

            {/* Badge Novo */}
            {video.isNew && (
              <div className="absolute top-0 right-0 bg-shopee-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10 animate-in fade-in zoom-in">
                NOVO
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pl-8 sm:pl-10">
               {/* Thumbnail Placeholder / Icon Area */}
               <div className="w-full sm:w-28 sm:h-36 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100"></div>
                  <div className="relative flex flex-col items-center gap-2 text-gray-300">
                      <Download size={24} />
                      <span className="text-[10px] font-bold">Vídeo</span>
                  </div>
                  {/* Overlay actions on thumbnail */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     <button 
                        onClick={(e) => handleDownload(e, video.videoUrl, video.productName, video.id)}
                        disabled={!!downloadingId}
                        className="p-2 bg-white rounded-full text-gray-700 hover:text-shopee-500 hover:scale-110 transition-transform shadow-lg disabled:opacity-75 disabled:cursor-wait"
                        title="Baixar Vídeo"
                     >
                       {isDownloadingThis ? <Loader2 size={18} className="animate-spin text-shopee-500"/> : <Download size={18} />}
                     </button>
                  </div>
               </div>

               <div className="flex-1 min-w-0 flex flex-col">
                  {/* Header Info */}
                  <div className="flex items-start justify-between gap-2">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium border border-gray-200">
                            <Calendar size={10} />
                            {video.date}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">{video.productName}</h3>
                     </div>
                     
                     {/* Delete Action (Top Right) */}
                     <button
                          disabled={isBulkProcessing}
                          onClick={(e) => {
                              e.stopPropagation();
                              onDismiss(video.id);
                          }}
                          className={`p-2 -mr-2 -mt-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-20 relative ${isBulkProcessing ? 'invisible' : ''}`}
                          title="Remover da lista"
                      >
                          <Trash2 size={16} />
                      </button>
                  </div>

                  {/* Caption / Description Box */}
                  {video.caption && (
                    <div className="mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs text-gray-600 relative group/text">
                       <FileText size={12} className="absolute top-3 left-2.5 text-gray-400" />
                       <p className="pl-5 line-clamp-2 group-hover/text:line-clamp-none transition-all whitespace-pre-wrap leading-relaxed">
                         {video.caption}
                       </p>
                    </div>
                  )}

                  {/* Links & Actions */}
                  <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
                     
                     {/* Main Action: Import to AI */}
                     <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if(!isBulkProcessing) onImport(video);
                        }}
                        disabled={!!importingId}
                        className={`flex-1 sm:flex-none bg-shopee-500 hover:bg-shopee-600 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-shopee-500/20 active:scale-95 min-w-[140px] z-20 relative ${importingId === video.id ? 'opacity-80 cursor-wait' : ''} ${isBulkProcessing && !isProcessingThis ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                      >
                        {isProcessingThis ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Criar Conteúdo
                          </>
                        )}
                      </button>

                      {/* Telegram Link */}
                      {video.telegramLink && (
                         <a 
                           href={video.telegramLink}
                           target="_blank"
                           rel="noopener noreferrer"
                           onClick={(e) => e.stopPropagation()}
                           className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-2 transition-colors z-20 relative"
                           title="Abrir no Telegram"
                         >
                           <Send size={14} />
                           <span className="hidden sm:inline">Ver no Telegram</span>
                         </a>
                      )}

                      {/* Copy Link (Affiliate/Caption link) */}
                      {video.affiliateLink && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(video.affiliateLink, video.id);
                          }}
                          className={`border text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors z-20 relative ${
                            copiedId === video.id 
                              ? 'bg-green-50 border-green-200 text-green-700' 
                              : 'bg-white border-gray-200 text-gray-600 hover:border-shopee-300 hover:text-shopee-500'
                          }`}
                        >
                          {copiedId === video.id ? <Check size={14} /> : <LinkIcon size={14} />}
                          {copiedId === video.id ? 'Copiado' : 'Link'}
                        </button>
                      )}
                  </div>
               </div>
            </div>
          </div>
        );
      })}

      {/* Sticky Bottom Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
          <button 
            onClick={onBulkImport}
            disabled={isBulkProcessing}
            className={`
              text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 font-bold transition-all
              ${isBulkProcessing ? 'bg-shopee-600 cursor-wait scale-100' : 'bg-gray-900 hover:bg-black hover:scale-105 active:scale-95'}
            `}
          >
            {isBulkProcessing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <div className="bg-white text-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {selectedIds.length}
              </div>
            )}
            
            {isBulkProcessing && bulkProgress 
              ? `Processando ${bulkProgress.current} de ${bulkProgress.total}...` 
              : 'Processar Selecionados'
            }
          </button>
        </div>
      )}
    </div>
  );
};