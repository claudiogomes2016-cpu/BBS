import React, { useState } from 'react';
import { HeaderBar } from './HeaderBar';
import { BBSObservation, SafetyLevel } from '../types';
import { Search, Filter, Calendar } from 'lucide-react';

interface HistoryScreenProps {
  observations: BBSObservation[];
  onBack: () => void;
  onSelectObservation: (obs: BBSObservation) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  observations,
  onBack,
  onSelectObservation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SafetyLevel | 'TODOS'>('TODOS');

  const filtered = observations.filter(obs => {
    const matchesSearch = 
      obs.collaborator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obs.area.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'TODOS' || obs.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: SafetyLevel) => {
    switch (status) {
      case 'SEGURO':
        return 'bg-[#10B981]';
      case 'CRÍTICO':
        return 'bg-[#DC2626]';
      case 'ATENÇÃO':
      default:
        return 'bg-[#EAB308]';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col max-w-md mx-auto border-x border-gray-200">
      <HeaderBar title="HISTÓRICO COMPLETO" onBack={onBack} />

      <div className="flex-1 p-5 space-y-4 pb-12">
        {/* SEARCH INPUT */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por colaborador ou área..."
            className="w-full bg-white text-black font-medium text-sm pl-11 pr-4 py-3 brutalist-border focus:outline-none focus:ring-2 focus:ring-[#FF3B00]"
          />
        </div>

        {/* FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['TODOS', 'ATENÇÃO', 'SEGURO', 'CRÍTICO'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`font-mono text-xs font-bold px-3 py-1.5 border border-black uppercase whitespace-nowrap transition-colors ${
                selectedStatus === st
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* LIST OF OBSERVATIONS */}
        <div className="space-y-3 pt-2">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 brutalist-border text-center text-gray-500 font-mono text-sm">
              Nenhum registro encontrado.
            </div>
          ) : (
            filtered.map((obs) => (
              <div
                key={obs.id}
                onClick={() => onSelectObservation(obs)}
                className="bg-white p-4 brutalist-border flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 ${getStatusColor(obs.status)} border border-black flex-shrink-0`} />
                  <div>
                    <h3 className="font-extrabold text-base text-black leading-tight">
                      {obs.collaborator}
                    </h3>
                    <p className="font-mono text-xs text-gray-500 mt-0.5">
                      {obs.area} · {obs.formattedDate}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-xs uppercase tracking-wider text-black">
                    {obs.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
