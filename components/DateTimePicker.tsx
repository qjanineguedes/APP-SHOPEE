import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value or default to now
  const initialDate = value ? new Date(value) : new Date();
  
  // States
  const [viewDate, setViewDate] = useState(initialDate); 
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  // Estado local para o texto do input
  const [inputValue, setInputValue] = useState("");

  // Helper: Formata Date para string PT-BR
  const formatDisplay = (date: Date) => {
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  // Helper: Tenta converter string PT-BR (dd/mm/yyyy hh:mm) para Date
  const parseInputDate = (str: string): Date | null => {
    // Regex simples para dd/mm/aaaa hh:mm
    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})$/;
    const match = str.match(regex);
    
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
      const year = parseInt(match[3], 10);
      const hour = parseInt(match[4], 10);
      const minute = parseInt(match[5], 10);

      const d = new Date(year, month, day, hour, minute);
      // Verifica se a data é válida (ex: não aceita 32/01)
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return d;
      }
    }
    return null;
  };

  // Sincroniza quando a prop externa muda
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setInputValue(formatDisplay(d));
        if (!isOpen) setViewDate(d);
      }
    } else {
        setInputValue("");
    }
  }, [value]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    return { days, firstDay };
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  // Handler: Digitação no Input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    // Tenta parsear em tempo real para atualizar o calendário visualmente
    const parsed = parseInputDate(text);
    if (parsed) {
      setSelectedDate(parsed);
      setViewDate(parsed); // Pula o calendário para o mês digitado
    }
  };

  // Handler: Blur do Input (Salva a data se válida)
  const handleInputBlur = () => {
    const parsed = parseInputDate(inputValue);
    if (parsed) {
        // Se válido, confirma a alteração
        commitDate(parsed);
    } else {
        // Se inválido e vazio, limpa. Se inválido e tem texto, reverte para o valor anterior válido.
        if (inputValue.trim() === "") {
             // Opcional: Permitir limpar? Por enquanto, reverte se a prop value existir
             if (value) setInputValue(formatDisplay(new Date(value)));
        } else if (value) {
             setInputValue(formatDisplay(new Date(value)));
        }
    }
  };

  // Funções de atualização interna (vindas do calendário/lista)
  const updateInternalState = (newDate: Date) => {
    setSelectedDate(newDate);
    setInputValue(formatDisplay(newDate));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(viewDate.getFullYear());
    newDate.setMonth(viewDate.getMonth());
    newDate.setDate(day);
    updateInternalState(newDate);
  };

  const handleTimeChange = (type: 'hour' | 'minute', val: number) => {
    const newDate = new Date(selectedDate);
    if (type === 'hour') newDate.setHours(val);
    if (type === 'minute') newDate.setMinutes(val);
    updateInternalState(newDate);
  };

  const commitDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // Format: YYYY-MM-DDTHH:mm
    const isoString = `${year}-${month}-${day}T${hours}:${minutes}`;
    onChange(isoString);
  };

  const handleConfirmClick = () => {
    commitDate(selectedDate);
    setIsOpen(false);
  };

  const { days, firstDay } = getDaysInMonth(viewDate);
  const daysArray = Array.from({ length: days }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDay }, (_, i) => i);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      
      <div className="relative group">
        <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={() => setIsOpen(true)}
            placeholder="dd/mm/aaaa hh:mm"
            className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-shopee-200 focus:border-shopee-500 outline-none transition-all cursor-text text-gray-700"
        />
        <div 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-shopee-500"
            onClick={() => setIsOpen(!isOpen)}
        >
            <CalendarIcon size={18} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-full sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-[60] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          
          {/* Header Month */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-shopee-50">
            <button onClick={() => changeMonth(-1)} type="button" className="p-1 hover:bg-white rounded-full transition-colors text-shopee-600">
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-shopee-800 capitalize">
              {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => changeMonth(1)} type="button" className="p-1 hover:bg-white rounded-full transition-colors text-shopee-600">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex h-64">
            {/* Calendar Grid */}
            <div className="flex-1 p-3 border-r border-gray-100 bg-white">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['D','S','T','Q','Q','S','S'].map((d, i) => (
                  <span key={i} className="text-[10px] font-bold text-gray-400">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {blanksArray.map(i => <div key={`blank-${i}`} />)}
                {daysArray.map(d => {
                  const isSelected = 
                    selectedDate.getDate() === d && 
                    selectedDate.getMonth() === viewDate.getMonth() && 
                    selectedDate.getFullYear() === viewDate.getFullYear();
                  
                  return (
                    <button
                      key={d}
                      type="button"
                      // Prevent form submission or focus loss
                      onMouseDown={(e) => e.preventDefault()} 
                      onClick={() => handleDateClick(d)}
                      className={`h-7 w-7 rounded-full text-xs flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-shopee-500 text-white font-bold shadow-md transform scale-105' 
                          : 'hover:bg-shopee-50 text-gray-700 hover:text-shopee-600'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Lists */}
            <div className="w-28 bg-gray-50 flex text-xs border-l border-gray-100">
              {/* Hours */}
              <div className="flex-1 overflow-y-auto no-scrollbar border-r border-gray-200 bg-white">
                <div className="p-2 text-center font-bold text-gray-400 border-b bg-gray-50 sticky top-0">Hr</div>
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleTimeChange('hour', h)}
                    className={`w-full py-2 text-center transition-colors ${
                      selectedDate.getHours() === h ? 'bg-shopee-100 text-shopee-600 font-bold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                ))}
              </div>
              {/* Minutes */}
              <div className="flex-1 overflow-y-auto no-scrollbar bg-white">
                <div className="p-2 text-center font-bold text-gray-400 border-b bg-gray-50 sticky top-0">Min</div>
                {minutes.map(m => (
                  <button
                    key={m}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleTimeChange('minute', m)}
                    className={`w-full py-2 text-center transition-colors ${
                      selectedDate.getMinutes() === m ? 'bg-shopee-100 text-shopee-600 font-bold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
             <div className="text-xs text-gray-500 flex items-center gap-1 font-medium bg-white px-2 py-1 rounded border border-gray-200">
               <Clock size={12} className="text-shopee-500" />
               {selectedDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
             </div>
             <button 
               type="button"
               onMouseDown={(e) => e.preventDefault()}
               onClick={handleConfirmClick}
               className="bg-shopee-500 hover:bg-shopee-600 text-white px-5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all transform active:scale-95 flex items-center gap-1"
             >
               <Check size={14} /> CONFIRMAR
             </button>
          </div>
        </div>
      )}
    </div>
  );
};