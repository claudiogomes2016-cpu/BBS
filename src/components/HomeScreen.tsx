import React from 'react';
import { Mic, Upload, Clock, ChevronRight, Headphones, Glasses, Ear, ShieldCheck } from 'lucide-react';
import { BBSObservation, BBSQuestion } from '../types';

interface HomeScreenProps {
  questions: BBSQuestion[];
  observations: BBSObservation[];
  onStartNewObservation: () => void;
  onOpenUploadQuestions: () => void;
  onOpenHistory: () => void;
  onSelectObservation: (obs: BBSObservation) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  questions,
  observations,
  onStartNewObservation,
  onOpenUploadQuestions,
  onOpenHistory,
  onSelectObservation,
}) => {
  const activeQuestionsCount = questions.filter(q => q.active).length;
  const currentMonthYear = '2026-08';

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 flex flex-col max-w-md mx-auto border-x border-gray-200">
      {/* HERO SECTION WITH INDUSTRIAL SAFETY BACKGROUND & EPI HIGHLIGHTS */}
      <div className="relative bg-black text-white px-6 pt-7 pb-6 overflow-hidden min-h-[320px] flex flex-col justify-between">
        {/* Background Overlay Image (Personal Protective Equipment) */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-luminosity scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1000&auto=format&fit=crop')`
          }}
        />
        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

        {/* Top Header Row */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="text-[#FF3B00] font-black tracking-widest text-xs uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            <span>BEHAVIOR-BASED SAFETY</span>
          </div>
          <span className="px-2.5 py-0.5 bg-black/80 text-white font-mono text-[10px] font-bold border border-white/60 tracking-wider uppercase">
            {currentMonthYear}
          </span>
        </div>

        {/* Main Title */}
        <div className="relative z-10 my-2 space-y-1">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase leading-none text-white drop-shadow-md">
            BBS<br />SEGURANÇA
          </h1>
          <p className="font-mono text-xs text-gray-300 font-semibold uppercase tracking-wider">
            {activeQuestionsCount} PERGUNTAS ATIVAS
          </p>
        </div>

        {/* EPI SHOWCASE CARD (Abafador Concha, Óculos de Proteção, Plug Auricular) */}
        <div className="relative z-10 bg-black/85 backdrop-blur-sm border-2 border-white/80 p-3 mt-1 shadow-lg space-y-2">
          <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
            <span className="font-mono text-[11px] font-black uppercase text-[#FF3B00] tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FF3B00] animate-pulse" />
              EPI OBRIGATÓRIO EM CAMPO
            </span>
            <span className="text-[10px] font-mono text-gray-400">NR-06</span>
          </div>

          {/* 3 EPI Badges */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center">
            {/* Abafador Concha */}
            <div className="bg-white/10 hover:bg-white/20 p-2 border border-white/30 flex flex-col items-center justify-center space-y-1 transition-colors">
              <Headphones className="w-5 h-5 text-[#FF3B00] stroke-[2.5]" />
              <span className="font-extrabold text-[10px] uppercase leading-tight text-white tracking-tight">
                ABAFADOR<br />CONCHA
              </span>
            </div>

            {/* Óculos de Proteção */}
            <div className="bg-white/10 hover:bg-white/20 p-2 border border-white/30 flex flex-col items-center justify-center space-y-1 transition-colors">
              <Glasses className="w-5 h-5 text-[#FF3B00] stroke-[2.5]" />
              <span className="font-extrabold text-[10px] uppercase leading-tight text-white tracking-tight">
                ÓCULOS DE<br />PROTEÇÃO
              </span>
            </div>

            {/* Plug Auricular */}
            <div className="bg-white/10 hover:bg-white/20 p-2 border border-white/30 flex flex-col items-center justify-center space-y-1 transition-colors">
              <Ear className="w-5 h-5 text-[#FF3B00] stroke-[2.5]" />
              <span className="font-extrabold text-[10px] uppercase leading-tight text-white tracking-tight">
                PLUG<br />AURICULAR
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="px-4 pt-5 space-y-4 flex-1">
        {/* MAIN CTA: NOVA OBSERVAÇÃO */}
        <button
          onClick={onStartNewObservation}
          className="w-full bg-[#FF3B00] hover:bg-[#E03400] text-white font-bold text-lg tracking-wide uppercase py-4 px-5 rounded-none brutalist-border flex items-center justify-between shadow-md active:translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-3">
            <Mic className="w-6 h-6 stroke-[2.5]" />
            <span>NOVA OBSERVAÇÃO</span>
          </div>
          <ChevronRight className="w-6 h-6 stroke-[3]" />
        </button>

        {/* SECONDARY GRID BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenUploadQuestions}
            className="bg-white hover:bg-gray-50 text-black p-4 rounded-none brutalist-border text-left flex flex-col justify-between min-h-[100px] active:translate-y-0.5 transition-all"
          >
            <Upload className="w-6 h-6 text-black stroke-[2] mb-3" />
            <span className="font-extrabold text-sm uppercase leading-tight tracking-tight">
              UPLOAD<br />PERGUNTAS
            </span>
          </button>

          <button
            onClick={onOpenHistory}
            className="bg-white hover:bg-gray-50 text-black p-4 rounded-none brutalist-border text-left flex flex-col justify-between min-h-[100px] active:translate-y-0.5 transition-all"
          >
            <Clock className="w-6 h-6 text-black stroke-[2] mb-3" />
            <span className="font-extrabold text-sm uppercase leading-tight tracking-tight">
              HISTÓRICO<br />COMPLETO
            </span>
          </button>
        </div>

        {/* HISTÓRICO RECENTE SECTION */}
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold tracking-wider uppercase text-black">
              HISTÓRICO RECENTE
            </h2>
          </div>

          <div className="space-y-2.5">
            {observations.length === 0 ? (
              <div className="bg-white p-6 brutalist-border text-center text-gray-500 font-mono text-sm">
                Nenhuma observação registrada.
              </div>
            ) : (
              observations.slice(0, 5).map((obs) => {
                // Determine color block based on status
                const getStatusColor = (status: string) => {
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
                  <div
                    key={obs.id}
                    onClick={() => onSelectObservation(obs)}
                    className="bg-white p-3.5 rounded-none brutalist-border flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Color indicator square */}
                      <div className={`w-8 h-8 ${getStatusColor(obs.status)} border border-black flex-shrink-0`} />
                      
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
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
