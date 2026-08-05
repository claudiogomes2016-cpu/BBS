import React, { useState } from 'react';
import { HeaderBar } from './HeaderBar';
import { BBSQuestion } from '../types';
import { Upload, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface UploadQuestionsScreenProps {
  questions: BBSQuestion[];
  onBack: () => void;
  onUpdateQuestions: (questions: BBSQuestion[]) => void;
}

export const UploadQuestionsScreen: React.FC<UploadQuestionsScreenProps> = ({
  questions,
  onBack,
  onUpdateQuestions,
}) => {
  const [questionList, setQuestionList] = useState<BBSQuestion[]>(questions);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleToggleActive = (id: string) => {
    const updated = questionList.map(q => q.id === id ? { ...q, active: !q.active } : q);
    setQuestionList(updated);
    onUpdateQuestions(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover esta pergunta?')) {
      const updated = questionList.filter(q => q.id !== id).map((q, idx) => ({ ...q, number: idx + 1 }));
      setQuestionList(updated);
      onUpdateQuestions(updated);
    }
  };

  const handleAddQuestion = () => {
    const newQ: BBSQuestion = {
      id: `q-${Date.now()}`,
      number: questionList.length + 1,
      categoryTag: 'RISCO · 1 - AVALIAÇÃO DE SEGURANÇA',
      title: 'Nova Pergunta de BBS',
      subtitle: 'Instruções adicionais...',
      active: true,
    };
    const updated = [...questionList, newQ];
    setQuestionList(updated);
    onUpdateQuestions(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage('Lendo arquivo de perguntas...');

    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

      if (file.type.startsWith('image/') && apiKey) {
        // Image OCR with Gemini AI
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const base64Data = (evt.target?.result as string).split(',')[1];
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Extraia as perguntas de BBS (Behavior-Based Safety / Segurança do Trabalho) desta imagem. Retorne um array JSON estrito de objetos com "title", "subtitle", "categoryTag". Sem markdown.`;
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64Data
                  }
                },
                prompt
              ]
            });

            const text = response.text || '';
            const match = text.match(/\[[\s\S]*\]/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              const importedQs: BBSQuestion[] = parsed.map((item: any, idx: number) => ({
                id: `q-ocr-${Date.now()}-${idx}`,
                number: questionList.length + idx + 1,
                categoryTag: item.categoryTag || 'RISCO · AVALIAÇÃO',
                title: item.title || 'Pergunta Importada',
                subtitle: item.subtitle || 'Instruções',
                active: true,
              }));
              const updated = [...questionList, ...importedQs];
              setQuestionList(updated);
              onUpdateQuestions(updated);
              setStatusMessage(`Sucesso! ${importedQs.length} perguntas importadas via OCR.`);
            }
          } catch (err) {
            console.error(err);
            setStatusMessage('Erro ao processar imagem via Gemini. Importando texto padrão...');
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Text file fallback
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim().length > 3);
        const newQuestions: BBSQuestion[] = lines.map((line, idx) => ({
          id: `q-file-${Date.now()}-${idx}`,
          number: questionList.length + idx + 1,
          categoryTag: 'RISCO · IMPORTADO',
          title: line.trim(),
          subtitle: 'Como você avalia esta condição?',
          active: true,
        }));
        const updated = [...questionList, ...newQuestions];
        setQuestionList(updated);
        onUpdateQuestions(updated);
        setStatusMessage(`${newQuestions.length} perguntas adicionadas do arquivo.`);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Falha ao ler o arquivo.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col max-w-md mx-auto border-x border-gray-200">
      <HeaderBar title="UPLOAD DE PERGUNTAS" onBack={onBack} />

      <div className="flex-1 p-5 space-y-5 pb-24">
        {/* UPLOAD BOX */}
        <div className="bg-white p-5 brutalist-border space-y-3 text-center">
          <Upload className="w-8 h-8 text-[#FF3B00] mx-auto stroke-[2.5]" />
          <div>
            <h3 className="font-extrabold text-base uppercase text-black">
              IMPORTAR PERGUNTAS BBS
            </h3>
            <p className="text-xs font-mono text-gray-500 mt-1">
              Envie uma foto (OCR) ou arquivo de texto com as novas perguntas.
            </p>
          </div>

          <label className="inline-block bg-[#FF3B00] hover:bg-[#E03400] text-white font-extrabold text-xs uppercase tracking-wider py-3 px-5 brutalist-border cursor-pointer active:translate-y-0.5 transition-all">
            <span>SELECIONAR ARQUIVO</span>
            <input
              type="file"
              accept="image/*,.txt,.doc,.docx,.pdf"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
          </label>

          {statusMessage && (
            <p className="font-mono text-xs font-bold text-[#10B981] pt-2">
              {statusMessage}
            </p>
          )}
        </div>

        {/* ACTIVE QUESTIONS LIST */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-sm uppercase tracking-wider text-black">
              PERGUNTAS CADASTRADAS ({questionList.length})
            </h2>
            <button
              onClick={handleAddQuestion}
              className="font-mono text-xs font-bold text-[#FF3B00] hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>ADICIONAR</span>
            </button>
          </div>

          <div className="space-y-3">
            {questionList.map((q) => (
              <div key={q.id} className="bg-white p-4 brutalist-border space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono font-bold text-xs text-[#FF3B00] bg-orange-50 px-2 py-0.5 border border-[#FF3B00]">
                    #{q.number}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(q.id)}
                      className={`font-mono text-xs px-2 py-0.5 font-bold border border-black ${
                        q.active ? 'bg-[#10B981] text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {q.active ? 'ATIVA' : 'INATIVA'}
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={q.title}
                  onChange={(e) => {
                    const updated = questionList.map(item => item.id === q.id ? { ...item, title: e.target.value } : item);
                    setQuestionList(updated);
                    onUpdateQuestions(updated);
                  }}
                  className="w-full font-extrabold text-sm text-black border-b border-gray-300 focus:border-black focus:outline-none py-1"
                />

                <input
                  type="text"
                  value={q.subtitle}
                  onChange={(e) => {
                    const updated = questionList.map(item => item.id === q.id ? { ...item, subtitle: e.target.value } : item);
                    setQuestionList(updated);
                    onUpdateQuestions(updated);
                  }}
                  className="w-full font-mono text-xs text-gray-500 border-b border-gray-200 focus:border-black focus:outline-none py-1"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
