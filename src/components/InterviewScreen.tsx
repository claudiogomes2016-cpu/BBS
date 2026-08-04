import React, { useState, useEffect, useRef } from 'react';
import { HeaderBar } from './HeaderBar';
import { Volume2, Mic, MicOff, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { BBSQuestion, QuestionAnswer } from '../types';
import { speakText, createSpeechRecognizer, isSpeechRecognitionSupported } from '../utils/speech';

interface InterviewScreenProps {
  collaborator: string;
  area: string;
  questions: BBSQuestion[];
  onCancel: () => void;
  onFinish: (answers: QuestionAnswer[]) => void;
}

export const InterviewScreen: React.FC<InterviewScreenProps> = ({
  collaborator,
  area,
  questions,
  onCancel,
  onFinish,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatusText, setRecordingStatusText] = useState('');

  const recognizerRef = useRef<any>(null);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const currentNumberFormatted = String(currentIndex + 1).padStart(2, '0');
  const totalFormatted = String(totalQuestions).padStart(2, '0');

  const currentAnswerText = answers[currentQuestion.id] || '';

  // Clean up speech synthesizer / recognizer on unmount or question change
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch (e) {}
      }
    };
  }, [currentIndex]);

  const handleHearQuestion = async () => {
    setIsSpeaking(true);
    const fullTextToSpeak = `${currentQuestion.title}. ${currentQuestion.subtitle}`;
    await speakText(fullTextToSpeak);
    setIsSpeaking(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch (e) {}
      }
      setIsRecording(false);
      setRecordingStatusText('');
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      alert('Seu navegador não possui suporte ao reconhecimento de voz nativo. Você pode digitar a resposta no campo.');
      return;
    }

    setIsRecording(true);
    setRecordingStatusText('Ouvindo...');

    const recognizer = createSpeechRecognizer(
      (text) => {
        setAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: text
        }));
      },
      (err) => {
        setRecordingStatusText(err);
        setIsRecording(false);
      },
      () => {
        setIsRecording(false);
        setRecordingStatusText('');
      }
    );

    if (recognizer) {
      recognizerRef.current = recognizer;
      try {
        recognizer.start();
      } catch (e) {
        console.error(e);
        setIsRecording(false);
      }
    }
  };

  const handleNext = () => {
    if (isRecording) {
      toggleRecording();
    }
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (isRecording) {
      toggleRecording();
    }
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleCompleteInterview = () => {
    if (isRecording) {
      toggleRecording();
    }

    // Build question answer list
    const finalAnswers: QuestionAnswer[] = questions.map(q => ({
      questionId: q.id,
      questionNumber: q.number,
      questionTitle: q.title,
      transcribedText: answers[q.id]?.trim() ? answers[q.id].trim() : '(sem resposta)',
    }));

    onFinish(finalAnswers);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto border-x border-gray-200">
      {/* HEADER BAR WITH PROGRESS LINE */}
      <HeaderBar
        title={`${collaborator} · ${area}`}
        onClose={onCancel}
        progressBarRatio={(currentIndex + 1) / totalQuestions}
      />

      <div className="flex-1 px-5 pt-6 pb-40 flex flex-col space-y-5">
        {/* HUGE STEP COUNTER: 01/03 */}
        <div className="text-5xl font-black text-[#FF3B00] tracking-tight font-mono">
          {currentNumberFormatted}/{totalFormatted}
        </div>

        {/* CATEGORY TAG */}
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">
          {currentQuestion.categoryTag}
        </div>

        {/* QUESTION TITLE & SUBTITLE */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black text-black leading-tight">
            {currentQuestion.title}
          </h1>
          <p className="text-base text-gray-500 font-normal">
            {currentQuestion.subtitle}
          </p>
        </div>

        {/* OUVIR PERGUNTA BUTTON */}
        <button
          onClick={handleHearQuestion}
          disabled={isSpeaking}
          className="w-full bg-white hover:bg-gray-50 text-black font-extrabold text-sm uppercase tracking-wider py-3.5 px-4 rounded-none brutalist-border flex items-center justify-center gap-2 transition-all active:translate-y-0.5"
        >
          <Volume2 className={`w-5 h-5 stroke-[2.5] ${isSpeaking ? 'animate-bounce text-[#FF3B00]' : ''}`} />
          <span>{isSpeaking ? 'FALANDO PERGUNTA...' : 'OUVIR PERGUNTA'}</span>
        </button>

        {/* TRANSCRIPTION BOX */}
        <div className="bg-white p-4 rounded-none brutalist-border flex-1 flex flex-col space-y-2 min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-gray-500">
              RESPOSTA TRANSCRITA
            </span>
            {isRecording && (
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#FF3B00] font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#FF3B00]" />
                {recordingStatusText || 'GRAVANDO...'}
              </span>
            )}
          </div>

          <textarea
            value={currentAnswerText}
            onChange={(e) => {
              setAnswers({
                ...answers,
                [currentQuestion.id]: e.target.value
              });
            }}
            placeholder="Aguardando gravação da resposta..."
            className="w-full flex-1 bg-transparent text-black font-medium text-base resize-none focus:outline-none placeholder:text-gray-400 placeholder:italic leading-relaxed"
          />
        </div>
      </div>

      {/* FIXED BOTTOM CONTROLS */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white p-4 border-t-2 border-black space-y-2.5 z-20">
        {/* RECORD BUTTON */}
        <button
          onClick={toggleRecording}
          className={`w-full font-black text-base uppercase tracking-wider py-3.5 px-4 rounded-none border-2 border-black flex items-center justify-center gap-2.5 transition-all shadow-sm ${
            isRecording 
              ? 'bg-red-600 text-white animate-pulse' 
              : 'bg-[#FF3B00] hover:bg-[#E03400] text-white'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-5 h-5 stroke-[2.5]" />
              <span>PARAR GRAVAÇÃO</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 stroke-[2.5]" />
              <span>GRAVAR RESPOSTA</span>
            </>
          )}
        </button>

        {/* NAVIGATION BUTTONS */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`w-full bg-white text-black font-extrabold text-sm uppercase tracking-wider py-3 px-3 rounded-none border-2 border-black flex items-center justify-center gap-2 ${
              currentIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100 active:translate-y-0.5'
            }`}
          >
            <ArrowLeft className="w-4 h-4 stroke-[3]" />
            <span>ANTERIOR</span>
          </button>

          {currentIndex < totalQuestions - 1 ? (
            <button
              onClick={handleNext}
              className="w-full bg-black hover:bg-gray-900 text-white font-extrabold text-sm uppercase tracking-wider py-3 px-3 rounded-none border-2 border-black flex items-center justify-center gap-2 active:translate-y-0.5"
            >
              <span>PRÓXIMA</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          ) : (
            <button
              onClick={handleCompleteInterview}
              className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black text-sm uppercase tracking-wider py-3 px-3 rounded-none border-2 border-black flex items-center justify-center gap-2 active:translate-y-0.5"
            >
              <span>FINALIZAR</span>
              <Check className="w-5 h-5 stroke-[3]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
