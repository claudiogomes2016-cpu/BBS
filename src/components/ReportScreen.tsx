import React from 'react';
import { HeaderBar } from './HeaderBar';
import { BBSObservation } from '../types';

interface ReportScreenProps {
  observation: BBSObservation;
  onDone: () => void;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({
  observation,
  onDone,
}) => {
  // Determine banner color based on safety level
  const getBannerBgClass = () => {
    switch (observation.status) {
      case 'SEGURO':
        return 'bg-[#10B981] text-white';
      case 'CRÍTICO':
        return 'bg-[#DC2626] text-white';
      case 'ATENÇÃO':
      default:
        return 'bg-[#EAB308] text-white'; // High contrast yellow/gold
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto border-x border-gray-200">
      {/* HEADER BAR */}
      <HeaderBar
        title="RELATÓRIO BBS"
        onClose={onDone}
      />

      {/* HERO BANNER SECTION */}
      <div className={`p-6 ${getBannerBgClass()} space-y-1.5 shadow-inner`}>
        <div className="font-mono text-xs font-bold uppercase tracking-widest text-white/90">
          NÍVEL DE SEGURANÇA
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tight text-white leading-none">
          {observation.status}
        </h1>
        <p className="font-mono text-sm text-white/90 font-medium pt-1">
          {observation.collaborator} · {observation.area}
        </p>
      </div>

      <div className="flex-1 pb-32 divide-y-2 divide-black">
        {/* RISCOS IDENTIFICADOS */}
        <div className="p-5 space-y-3 bg-white">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-black">
            RISCOS IDENTIFICADOS
          </h2>
          <div className="space-y-2.5">
            {observation.identifiedRisks.map((risk, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-4 h-4 bg-[#DC2626] border border-black mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium text-black leading-snug">
                  {risk}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PONTOS POSITIVOS */}
        <div className="p-5 space-y-3 bg-white">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-black">
            PONTOS POSITIVOS
          </h2>
          <div className="space-y-2">
            {observation.positivePoints.map((point, index) => (
              <p key={index} className="font-mono text-sm text-gray-500 leading-relaxed">
                {point.startsWith('-') ? point : `– ${point}`}
              </p>
            ))}
          </div>
        </div>

        {/* PLANO DE AÇÃO */}
        <div className="p-5 space-y-3 bg-white">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-black">
            PLANO DE AÇÃO
          </h2>
          <div>
            <span className={`inline-block px-3 py-1 font-mono text-xs font-extrabold tracking-wider uppercase border border-black ${
              observation.actionPlanNeeded ? 'bg-[#DC2626] text-white' : 'bg-[#10B981] text-white'
            }`}>
              {observation.actionPlanNeeded ? 'NECESSÁRIO' : 'DISPENSADO'}
            </span>
          </div>
          <p className="text-sm font-medium text-black leading-relaxed pt-1">
            {observation.actionPlanText}
          </p>
        </div>

        {/* RECOMENDAÇÕES PARA O LÍDER */}
        <div className="p-5 space-y-3 bg-white">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-black">
            RECOMENDAÇÕES PARA O LÍDER
          </h2>
          <div className="space-y-3">
            {observation.leaderRecommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-4 h-4 bg-[#DC2626] border border-black mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium text-black leading-snug">
                  {rec}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RESPOSTAS */}
        <div className="p-5 space-y-3 bg-white">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-black">
            RESPOSTAS
          </h2>
          <div className="space-y-3">
            {observation.answers.map((ans, idx) => (
              <div key={idx} className="p-4 bg-white brutalist-border space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-xs text-[#FF3B00] bg-orange-50 px-1.5 py-0.5 border border-[#FF3B00]">
                    Q{ans.questionNumber}
                  </span>
                  <h3 className="font-extrabold text-sm text-black leading-snug">
                    {ans.questionTitle}
                  </h3>
                </div>
                <p className="font-mono text-xs text-gray-500 pl-7 italic">
                  ({ans.transcribedText || 'sem resposta'})
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FIXED BOTTOM ACTION BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white p-4 border-t-2 border-black z-20">
        <button
          onClick={onDone}
          className="w-full bg-[#FF3B00] hover:bg-[#E03400] text-white font-black text-base uppercase tracking-wider py-4 px-6 rounded-none border-2 border-black shadow-md active:translate-y-0.5 transition-all"
        >
          SALVAR E VOLTAR AO INÍCIO
        </button>
      </div>
    </div>
  );
};
