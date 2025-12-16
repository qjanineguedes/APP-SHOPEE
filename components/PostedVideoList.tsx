import React, { useState } from 'react';
import { VideoItem } from '../types';
import { ChevronDown, ChevronUp, Calendar, CheckCircle2, Copy, Check, Link as LinkIcon, RotateCcw, ShoppingBag, ExternalLink } from 'lucide-react';

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

interface PostedVideoListProps {
  items: VideoItem[];
  // onDelete removed as requested
  onDelete?: (id: string) => void; // Keeping optional for compatibility but unused
  onStatusChange: (id: string, status: VideoItem['status']) => void;
}

export const PostedVideoList: React.FC<PostedVideoListProps> = ({ items, onStatusChange }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatDate = (dateStr?: string, timestamp?: number) => {
    const date = dateStr ? new Date(dateStr) : new Date(timestamp || Date.now());
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const getFullContent = (item: VideoItem) => {
    if (!item.generatedContent) return "";
    const formattedTags = item.generatedContent.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
    return `${item.generatedContent.caption} ${formattedTags}`;
  };

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isExpanded = expandedId === item.id;
        const fullContent = getFullContent(item);

        return (
          <div 
            key={item.id} 
            className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-md border-shopee-200 ring-1 ring-shopee-100' : 'border-gray-100 shadow-sm hover:shadow'}`}
          >
            {/* Header / Summary Row */}
            <div 
              onClick={() => toggleExpand(item.id)}
              className="p-3 flex items-center gap-4 cursor-pointer select-none group"
            >
              {/* Thumbnail Mini */}
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ShoppingBag size={16} />
                  </div>
                )}
              </div>

              {/* Info Compacta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded">
                        <Calendar size={10} />
                        {formatDate(item.scheduledDate, item.createdAt)}
                    </span>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 size={10} /> Postado
                    </span>
                </div>
                <h3 className={`text-sm font-medium truncate pr-4 ${isExpanded ? 'text-shopee-600' : 'text-gray-700'}`}>
                    {item.productName}
                </h3>
              </div>

              {/* Chevron */}
              <div className="text-gray-400 group-hover:text-shopee-500 transition-colors px-2">
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                <div className="border-t border-gray-100 pt-3 space-y-3">
                    
                    {/* Caption Box */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 relative group/copy">
                        <p className="text-xs text-gray-600 whitespace-pre-wrap pr-6 leading-relaxed">
                            {fullContent}
                        </p>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(fullContent, `caption-${item.id}`);
                            }}
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-shopee-500 transition-colors"
                            title="Copiar Legenda"
                        >
                            {copiedId === `caption-${item.id}` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>

                    {/* Affiliate Link */}
                    {item.affiliateLink && (
                        <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <LinkIcon size={14} className="text-blue-500 flex-shrink-0" />
                            <span className="text-xs text-blue-700 truncate flex-1 font-mono">
                                {item.affiliateLink}
                            </span>
                            <a 
                                href={item.affiliateLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 text-blue-400 hover:text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
                                title="Ir para o link"
                            >
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    )}

                    {/* Actions Toolbar */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(item.id, 'ready');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                        >
                            <RotateCcw size={12} />
                            Mover para Pendentes
                        </button>
                    </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};