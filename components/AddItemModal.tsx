import React, { useState, useRef } from 'react';
import { X, Loader2, Video, Sparkles, Link as LinkIcon, FileVideo, Tag, ShieldCheck } from 'lucide-react';
import { generateVideoContent, findSimilarProducts } from '../services/geminiService';
import { saveVideo } from '../services/videoStorage';
import { cleanVideoMetadata, generateThumbnail } from '../services/metadataCleaner';
import { VideoItem } from '../types';
import { DateTimePicker } from './DateTimePicker';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: VideoItem) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [loading, setLoading] = useState(false);
  const [processingVideo, setProcessingVideo] = useState(false);
  const [videoCleaned, setVideoCleaned] = useState(false);
  
  const [formData, setFormData] = useState({
    affiliateLink: '',
    productName: '', 
    scheduledDate: '',
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert('Por favor, selecione apenas arquivos de vídeo.');
        return;
      }

      setProcessingVideo(true);
      setVideoCleaned(false);
      
      try {
        const cleanFile = await cleanVideoMetadata(file);
        setVideoCleaned(true);

        const thumbUrl = await generateThumbnail(cleanFile);
        
        setPreviewImage(thumbUrl);
        setSelectedFile(cleanFile);
      } catch (error) {
        console.error("Erro ao processar vídeo:", error);
        alert("Não foi possível processar este vídeo. Tente outro arquivo.");
      } finally {
        setProcessingVideo(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newId = crypto.randomUUID();
      const tempProductName = formData.productName.trim() || "Produto Shopee (Analisando...)";

      if (selectedFile) {
        await saveVideo(newId, selectedFile);
      }

      const [aiContent, similarProducts] = await Promise.all([
        generateVideoContent({
          productName: tempProductName,
          description: '', 
          category: '', 
          imageBase64: previewImage || undefined,
          affiliateLink: formData.affiliateLink
        }),
        findSimilarProducts(tempProductName, formData.affiliateLink, previewImage || undefined)
      ]);

      const finalProductName = aiContent.productName || formData.productName.trim() || "Produto Shopee";

      const newItem: VideoItem = {
        id: newId,
        productName: finalProductName,
        description: 'Gerado via Link + Análise Visual',
        category: 'Automático',
        affiliateLink: formData.affiliateLink,
        thumbnailUrl: previewImage || undefined,
        generatedContent: aiContent,
        similarProducts: similarProducts,
        status: 'ready',
        scheduledDate: formData.scheduledDate || undefined,
        createdAt: Date.now(),
        hasVideo: !!selectedFile,
      };

      onAdd(newItem);
      onClose();
      
      setFormData({ affiliateLink: '', productName: '', scheduledDate: '' });
      setPreviewImage(null);
      setSelectedFile(null);
      setVideoCleaned(false);
      
    } catch (error) {
      alert('Falha ao gerar conteúdo viral. Por favor, tente novamente.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Adicionar Novo Vídeo
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="add-item-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Link de Afiliado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <LinkIcon size={14} className="text-shopee-500"/> 
                Link do Produto / Afiliado *
              </label>
              <input 
                required
                type="url" 
                value={formData.affiliateLink}
                onChange={e => setFormData({...formData, affiliateLink: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-shopee-200 focus:border-shopee-500 outline-none transition-all text-sm font-mono text-shopee-600 placeholder-gray-400"
                placeholder="https://shopee.com.br/Nome-Do-Produto-i.123..."
              />
            </div>

            {/* Nome do Produto */}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Tag size={14} className="text-orange-500"/> 
                Nome do Produto (Opcional)
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.productName}
                  onChange={e => setFormData({...formData, productName: e.target.value})}
                  className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-shopee-200 focus:border-shopee-500 outline-none transition-all text-sm font-medium text-gray-800 placeholder-gray-400"
                  placeholder="Deixe vazio para a IA detectar..."
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                   <Sparkles size={16} />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                A IA vai detectar o nome correto pela imagem e link automaticamente.
              </p>
            </div>

            {/* Video Upload */}
            <div className="space-y-2 flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-700 w-full">Vídeo do Produto</label>
              
              <div 
                onClick={() => !processingVideo && fileInputRef.current?.click()}
                className={`w-[220px] aspect-[9/16] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden bg-gray-50 shadow-inner group ${previewImage ? 'border-shopee-300 bg-black' : 'border-gray-300 hover:border-shopee-400 hover:bg-gray-100'}`}
              >
                {processingVideo ? (
                  <div className="flex flex-col items-center text-shopee-500">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <span className="text-xs font-medium text-center px-4">Limpando metadados...</span>
                  </div>
                ) : previewImage ? (
                  <>
                    <img src={previewImage} alt="Preview" className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                           <Video className="text-white drop-shadow-md" size={32} />
                        </div>
                    </div>
                    {videoCleaned && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1 animate-in fade-in zoom-in">
                        <ShieldCheck size={10} /> LIMPO
                      </div>
                    )}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-3 py-1 rounded-full backdrop-blur-md whitespace-nowrap border border-white/20">
                        Alterar Vídeo
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 p-4">
                    <div className="bg-white w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100">
                       <FileVideo className="text-shopee-400" size={24} />
                    </div>
                    <span className="text-sm font-bold text-gray-600 block mb-1">Upload Vídeo</span>
                    <p className="text-[10px] text-gray-400">Metadados serão removidos</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="video/*" 
                  onChange={handleVideoUpload} 
                />
              </div>
            </div>

            {/* Schedule */}
            <div>
              <DateTimePicker 
                label="Agendar Postagem"
                value={formData.scheduledDate}
                onChange={(val) => setFormData({...formData, scheduledDate: val})}
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            form="add-item-form"
            disabled={loading || processingVideo}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-shopee-500 to-orange-600 hover:from-shopee-600 hover:to-orange-700 text-white font-bold shadow-md shadow-shopee-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all transform hover:scale-[1.02]"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Criando Viral...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Gerar Legenda Viral
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};