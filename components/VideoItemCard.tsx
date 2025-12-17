import React, { useState } from 'react';
import { VideoItem } from '../types';
import { Copy, Check, Trash2, Calendar, ShoppingBag, Hash, RefreshCw, Flame, Link as LinkIcon, Search, Loader2, ExternalLink, Download, Upload, ArrowRight, ClipboardCopy, Music, Music2, Eye, Layout, Image as ImageIcon } from 'lucide-react';
import { getVideo } from '../services/videoStorage';

// Utility para cópia segura
const copyToClipboard = async (text: string) => {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback para ambientes não-seguros (ex: IP local)
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

interface VideoItemCardProps {
  item: VideoItem;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: VideoItem['status']) => void;
  onRegenerate: (item: VideoItem) => void;
  isGenerating?: boolean;
  onFindSimilar: (item: VideoItem) => Promise<void>;
  isFindingSimilar?: boolean;
}

export const VideoItemCard: React.FC<VideoItemCardProps> = ({ 
  item, 
  onDelete, 
  onStatusChange,
  onRegenerate,
  isGenerating,
  onFindSimilar,
  isFindingSimilar
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'shopee' | 'tiktok' | 'pinterest'>('shopee');

  const handleCopy = async (text: string, field: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleOpenAffiliatePage = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (item.affiliateLink) {
      copyToClipboard(item.affiliateLink).then(() => {
        setCopiedField('affiliate_redirect');
        setTimeout(() => {
          window.open("https://affiliate.shopee.com.br/offer/custom_link", "_blank");
          setCopiedField(null);
        }, 800);
      });
    } else {
      window.open("https://affiliate.shopee.com.br/offer/custom_link", "_blank");
    }
  };

  const handleDownload = async () => {
    if (!item.hasVideo) return;
    setIsDownloading(true);
    try {
      const blob = await getVideo(item.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.productName.substring(0, 30).replace(/\s+/g, '_')}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
         alert('Vídeo original não encontrado no armazenamento.');
      }
    } catch(e) { 
      console.error(e);
      alert('Erro ao baixar vídeo.');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Helper para gerar o texto completo (Shopee)
  const getShopeeContent = () => {
    if (!item.generatedContent) return "";
    const formattedTags = item.generatedContent.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
    return `${item.generatedContent.caption} ${formattedTags}`;
  };

  // Helper para TikTok
  const getTikTokContent = () => {
    if (!item.generatedContent?.tiktok) return "";
    const formattedTags = item.generatedContent.tiktok.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
    return `${item.generatedContent.tiktok.description}\n\n${formattedTags}`;
  };

  const fullShopeeContent = getShopeeContent();
  const shopeeLength = fullShopeeContent.length;
  const SHOPEE_MAX = 150;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${item.status === 'posted' ? 'opacity-75 grayscale-[0.5]' : 'hover:shadow-md'}`}>
      <div className="flex flex-col sm:flex-row">
        {/* Thumbnail Section - 9:16 Aspect Ratio */}
        <div className="sm:w-[220px] md:w-[260px] aspect-[9/16] w-full bg-black flex-shrink-0 relative group border-r border-gray-100">
          {item.thumbnailUrl ? (
            <img 
              src={item.thumbnailUrl} 
              alt={item.productName} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-100">
              <div className="flex flex-col items-center gap-2">
                <ShoppingBag size={32} />
                <span className="text-[10px] uppercase font-bold tracking-wider">Sem Capa</span>
              </div>
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 z-10">
            {isGenerating ? (
               <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                 <RefreshCw className="text-white animate-spin" size={24} />
               </div>
            ) : (
              <button 
                onClick={() => onRegenerate(item)}
                className="p-3 bg-white/20 hover:bg-shopee-500 hover:text-white rounded-full text-white backdrop-blur-sm transition-all transform hover:scale-110 shadow-lg"
                title="Regerar conteúdo viral"
              >
                <RefreshCw size={20} />
              </button>
            )}
            
            {item.hasVideo && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-3 bg-white/20 hover:bg-blue-500 hover:text-white rounded-full text-white backdrop-blur-sm transition-all transform hover:scale-110 shadow-lg"
                title="Baixar vídeo original"
              >
                {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
              </button>
            )}
          </div>
          
          <div className="absolute top-2 left-2 z-10">
            {item.status === 'posted' && (
              <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <Check size={10} /> POSTADO
              </span>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              <h3 className="font-bold text-gray-800 text-lg leading-tight">{item.productName}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-2">
                {item.category && <span className="bg-gray-100 border border-gray-200 px-2 py-1 rounded-md">{item.category}</span>}
                {item.scheduledDate && (
                  <span className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">
                    <Calendar size={12} />
                    {formatDate(item.scheduledDate)}
                  </span>
                )}
              </div>
            </div>
            
            {/* Delete Button Fixed */}
            <div className="flex items-center gap-1 relative z-20">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 group/del border border-transparent hover:border-red-100"
                title="Excluir este vídeo permanentemente"
              >
                <Trash2 size={16} className="group-hover/del:scale-110 transition-transform"/>
                <span className="text-xs font-medium">Excluir</span>
              </button>
            </div>
          </div>

          {/* AI Content Area */}
          {item.generatedContent ? (
            <div className="flex-1 space-y-4">
              
              {/* Tabs */}
              <div className="flex border-b border-gray-100 mb-2">
                 <button 
                    onClick={() => setActivePlatform('shopee')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activePlatform === 'shopee' ? 'border-shopee-500 text-shopee-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                 >
                   Shopee
                 </button>
                 <button 
                    onClick={() => setActivePlatform('tiktok')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activePlatform === 'tiktok' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                 >
                   TikTok
                 </button>
                 <button 
                    onClick={() => setActivePlatform('pinterest')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activePlatform === 'pinterest' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                 >
                   Pinterest
                 </button>
              </div>

              {/* SHOPEE VIEW */}
              {activePlatform === 'shopee' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="flex justify-end items-center text-xs px-1">
                     <div className={`font-mono font-bold ${shopeeLength > SHOPEE_MAX ? 'text-red-600' : 'text-green-600'}`}>
                        {shopeeLength}/{SHOPEE_MAX} chars (Total)
                     </div>
                  </div>

                  <div className="group relative bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-shopee-200 transition-colors">
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span className="font-bold uppercase tracking-wider flex items-center gap-1 text-shopee-600">
                        <Flame size={12} /> Legenda & Hashtags
                      </span>
                    </div>
                    <div className="text-gray-700 leading-snug pr-6 font-medium text-sm whitespace-pre-wrap">
                      {fullShopeeContent}
                    </div>
                    <button 
                      onClick={() => handleCopy(fullShopeeContent, 'full_caption')}
                      className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-shopee-500 hover:bg-white rounded-md transition-all shadow-sm opacity-0 group-hover:opacity-100"
                      title="Copiar Legenda Completa"
                    >
                      {copiedField === 'full_caption' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>

                  {item.affiliateLink && (
                    <div className="group relative bg-blue-50 p-3 rounded-xl border border-blue-100 overflow-hidden">
                       <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-1">Link Gerado</span>
                       <div className="flex items-center gap-1">
                         <LinkIcon size={12} className="text-blue-400"/>
                         <span className="text-xs font-mono text-blue-700 truncate block w-full">{item.affiliateLink}</span>
                       </div>
                       <a 
                         href={item.affiliateLink}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="absolute right-2 top-2 p-1 text-blue-400 hover:text-blue-700 transition-colors"
                         title="Ir para o link"
                       >
                         <ExternalLink size={14} />
                       </a>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleOpenAffiliatePage}
                        className={`flex items-center justify-center gap-2 border-2 text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm group/link ${
                            copiedField === 'affiliate_redirect' 
                            ? 'bg-green-50 border-green-200 text-green-700' 
                            : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-shopee-200 hover:text-shopee-600'
                        }`}
                      >
                        {copiedField === 'affiliate_redirect' ? (
                          <>
                            <Check size={14} />
                            COPIADO!
                          </>
                        ) : (
                          <>
                            <LinkIcon size={14} />
                            GERAR LINK
                          </>
                        )}
                      </button>
                      
                      <a 
                        href="https://seller.shopee.com.br/creator-center/video-upload/upload" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-shopee-500 to-orange-600 text-xs font-bold text-white py-2.5 rounded-xl hover:from-shopee-600 hover:to-orange-700 shadow-md shadow-shopee-500/20 transition-all group/up"
                      >
                        <Upload size={14} />
                        UPLOAD SHOPEE
                      </a>
                   </div>
                </div>
              )}

              {/* TIKTOK VIEW */}
              {activePlatform === 'tiktok' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                  {!item.generatedContent.tiktok ? (
                     <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-400 text-sm">
                       Regere o conteúdo para ver a estratégia do TikTok.
                     </div>
                  ) : (
                    <>
                      <div className="group relative bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                          <span className="font-bold uppercase tracking-wider flex items-center gap-1 text-black">
                            <Music size={12} /> Copy Viral TikTok
                          </span>
                        </div>
                        <div className="text-gray-800 leading-snug pr-6 font-medium text-sm whitespace-pre-wrap">
                          {getTikTokContent()}
                        </div>
                        <button 
                          onClick={() => handleCopy(getTikTokContent(), 'tiktok_copy')}
                          className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-black hover:bg-white rounded-md transition-all shadow-sm opacity-0 group-hover:opacity-100"
                        >
                          {copiedField === 'tiktok_copy' ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>

                      <div className="group relative bg-pink-50 p-3 rounded-xl border border-pink-100">
                         <span className="text-[10px] font-bold text-pink-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                           <Music2 size={12}/> Sugestão de Áudio
                         </span>
                         <span className="text-sm text-pink-900 font-medium">
                           {item.generatedContent.tiktok.music}
                         </span>
                         <button 
                            onClick={() => handleCopy(item.generatedContent!.tiktok!.music, 'tiktok_music')}
                            className="absolute right-2 top-2 p-1 text-pink-300 hover:text-pink-600 transition-colors"
                          >
                            {copiedField === 'tiktok_music' ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                      </div>

                      <a 
                        href="https://www.tiktok.com/tiktokstudio/upload?from=creator_center" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-black to-gray-800 text-xs font-bold text-white py-3 rounded-xl hover:shadow-lg transition-all transform active:scale-95"
                      >
                        <Upload size={14} />
                        UPLOAD TIKTOK
                        <ExternalLink size={12} className="opacity-50" />
                      </a>
                    </>
                  )}
                </div>
              )}

              {/* PINTEREST VIEW */}
              {activePlatform === 'pinterest' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                  {!item.generatedContent.pinterest ? (
                     <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-400 text-sm">
                       Regere o conteúdo para ver a estratégia do Pinterest.
                     </div>
                  ) : (
                    <>
                      {/* Title */}
                      <div className="group relative border border-gray-200 rounded-lg p-2.5 hover:border-red-200 bg-white">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Título SEO</label>
                        <p className="text-sm font-bold text-gray-800 pr-6">{item.generatedContent.pinterest.title}</p>
                        <button onClick={() => handleCopy(item.generatedContent!.pinterest!.title, 'pin_title')} className="absolute right-2 top-2 text-gray-300 hover:text-red-500">
                          {copiedField === 'pin_title' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>

                      {/* Description */}
                      <div className="group relative border border-gray-200 rounded-lg p-2.5 hover:border-red-200 bg-white">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Descrição + CTA</label>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap pr-6">{item.generatedContent.pinterest.description}</p>
                         <button onClick={() => handleCopy(item.generatedContent!.pinterest!.description, 'pin_desc')} className="absolute right-2 top-2 text-gray-300 hover:text-red-500">
                          {copiedField === 'pin_desc' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>

                       {/* Alt Text */}
                       <div className="group relative border border-gray-200 rounded-lg p-2.5 hover:border-red-200 bg-gray-50">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                           <ImageIcon size={10} /> Texto Alternativo (Acessibilidade)
                        </label>
                        <p className="text-xs text-gray-600 pr-6">{item.generatedContent.pinterest.altText}</p>
                         <button onClick={() => handleCopy(item.generatedContent!.pinterest!.altText, 'pin_alt')} className="absolute right-2 top-2 text-gray-300 hover:text-red-500">
                          {copiedField === 'pin_alt' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>

                      <a 
                        href="https://br.pinterest.com/pin-creation-tool/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-red-600 text-xs font-bold text-white py-3 rounded-xl hover:bg-red-700 hover:shadow-lg transition-all transform active:scale-95 shadow-red-500/20"
                      >
                        <Upload size={14} />
                        UPLOAD PINTEREST
                        <ExternalLink size={12} className="opacity-50" />
                      </a>
                    </>
                  )}
                </div>
              )}

              {/* Similar Products Section (Common) */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                   <div className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Search size={12} /> Concorrentes / SEO
                   </div>
                   {!item.similarProducts && (
                      <button 
                        onClick={() => onFindSimilar(item)}
                        disabled={isFindingSimilar}
                        className="text-xs bg-cyan-50 text-cyan-600 hover:bg-cyan-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 font-medium"
                      >
                        {isFindingSimilar ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        {isFindingSimilar ? 'Gerando...' : 'Gerar Termos'}
                      </button>
                   )}
                </div>
                
                {item.similarProducts && (
                  <div className="flex flex-wrap gap-2">
                    {item.similarProducts.map((prod, idx) => {
                      const name = typeof prod === 'string' ? prod : prod.name;
                      let url = typeof prod === 'string' ? '' : prod.url;
                      if (!url || (!url.includes('shopee.com.br/search') && !url.includes('shopee.com.br'))) {
                         url = `https://shopee.com.br/search?keyword=${encodeURIComponent(name)}`;
                      }

                      return (
                        <div key={idx} className="flex items-center bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-1 py-1 hover:border-shopee-300 hover:bg-white transition-all group">
                          <a 
                             href={url}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-xs text-gray-700 font-medium hover:text-shopee-600 truncate max-w-[150px] mr-2"
                          >
                            {name}
                          </a>
                          <button
                            onClick={() => handleCopy(name, `sim-${idx}`)}
                            className="p-1 text-gray-300 hover:text-shopee-500 transition-colors"
                          >
                            {copiedField === `sim-${idx}` ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      );
                    })}
                    <button 
                      onClick={() => onFindSimilar(item)}
                      disabled={isFindingSimilar}
                      className="text-[10px] text-gray-400 hover:text-cyan-600 flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-gray-300 hover:border-cyan-300"
                    >
                      <RefreshCw size={10} className={isFindingSimilar ? "animate-spin" : ""} />
                    </button>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
               <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                 <RefreshCw size={24} className="text-shopee-500 animate-spin" />
               </div>
               <h4 className="font-bold text-gray-800">IA Trabalhando...</h4>
               <p className="text-xs text-gray-500 mt-1 max-w-xs">Analisando o produto, link e imagem para criar a melhor estratégia viral.</p>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            {item.status === 'posted' ? (
              <button 
                onClick={() => onStatusChange(item.id, 'ready')}
                className="text-xs font-medium text-gray-400 hover:text-gray-700 underline"
              >
                Voltar para Pendentes
              </button>
            ) : (
              <button 
                onClick={() => onStatusChange(item.id, 'posted')}
                className="flex items-center gap-2 bg-gray-800 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md transform active:scale-95"
              >
                <Check size={18} />
                Marcar como Postado
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};