import { BBSQuestion, BBSObservation } from '../types';

export const DEFAULT_QUESTIONS: BBSQuestion[] = [
  {
    id: 'q1',
    number: 1,
    categoryTag: 'RISCO · 1 - ESTOU APTO PARA O TRABALHO',
    title: 'Você dormiu bem antes deste turno?',
    subtitle: 'Como está sua energia agora?',
    active: true,
  },
  {
    id: 'q2',
    number: 2,
    categoryTag: 'RISCO · 1 - ESTOU APTO PARA O TRABALHO',
    title: 'Quais condições em seu ambiente podem dificultar o trabalho em segurança?',
    subtitle: 'O que você faria para mitigar isso?',
    active: true,
  },
  {
    id: 'q3',
    number: 3,
    categoryTag: 'RISCO · 2 - AVALIO RISCOS',
    title: 'Que risco pode ocorrer na próxima tarefa?',
    subtitle: 'Quais precauções pode tomar?',
    active: true,
  },
];

export const INITIAL_OBSERVATIONS: BBSObservation[] = [
  {
    id: 'obs-1',
    collaborator: 'Gg',
    area: 'Gg',
    createdAt: '2026-08-04T06:07:00.000Z',
    formattedDate: '04/08/2026 06:07',
    status: 'ATENÇÃO',
    answers: [
      {
        questionId: 'q1',
        questionNumber: 1,
        questionTitle: 'Você dormiu bem antes deste turno?',
        transcribedText: '(sem resposta)',
      },
      {
        questionId: 'q2',
        questionNumber: 2,
        questionTitle: 'Quais condições em seu ambiente podem dificultar o trabalho em segurança?',
        transcribedText: '(sem resposta)',
      },
      {
        questionId: 'q3',
        questionNumber: 3,
        questionTitle: 'Que risco pode ocorrer na próxima tarefa?',
        transcribedText: '(sem resposta)',
      }
    ],
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
  },
  {
    id: 'obs-2',
    collaborator: 'Bj',
    area: 'Jb',
    createdAt: '2026-08-03T23:29:00.000Z',
    formattedDate: '03/08/2026 23:29',
    status: 'ATENÇÃO',
    answers: [
      {
        questionId: 'q1',
        questionNumber: 1,
        questionTitle: 'Você dormiu bem antes deste turno?',
        transcribedText: '(sem resposta)',
      },
      {
        questionId: 'q2',
        questionNumber: 2,
        questionTitle: 'Quais condições em seu ambiente podem dificultar o trabalho em segurança?',
        transcribedText: '(sem resposta)',
      },
      {
        questionId: 'q3',
        questionNumber: 3,
        questionTitle: 'Que risco pode ocorrer na próxima tarefa?',
        transcribedText: '(sem resposta)',
      }
    ],
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
  },
  {
    id: 'obs-3',
    collaborator: 'TEST_Joao Silva',
    area: 'Producao',
    createdAt: '2026-08-03T23:22:00.000Z',
    formattedDate: '03/08/2026 23:22',
    status: 'ATENÇÃO',
    answers: [
      {
        questionId: 'q1',
        questionNumber: 1,
        questionTitle: 'Você dormiu bem antes deste turno?',
        transcribedText: 'Dormi apenas 4 horas por causa do barulho na vizinhança, estou um pouco cansado.',
      },
      {
        questionId: 'q2',
        questionNumber: 2,
        questionTitle: 'Quais condições em seu ambiente podem dificultar o trabalho em segurança?',
        transcribedText: 'A área de embalagem está com bastante óleo no chão perto da esteira.',
      },
      {
        questionId: 'q3',
        questionNumber: 3,
        questionTitle: 'Que risco pode ocorrer na próxima tarefa?',
        transcribedText: 'Risco de escorregão e queda ao transportar as caixas pesadas.',
      }
    ],
    identifiedRisks: [
      'Sinais de fadiga e tempo de sono insuficiente (4 horas)',
      'Presença de óleo no piso na área de embalagem',
      'Risco iminente de queda e escorregamento com cargas'
    ],
    positivePoints: [
      'Identificação clara e proativa dos riscos pelo operador',
      'Percepção adequada de perigo na área de trabalho'
    ],
    actionPlanNeeded: true,
    actionPlanText: 'Realizar limpeza imediata do óleo no setor de embalagem e remanejar operador para tarefa de baixo risco no primeiro turno.',
    leaderRecommendations: [
      'Solicitar ao time de manutenção/limpeza a remoção imediata do óleo no piso',
      'Avaliar nivel de fadiga do operador e reforçar pausas ativas',
      'Garantir o uso de calçado antiderrapante correto',
      'Registrar a condição de piso escorregadio no DDS do turno'
    ]
  }
];
