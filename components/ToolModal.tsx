import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Loader2, Play, Pause, Copy, Check, FileAudio, History, ArrowLeft, Trash2, Calendar } from 'lucide-react';
import { ToolConfig, ToolResult, ToolHistoryItem } from '../types';
import { generateToolContent, generateAudio } from '../services/geminiService';

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

interface ToolModalProps {
  tool: ToolConfig | null;
  onClose: () => void;
}

export const ToolModal: React.FC<ToolModalProps> = ({ tool, onClose }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);
  const [copied, setCopied] = useState(false);
  
  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ToolHistoryItem[]>([]);
  
  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset state when tool changes
  useEffect(() => {
    if (tool) {
      setInput('');
      setResult(null);
      setCopied(false);
      setIsPlaying(false);
      setShowHistory(false);
      audioRef.current = null;
      loadHistory(tool.id);
    }
  }, [tool]);

  // --- History Logic ---

  const loadHistory = (toolId: string) => {
    try {
      const allHistory: ToolHistoryItem[] = JSON.parse(localStorage.getItem('shopee_tool_history') || '[]');
      const filtered = allHistory.filter(h => h.toolId === toolId).sort((a, b) => b.timestamp - a.timestamp);
      setHistory(filtered);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const saveToHistory = (inputVal: string, resultVal: ToolResult) => {
    if (!tool) return;
    
    const newItem: ToolHistoryItem = {
      id: crypto.randomUUID(),
      toolId: tool.id,
      input: inputVal,
      result: resultVal,
      timestamp: Date.now()
    };

    try {
      const allHistory: ToolHistoryItem[] = JSON.parse(localStorage.getItem('shopee_tool_history') || '[]');
      
      // Limit total history size to prevent LocalStorage quota errors (keep last 50 items globally)
      const updatedHistory = [newItem, ...allHistory].slice(0, 50);
      
      localStorage.setItem('shopee_tool_history', JSON.stringify(updatedHistory));
      
      // Update local state
      setHistory(prev => [newItem, ...prev]);
    } catch (e) {
      console.error("Failed to save history (likely quota exceeded)", e);
    }
  };

  const updateHistoryItemAudio = (text: string, audioData: string) => {
    // Finds the most recent item with matching text and updates it
    try {
      const allHistory: ToolHistoryItem[] = JSON.parse(localStorage.getItem('shopee_tool_history') || '[]');
      let found = false;
      const updatedHistory = allHistory.map(item => {
        if (!found && item.toolId === tool?.id && item.result.text === text) {
          found = true;
          return { ...item, result: { ...item.result, audioData } };
        }
        return item;
      });

      if (found) {
        localStorage.setItem('shopee_tool_history', JSON.stringify(updatedHistory));
        if (tool) loadHistory(tool.id);
      }
    } catch (e) { console.error(e); }
  };

  const clearHistory = () => {
    if (!tool) return;
    if (!confirm('Tem certeza que deseja limpar o histórico desta ferramenta?')) return;

    const allHistory: ToolHistoryItem[] = JSON.parse(localStorage.getItem('shopee_tool_history') || '[]');
    const keptHistory = allHistory.filter(h => h.toolId !== tool.id);
    localStorage.setItem('shopee_tool_history', JSON.stringify(keptHistory));
    setHistory([]);
  };

  const handleSelectHistoryItem = (item: ToolHistoryItem) => {
    setInput(item.input);
    setResult(item.result);
    setShowHistory(false);
    setIsPlaying(false);
  };

  // --- Generation Logic ---

  if (!tool) return null;

  const handleSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setResult(null);
    setIsPlaying(false);
    
    try {
      const data = await generateToolContent(tool.id, input);
      setResult(data);
      saveToHistory(input, data);
    } catch (error) {
      alert("Erro ao gerar conteúdo.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (result?.text) {
      const success = await copyToClipboard(result.text);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleGenerateAudioFromText = async () => {
    if (!result?.text) return;
    setAudioLoading(true);
    try {
      const audioResult = await generateAudio(result.text);
      const newResult = { ...result, audioData: audioResult.audioData };
      
      setResult(newResult);
      updateHistoryItemAudio(result.text, audioResult.audioData!);
      
    } catch (e) {
      alert("Erro ao converter texto em voz.");
    } finally {
      setAudioLoading(false);
    }
  };

  const toggleAudio = () => {
    if (!result?.audioData) return;

    // Use audio/wav because we converted PCM to WAV in the service
    const mimeType = 'audio/wav';
    const sourceUrl = `data:${mimeType};base64,${result.audioData}`;

    if (!audioRef.current || audioRef.current.src !== sourceUrl) {
      audioRef.current = new Audio(sourceUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => {
        console.error("Play error:", e);
        alert("Não foi possível reproduzir o áudio.");
      });
      setIsPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-100 flex justify-between items-center ${tool.color} bg-opacity-10`}>
          <div className="flex items-center gap-3">
            {showHistory ? (
              <button onClick={() => setShowHistory(false)} className="mr-1 p-1 hover:bg-black/5 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-gray-700" />
              </button>
            ) : (
              <div className={`p-2 rounded-lg ${tool.color} text-white`}>
                <tool.icon size={20} />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {showHistory ? 'Histórico de Gerações' : tool.title}
              </h2>
              <p className="text-xs text-gray-500">
                {showHistory ? `Itens salvos para ${tool.title}` : tool.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!showHistory && (
              <button 
                onClick={() => setShowHistory(true)}
                className="p-2 text-gray-500 hover:text-shopee-600 hover:bg-shopee-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                title="Ver Histórico"
              >
                <History size={18} />
                <span className="hidden sm:inline">Histórico</span>
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6 bg-gray-50/50">
          
          {showHistory ? (
            /* HISTORY VIEW */
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <History size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Nenhum histórico encontrado para esta ferramenta.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <button 
                      onClick={clearHistory}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-3 py-1 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} /> Limpar Histórico
                    </button>
                  </div>
                  {history.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => handleSelectHistoryItem(item)}
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-shopee-300 cursor-pointer transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar size={12} />
                          {new Date(item.timestamp).toLocaleString('pt-BR')}
                        </div>
                        {item.result.audioData && (
                          <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <FileAudio size={10} /> Áudio
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 line-clamp-1 mb-1">Input: "{item.input}"</p>
                      <p className="text-xs text-gray-500 line-clamp-2 italic">{item.result.text}</p>
                      <div className="mt-2 text-shopee-500 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Clique para carregar
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            /* GENERATE VIEW */
            <>
              {/* Input Section */}
              <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{tool.inputLabel}</label>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder={tool.inputPlaceholder}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-shopee-200 focus:border-shopee-500 outline-none transition-all h-32 resize-none text-base"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-900'}`}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                    {tool.buttonLabel}
                  </button>
                </div>
              </form>

              {/* Result Section */}
              {result && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <span className="w-2 h-6 bg-shopee-500 rounded-full"></span>
                      Resultado
                    </h3>
                    <div className="flex gap-2">
                      {/* TTS Button for Text Results */}
                      {tool.id !== 'tts' && (
                        <button 
                          onClick={handleGenerateAudioFromText}
                          disabled={audioLoading}
                          className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full font-medium transition-colors ${result.audioData ? 'bg-purple-100 text-purple-700' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                          title="Gerar narração deste texto"
                        >
                          {audioLoading ? <Loader2 size={14} className="animate-spin"/> : <FileAudio size={14} />}
                          {result.audioData ? "Reproduzir/Atualizar" : "Gerar Voz"}
                        </button>
                      )}
                      
                      <button 
                        onClick={handleCopy}
                        className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium transition-colors"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6 relative shadow-sm">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed font-medium">
                      {result.text}
                    </div>

                    {/* Audio Player if available */}
                    {result.audioData && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
                        <button
                          onClick={toggleAudio}
                          className="w-12 h-12 flex items-center justify-center rounded-full bg-shopee-500 text-white shadow-md hover:bg-shopee-600 transition-transform hover:scale-105 flex-shrink-0"
                        >
                          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-shopee-500 rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`} style={{ width: isPlaying ? '100%' : '0%' }}></div>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                             <p className="text-xs text-gray-400">Narração IA (Kore)</p>
                             {isPlaying && <span className="text-xs text-shopee-500 font-bold animate-pulse">Reproduzindo...</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};