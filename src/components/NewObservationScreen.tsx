import React, { useState } from 'react';
import { HeaderBar } from './HeaderBar';
import { Info, ArrowRight } from 'lucide-react';

interface NewObservationScreenProps {
  activeQuestionsCount: number;
  onBack: () => void;
  onStartInterview: (collaborator: string, area: string) => void;
}

export const NewObservationScreen: React.FC<NewObservationScreenProps> = ({
  activeQuestionsCount,
  onBack,
  onStartInterview,
}) => {
  const [collaborator, setCollaborator] = useState('');
  const [area, setArea] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaborator.trim() || !area.trim()) {
      alert('Por favor, preencha o nome do colaborador e a área.');
      return;
    }
    onStartInterview(collaborator.trim(), area.trim());
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col max-w-md mx-auto border-x border-gray-200">
      <HeaderBar title="NOVA OBSERVAÇÃO" onBack={onBack} />

      <form onSubmit={handleSubmit} className="flex-1 px-5 pt-6 pb-28 flex flex-col space-y-6">
        <p className="text-base font-normal text-black leading-relaxed">
          Identifique o colaborador antes de iniciar a entrevista de BBS.
        </p>

        {/* COLABORADOR INPUT */}
        <div className="space-y-2">
          <label className="block font-extrabold text-sm uppercase tracking-wider text-black">
            COLABORADOR
          </label>
          <input
            type="text"
            value={collaborator}
            onChange={(e) => setCollaborator(e.target.value)}
            placeholder="Nome completo"
            required
            className="w-full bg-white text-black font-medium text-base p-3.5 brutalist-border focus:outline-none focus:ring-2 focus:ring-[#FF3B00] placeholder:text-gray-400"
          />
        </div>

        {/* ÁREA INPUT */}
        <div className="space-y-2">
          <label className="block font-extrabold text-sm uppercase tracking-wider text-black">
            ÁREA
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Ex.: Produção, Manutenção..."
            required
            className="w-full bg-white text-black font-medium text-base p-3.5 brutalist-border focus:outline-none focus:ring-2 focus:ring-[#FF3B00] placeholder:text-gray-400"
          />
        </div>

        {/* INFO BOX */}
        <div className="bg-white p-4 brutalist-border flex items-center gap-3">
          <Info className="w-5 h-5 text-black flex-shrink-0" />
          <span className="font-mono text-sm text-black">
            {activeQuestionsCount} perguntas ativas nesta rodada
          </span>
        </div>

        {/* BOTTOM FIXED BUTTON */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white p-4 border-t-2 border-black">
          <button
            type="submit"
            className="w-full bg-[#FF3B00] hover:bg-[#E03400] text-white font-black text-lg tracking-wider uppercase py-4 px-6 rounded-none border-2 border-black flex items-center justify-center gap-3 shadow-md active:translate-y-0.5 transition-all"
          >
            <span>INICIAR BBS</span>
            <ArrowRight className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      </form>
    </div>
  );
};
