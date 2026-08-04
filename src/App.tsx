import React, { useState, useEffect } from 'react';
import { ActiveScreen, BBSObservation, BBSQuestion, QuestionAnswer } from './types';
import { DEFAULT_QUESTIONS, INITIAL_OBSERVATIONS } from './data/defaultData';
import { HomeScreen } from './components/HomeScreen';
import { NewObservationScreen } from './components/NewObservationScreen';
import { InterviewScreen } from './components/InterviewScreen';
import { ReportScreen } from './components/ReportScreen';
import { UploadQuestionsScreen } from './components/UploadQuestionsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { analyzeBBSObservation } from './services/geminiService';

export const App: React.FC = () => {
  // Questions State
  const [questions, setQuestions] = useState<BBSQuestion[]>(() => {
    const saved = localStorage.getItem('bbs_questions') || localStorage.getItem('bps_questions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_QUESTIONS;
  });

  // Observations History State
  const [observations, setObservations] = useState<BBSObservation[]>(() => {
    const saved = localStorage.getItem('bbs_observations') || localStorage.getItem('bps_observations');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_OBSERVATIONS;
  });

  // Active Screen State
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('HOME');

  // New Observation session temp state
  const [tempCollaborator, setTempCollaborator] = useState('');
  const [tempArea, setTempArea] = useState('');
  const [selectedObservation, setSelectedObservation] = useState<BBSObservation | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('bbs_questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem('bbs_observations', JSON.stringify(observations));
  }, [observations]);

  // Start New Observation process
  const handleStartNewObservation = () => {
    setActiveScreen('NEW_OBSERVATION');
  };

  // Submit Collaborator & Area, proceed to Voice Interview
  const handleStartInterview = (collaborator: string, area: string) => {
    setTempCollaborator(collaborator);
    setTempArea(area);
    setActiveScreen('INTERVIEW');
  };

  // Interview finished -> Analyze with Gemini AI & generate BBS Report
  const handleFinishInterview = async (answers: QuestionAnswer[]) => {
    const activeQuestions = questions.filter(q => q.active);
    
    // Prepare QA list for AI analysis
    const qaList = answers.map(a => ({
      questionNumber: a.questionNumber,
      questionTitle: a.questionTitle,
      answer: a.transcribedText,
    }));

    // Perform AI analysis
    const analysis = await analyzeBBSObservation(
      tempCollaborator,
      tempArea,
      qaList
    );

    // Format current date
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;

    const newObservation: BBSObservation = {
      id: `obs-${Date.now()}`,
      collaborator: tempCollaborator,
      area: tempArea,
      createdAt: now.toISOString(),
      formattedDate,
      status: analysis.status,
      answers,
      identifiedRisks: analysis.identifiedRisks,
      positivePoints: analysis.positivePoints,
      actionPlanNeeded: analysis.actionPlanNeeded,
      actionPlanText: analysis.actionPlanText,
      leaderRecommendations: analysis.leaderRecommendations,
    };

    setObservations(prev => [newObservation, ...prev]);
    setSelectedObservation(newObservation);
    setActiveScreen('REPORT');
  };

  const handleSelectObservation = (obs: BBSObservation) => {
    setSelectedObservation(obs);
    setActiveScreen('REPORT');
  };

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] text-black">
      {activeScreen === 'HOME' && (
        <HomeScreen
          questions={questions}
          observations={observations}
          onStartNewObservation={handleStartNewObservation}
          onOpenUploadQuestions={() => setActiveScreen('UPLOAD_QUESTIONS')}
          onOpenHistory={() => setActiveScreen('HISTORY')}
          onSelectObservation={handleSelectObservation}
        />
      )}

      {activeScreen === 'NEW_OBSERVATION' && (
        <NewObservationScreen
          activeQuestionsCount={questions.filter(q => q.active).length}
          onBack={() => setActiveScreen('HOME')}
          onStartInterview={handleStartInterview}
        />
      )}

      {activeScreen === 'INTERVIEW' && (
        <InterviewScreen
          collaborator={tempCollaborator}
          area={tempArea}
          questions={questions.filter(q => q.active)}
          onCancel={() => setActiveScreen('HOME')}
          onFinish={handleFinishInterview}
        />
      )}

      {activeScreen === 'REPORT' && selectedObservation && (
        <ReportScreen
          observation={selectedObservation}
          onDone={() => setActiveScreen('HOME')}
        />
      )}

      {activeScreen === 'UPLOAD_QUESTIONS' && (
        <UploadQuestionsScreen
          questions={questions}
          onBack={() => setActiveScreen('HOME')}
          onUpdateQuestions={setQuestions}
        />
      )}

      {activeScreen === 'HISTORY' && (
        <HistoryScreen
          observations={observations}
          onBack={() => setActiveScreen('HOME')}
          onSelectObservation={handleSelectObservation}
        />
      )}
    </div>
  );
};

export default App;
