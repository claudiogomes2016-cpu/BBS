export type SafetyLevel = 'ATENÇÃO' | 'SEGURO' | 'CRÍTICO';

export interface BBSQuestion {
  id: string;
  number: number; // e.g. 1, 2, 3
  categoryTag: string; // e.g. "RISCO · 1 - ESTOU APTO PARA O TRABALHO"
  title: string; // e.g. "Você dormiu bem antes deste turno?"
  subtitle: string; // e.g. "Como está sua energia agora?"
  active: boolean;
}

export interface QuestionAnswer {
  questionId: string;
  questionNumber: number;
  questionTitle: string;
  transcribedText: string;
  audioBlobUrl?: string;
}

export interface BBSObservation {
  id: string;
  collaborator: string;
  area: string;
  createdAt: string; // ISO string or formatted date
  formattedDate: string; // e.g. "04/08/2026 06:07"
  status: SafetyLevel;
  answers: QuestionAnswer[];
  identifiedRisks: string[];
  positivePoints: string[];
  actionPlanNeeded: boolean;
  actionPlanText: string;
  leaderRecommendations: string[];
}

export type ActiveScreen = 
  | 'HOME' 
  | 'NEW_OBSERVATION' 
  | 'INTERVIEW' 
  | 'REPORT' 
  | 'UPLOAD_QUESTIONS' 
  | 'HISTORY';
