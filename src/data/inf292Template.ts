import {
  CourseFinalFormula,
  EnrolledCourseConfig,
  EvaluationGroup,
  SubFormulaBlock,
} from '@/types/academic';

/**
 * Creates the Sub-Formula definition for INF-292 (Optimización).
 *
 * Rules:
 * - PCE (10%): Controles de Entrada (7 controles CE1..CE7, drops 1 worst score, min >= 50).
 * - PC (45%): Certámenes (3 certámenes C1..C3, simple average, min >= 50).
 * - PP (45%): Proyectos y Entregas (3 entregas E1..E3, simple average, min >= 50).
 *
 * Final Grade Equation:
 *   NF = 0.10 * PCE + 0.45 * PC + 0.45 * PP >= 55
 *
 * USM Penalty Condition:
 *   IF PCE >= 50 AND PC >= 50 AND PP >= 50 THEN
 *     NF = 0.10 * PCE + 0.45 * PC + 0.45 * PP
 *   ELSE
 *     NF = min(PCE, PC, PP)
 */
export function createInf292FormulaConfig(): CourseFinalFormula {
  const pceBlock: SubFormulaBlock = {
    id: 'pce',
    name: 'Controles de Entrada',
    code: 'PCE',
    type: 'drop_worst',
    prefix: 'CE',
    count: 7,
    dropWorstCount: 1,
    minGradeRequired: 50,
    weightInFinal: 0.1, // 10%
    evaluations: [
      { id: 'ce1', name: 'Control de Entrada 1', weight: 1, score: null },
      { id: 'ce2', name: 'Control de Entrada 2', weight: 1, score: null },
      { id: 'ce3', name: 'Control de Entrada 3', weight: 1, score: null },
      { id: 'ce4', name: 'Control de Entrada 4', weight: 1, score: null },
      { id: 'ce5', name: 'Control de Entrada 5', weight: 1, score: null },
      { id: 'ce6', name: 'Control de Entrada 6', weight: 1, score: null },
      { id: 'ce7', name: 'Control de Entrada 7', weight: 1, score: null },
    ],
  };

  const pcBlock: SubFormulaBlock = {
    id: 'pc',
    name: 'Certámenes',
    code: 'PC',
    type: 'simple_average',
    prefix: 'C',
    count: 3,
    dropWorstCount: 0,
    minGradeRequired: 50,
    weightInFinal: 0.45, // 45%
    evaluations: [
      { id: 'c1', name: 'Certamen 1', weight: 1, score: null },
      { id: 'c2', name: 'Certamen 2', weight: 1, score: null },
      { id: 'c3', name: 'Certamen 3', weight: 1, score: null },
    ],
  };

  const ppBlock: SubFormulaBlock = {
    id: 'pp',
    name: 'Proyectos y Entregas',
    code: 'PP',
    type: 'simple_average',
    prefix: 'E',
    count: 3,
    dropWorstCount: 0,
    minGradeRequired: 50,
    weightInFinal: 0.45, // 45%
    evaluations: [
      { id: 'e1', name: 'Entrega 1', weight: 1, score: null },
      { id: 'e2', name: 'Entrega 2', weight: 1, score: null },
      { id: 'e3', name: 'Entrega 3', weight: 1, score: null },
    ],
  };

  return {
    expression: '0.10 * PCE + 0.45 * PC + 0.45 * PP',
    passingGrade: 55,
    applyPenaltyRule: true,
    subFormulas: [pceBlock, pcBlock, ppBlock],
  };
}

/**
 * Creates legacy EvaluationGroup[] corresponding to INF-292 blocks.
 * Enables full backwards compatibility with UI components inspecting config.groups.
 */
export function createInf292EvaluationGroups(): EvaluationGroup[] {
  const formula = createInf292FormulaConfig();
  return formula.subFormulas.map((block) => ({
    id: block.id,
    name: `${block.name} (${block.code})`,
    weight: Math.round(block.weightInFinal * 100),
    minGrade: block.minGradeRequired,
    hasRecoveryExam: block.code === 'PC',
    recoveryGrade: null,
    evaluations: block.evaluations.map((e) => ({
      id: e.id,
      name: e.name,
      weight: 100 / block.count,
      score: e.score,
    })),
  }));
}

/**
 * Creates the complete EnrolledCourseConfig for INF-292.
 */
export function createInf292CourseConfig(): EnrolledCourseConfig {
  return {
    sigla: 'INF-292',
    groups: createInf292EvaluationGroups(),
    formulaConfig: createInf292FormulaConfig(),
  };
}

/**
 * Populates an illustrative mid-semester example for INF-292:
 * - PCE: CE1=65, CE2=70, CE3=45, CE4=80 (3 empty)
 * - PC: C1=52 (C2, C3 empty)
 * - PP: E1=75 (E2, E3 empty)
 */
export function createInf292ExampleScenario(): EnrolledCourseConfig {
  const config = createInf292CourseConfig();
  const formula = config.formulaConfig!;

  // Fill sample grades in formulaConfig
  const pce = formula.subFormulas.find((b) => b.code === 'PCE')!;
  pce.evaluations[0].score = 65;
  pce.evaluations[1].score = 70;
  pce.evaluations[2].score = 45;
  pce.evaluations[3].score = 80;

  const pc = formula.subFormulas.find((b) => b.code === 'PC')!;
  pc.evaluations[0].score = 52;

  const pp = formula.subFormulas.find((b) => b.code === 'PP')!;
  pp.evaluations[0].score = 75;

  // Mirror scores to groups for compatibility
  for (const group of config.groups) {
    if (group.id === 'pce') {
      group.evaluations[0].score = 65;
      group.evaluations[1].score = 70;
      group.evaluations[2].score = 45;
      group.evaluations[3].score = 80;
    } else if (group.id === 'pc') {
      group.evaluations[0].score = 52;
    } else if (group.id === 'pp') {
      group.evaluations[0].score = 75;
    }
  }

  return config;
}
