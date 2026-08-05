import React, { useState } from 'react';
import { HeaderBar } from './HeaderBar';
import { BBSObservation } from '../types';
import { Save } from 'lucide-react';

interface EditObservationScreenProps {
  observation: BBSObservation;
  onBack: () => void;
  onSave: (collaborator: string, area: string, answers: { questionId: string; questionNumber: number; questionTitle: string; transcribedText: string }[]) => void;
  isSaving: boolean;
}

export const EditObservationScreen: React.FC<EditObservationScreenProps> = ({
  observation,
  onBack,
  onSave,
  isSaving,
}) => {
  const [collaborator, setCollaborator] = useState(observation.collaborator);
  const [area, setArea] = useState(observation.area);
  const [answers, setAnswers] = useState(observation.answers);

  const handleAnswerChange = (questionId: string, text: string) => {
    setAnswers(prev => prev.map(a => a.questionId === questionId ? { ...a, transcribedText: text } : a));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaborator.trim() || !area.trim()) {
      alert('Por favor, preencha o nome do colaborador e a área.');
      return;
    }
    onSave(collaborator.trim(), area.trim(), answers);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col max-w-md mx-auto border-x border-gray-200">
      <HeaderBar title="EDITAR OBSERVAÇÃO" onBack={onBack} />

      <form onSubmit={handleSubmit} className="flex-1 px-5 pt-6 pb-28 flex flex-col space-y-5">
        <div className="space-y-2">
          <label className="block font-extrabold text-sm uppercase tracking-wider text-black">
            COLABORADOR
          </label>
          <input
            type="text"
            value={collaborator}
            onChange={(e) => setCollaborator(e.target.value)}
            required
            className="w-full bg-white text-black font-medium text-base p-3.5 brutalist-border focus:outline-none focus:ring-2 focus:ring-[#FF3B00]"
          />
        </div>

        <div className="space-y-2">
          <label className="block font-extrabold text-sm uppercase tracking-wider text-black">
            ÁREA
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
            className="w-full bg-white text-black font-medium text-base p-3.5 brutalist-border focus:outline-none focus:ring-2 focus:ring-[#FF3B00]"
          />
        </div>

        <div className="space-y-3">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-black">
            RESPOSTAS
          </h2>
          {answers.map((ans) => (
            <div key={ans.questionId} className="bg-white p-4 brutalist-border space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="font-mono font-bold text-xs text-[#FF3B00] bg-orange-50 px-1.5 py-0.5 border border-[#FF3B00]">
                  Q{ans.questionNumber}
                </span>
                <h3 className="font-extrabold text-sm text-black leading-snug">
                  {ans.questionTitle}
                </h3>
              </div>
              <textarea
                value={ans.transcribedText}
                onChange={(e) => handleAnswerChange(ans.questionId, e.target.value)}
                className="w-full bg-transparent text-black font-medium text-sm resize-none focus:outline-none min-h-[70px] border-t border-gray-200 pt-2"
              />
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white p-4 border-t-2 border-black">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-[#FF3B00] hover:bg-[#E03400] disabled:opacity-60 text-white font-black text-base uppercase tracking-wider py-4 px-6 rounded-none border-2 border-black flex items-center justify-center gap-3 shadow-md active:translate-y-0.5 transition-all"
          >
            <Save className="w-5 h-5 stroke-[2.5]" />
            <span>{isSaving ? 'REAVALIANDO...' : 'SALVAR ALTERAÇÕES'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
