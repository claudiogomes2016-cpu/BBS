import { GoogleGenAI } from '@google/genai';
import { SafetyLevel } from '../types';

export interface AnalysisResult {
  status: SafetyLevel;
  identifiedRisks: string[];
  positivePoints: string[];
  actionPlanNeeded: boolean;
  actionPlanText: string;
  leaderRecommendations: string[];
}

export async function analyzeBBSObservation(
  collaborator: string,
  area: string,
  qaList: { questionNumber: number; questionTitle: string; answer: string }[]
): Promise<AnalysisResult> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY || '';

  // Check if all answers are empty or '(sem resposta)'
  const hasValidAnswers = qaList.some(
    item => item.answer && item.answer.trim() !== '' && item.answer.toLowerCase() !== '(sem resposta)'
  );

  // If no answers were recorded, return default fallback matching video exactly
  if (!hasValidAnswers) {
    return {
      status: 'ATENÇÃO',
      identifiedRisks: [
        'falta de informações sobre fadiga',
        'falta de identificação de riscos da tarefa',
        'possível ausência de percepção de perigos'
      ],
      positivePoints: [
        'Nenhum ponto positivo destacado'
      ],
      actionPlanNeeded: true,
      actionPlanText: 'Não houve respostas às perguntas-chave, impedindo avaliar os riscos e a prontidão para a tarefa.',
      leaderRecommendations: [
        'Replicar a entrevista antes do início da atividade',
        'Verificar condições de descanso e aptidão do colaborador',
        'Orientar sobre os principais riscos da tarefa',
        'Registrar e tratar a falta de resposta como desvio de segurança'
      ]
    };
  }

  // If Gemini API Key is available, perform intelligent safety analysis
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
Você é um especialista em Segurança do Trabalho e BBS (Behavior-Based Safety / Segurança Baseada em Comportamento).
Analise as respostas da entrevista de segurança de um colaborador e retorne um objeto JSON estrito com o diagnóstico.

DADOS DO COLABORADOR:
- Nome: ${collaborator}
- Área: ${area}

ENTREVISTA DE SEGURANÇA:
${qaList.map(q => `Pergunta ${q.questionNumber}: ${q.questionTitle}\nResposta: ${q.answer || '(sem resposta)'}`).join('\n\n')}

Regras para avaliação:
1. "status": deve ser "SEGURO" (se todas as respostas indicarem total prontidão e ambiente seguro), "ATENÇÃO" (se houver fadiga leve, incerteza, desvio ou falta de resposta) ou "CRÍTICO" (se houver risco grave, falta de sono grave, recusa de epi, etc.).
2. "identifiedRisks": array com 2 a 4 frases curtas e minúsculas descrevendo os riscos identificados nas respostas.
3. "positivePoints": array com 1 a 3 frases destacando atitudes seguras do colaborador. Se não houver, adicione "Nenhum ponto positivo destacado".
4. "actionPlanNeeded": boolean (true se status for ATENÇÃO ou CRÍTICO).
5. "actionPlanText": texto conciso e formal descrevendo o plano de ação necessário.
6. "leaderRecommendations": array de 3 a 5 frases acionáveis iniciando em maiúscula direcionadas ao líder de equipe.

Responda EXCLUSIVAMENTE em formato JSON sem marcação markdown:
{
  "status": "ATENÇÃO",
  "identifiedRisks": ["frase 1", "frase 2"],
  "positivePoints": ["frase 1"],
  "actionPlanNeeded": true,
  "actionPlanText": "descrição...",
  "leaderRecommendations": ["recomendação 1", "recomendação 2"]
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text?.trim() || '';
      // Parse JSON from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          status: parsed.status || 'ATENÇÃO',
          identifiedRisks: parsed.identifiedRisks || [],
          positivePoints: parsed.positivePoints || ['Nenhum ponto positivo destacado'],
          actionPlanNeeded: parsed.actionPlanNeeded ?? true,
          actionPlanText: parsed.actionPlanText || 'Acompanhamento do líder necessário.',
          leaderRecommendations: parsed.leaderRecommendations || []
        };
      }
    } catch (err) {
      console.error('Gemini Analysis error, falling back to local heuristic:', err);
    }
  }

  // Smart local rule fallback
  const allAnswersText = qaList.map(q => q.answer.toLowerCase()).join(' ');
  const hasRiskWords = /dor|cansad|sono|óleo|barulho|pressão|falta|perigo|risco|escorreg/i.test(allAnswersText);

  if (hasRiskWords) {
    return {
      status: 'ATENÇÃO',
      identifiedRisks: [
        'sinais de fadiga ou fatores ambientais relatados',
        'necessidade de alinhamento sobre percepção de riscos da tarefa',
        'atenção aos equipamentos e ambiente do setor'
      ],
      positivePoints: [
        'Transparência na comunicação de condições de trabalho'
      ],
      actionPlanNeeded: true,
      actionPlanText: 'Líder deve realizar alinhamento individual com o colaborador e inspecionar o local antes do início.',
      leaderRecommendations: [
        'Avaliar o estado físico e nível de alerta do colaborador',
        'Verificar as condições de segurança da área informada',
        'Orientar o colaborador sobre os procedimentos seguros da tarefa',
        'Acompanhar os primeiros minutos da atividade em campo'
      ]
    };
  }

  return {
    status: 'SEGURO',
    identifiedRisks: [
      'nenhum risco crítico identificado na entrevista'
    ],
    positivePoints: [
      'Boa disposição e sono adequado relatado',
      'Clara percepção dos riscos da tarefa e ações preventivas'
    ],
    actionPlanNeeded: false,
    actionPlanText: 'Liberado para execução normal da atividade com acompanhamento padrão.',
    leaderRecommendations: [
      'Manter o bom padrão de diálogo e acompanhamento preventivo',
      'Elogiar a postura proativa do colaborador quanto à segurança'
    ]
  };
}
