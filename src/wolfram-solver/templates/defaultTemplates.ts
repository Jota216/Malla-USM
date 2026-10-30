import {
  EvaluationGroup,
  EnrolledCourseConfig,
  GraduationMilestone,
  CourseFinalFormula,
  SubFormulaBlock,
  Course,
} from '@/shared/types/academic';
import {
  createInf292CourseConfig,
  createInf292FormulaConfig,
  createInf292EvaluationGroups,
  createInf292ExampleScenario,
} from './inf292Template';
import {
  inferCourseFormulaConfig,
  syncGroupsFromFormula,
  USM_FORMULA_PRESETS,
  getOfficialSigaFormula,
  buildFormulaExpression,
} from './formulaPresets';

export {
  createInf292CourseConfig,
  createInf292FormulaConfig,
  createInf292EvaluationGroups,
  createInf292ExampleScenario,
  inferCourseFormulaConfig,
  syncGroupsFromFormula,
  USM_FORMULA_PRESETS,
  getOfficialSigaFormula,
  buildFormulaExpression,
};

/**
 * Standard USM Syllabus Template (Section 8 of CONTEXTO.md)
 * Bloque 1: Certámenes (70%) -> C1 (33.3%), C2 (33.3%), C3 (33.4%). Min: 50. Recovery Exam enabled.
 * Bloque 2: Controles / Tareas (30%) -> T1 (50%), T2 (50%). No min.
 */
export const createDefaultEvaluationGroups = (): EvaluationGroup[] => [
  {
    id: 'certamenes',
    name: 'Certámenes',
    weight: 70,
    minGrade: 50,
    hasRecoveryExam: true,
    recoveryGrade: null,
    evaluations: [
      { id: 'c1', name: 'Certamen 1', weight: 33.3, score: null },
      { id: 'c2', name: 'Certamen 2', weight: 33.3, score: null },
      { id: 'c3', name: 'Certamen 3', weight: 33.4, score: null },
    ],
  },
  {
    id: 'tareas',
    name: 'Controles / Tareas',
    weight: 30,
    minGrade: null,
    hasRecoveryExam: false,
    recoveryGrade: null,
    evaluations: [
      { id: 't1', name: 'Tarea 1', weight: 50, score: null },
      { id: 't2', name: 'Tarea 2', weight: 50, score: null },
    ],
  },
];

/**
 * Creates the standard CourseFinalFormula for USM courses (70% PC, 30% PT).
 */
export const createDefaultFormulaConfig = (): CourseFinalFormula => ({
  expression: '0.70 * PC + 0.30 * PT',
  passingGrade: 55,
  applyPenaltyRule: true,
  source: 'department_heuristic',
  sourceLabel: 'Plantilla Estándar USM (70/30)',
  subFormulas: [
    {
      id: 'certamenes',
      name: 'Certámenes',
      code: 'PC',
      type: 'simple_average',
      prefix: 'C',
      count: 3,
      dropWorstCount: 0,
      minGradeRequired: 50,
      weightInFinal: 0.7,
      evaluations: [
        { id: 'c1', name: 'Certamen 1', weight: 1, score: null },
        { id: 'c2', name: 'Certamen 2', weight: 1, score: null },
        { id: 'c3', name: 'Certamen 3', weight: 1, score: null },
      ],
    },
    {
      id: 'tareas',
      name: 'Controles / Tareas',
      code: 'PT',
      type: 'simple_average',
      prefix: 'T',
      count: 2,
      dropWorstCount: 0,
      minGradeRequired: null,
      weightInFinal: 0.3,
      evaluations: [
        { id: 't1', name: 'Tarea 1', weight: 1, score: null },
        { id: 't2', name: 'Tarea 2', weight: 1, score: null },
      ],
    },
  ],
});

/**
 * Guarantees that an enrolled course has a valid CourseFinalFormula.
 * If config.formulaConfig exists, returns it; otherwise synthesizes one from groups or default.
 */
export function ensureFormulaConfig(config: EnrolledCourseConfig): CourseFinalFormula {
  if (
    config.formulaConfig &&
    config.formulaConfig.subFormulas &&
    config.formulaConfig.subFormulas.length > 0
  ) {
    return config.formulaConfig;
  }

  const norm = config.sigla.trim().toUpperCase();
  if (norm === 'INF-292') {
    return createInf292FormulaConfig();
  }

  if (config.groups && config.groups.length > 0) {
    const subFormulas: SubFormulaBlock[] = config.groups.map((g, idx) => {
      const isCertamen =
        g.name.toLowerCase().includes('certam') || g.id.toLowerCase().includes('certam');
      const code = isCertamen ? 'PC' : `P${idx + 1}`;
      const prefix = isCertamen ? 'C' : `T`;
      return {
        id: g.id,
        name: g.name,
        code,
        type: 'simple_average',
        prefix,
        count: g.evaluations.length,
        dropWorstCount: 0,
        minGradeRequired: g.minGrade ?? null,
        weightInFinal: g.weight > 1 ? g.weight / 100 : g.weight,
        evaluations: g.evaluations.map((e) => ({
          id: e.id,
          name: e.name,
          weight: 1,
          score: e.score,
        })),
      };
    });

    const expression = subFormulas
      .map((b) => `${b.weightInFinal.toFixed(2)} * ${b.code}`)
      .join(' + ');

    return {
      expression,
      passingGrade: 55,
      applyPenaltyRule: subFormulas.some((b) => b.minGradeRequired !== null),
      subFormulas,
    };
  }

  return createDefaultFormulaConfig();
}

/**
 * Create default enrolled course configuration.
 * Automatically recognizes specialized course formulas like INF-292.
 */
export const createDefaultCourseConfig = (sigla: string): EnrolledCourseConfig => {
  const norm = sigla.trim().toUpperCase();
  if (norm === 'INF-292') {
    return createInf292CourseConfig();
  }

  return {
    sigla: norm,
    groups: createDefaultEvaluationGroups(),
    formulaConfig: createDefaultFormulaConfig(),
  };
};

/**
 * Crea la configuración de un ramo inscrito utilizando primero el catálogo oficial extraído
 * de los PDFs de SIGA (`formulas_asignaturas.json`) o las heurísticas departamentales y de horas
 * de laboratorio de `planes_carreras.json`.
 */
export const createSmartCourseConfig = (
  sigla: string,
  courseInfo?: Course | null
): EnrolledCourseConfig => {
  const norm = sigla.trim().toUpperCase();
  if (norm === 'INF-292') {
    const cfg = createInf292CourseConfig();
    if (cfg.formulaConfig) {
      cfg.formulaConfig.source = 'siga_pdf';
      cfg.formulaConfig.sourceLabel = 'Syllabus Oficial INF-292 (Optimización)';
      cfg.formulaConfig.syllabusPdfUrl = courseInfo?.programa_pdf;
    }
    return cfg;
  }

  const inferredFormula = inferCourseFormulaConfig(norm, courseInfo);
  return {
    sigla: norm,
    groups: syncGroupsFromFormula(inferredFormula),
    formulaConfig: inferredFormula,
  };
};

/**
 * Default Graduation Milestones for USM Engineering (Civil Informática)
 */
export const DEFAULT_GRADUATION_MILESTONES: GraduationMilestone[] = [
  {
    id: 'milestone-bachiller',
    title: 'Bachiller en Ciencias de la Ingeniería',
    description:
      'Aprobación de la totalidad de asignaturas del Semestre 1 al 4 (Ciencias Básicas e Introducción a la Especialidad).',
    semesterTarget: 4,
    completed: false,
  },
  {
    id: 'milestone-licenciatura',
    title: 'Licenciatura en Ciencias de la Ingeniería',
    description: 'Aprobación de la totalidad de asignaturas del Semestre 1 al 8.',
    semesterTarget: 8,
    completed: false,
  },
  {
    id: 'milestone-toeic',
    title: 'Acreditación Dominio de Inglés (TOEIC)',
    description:
      'Acreditar nivel B2 o superior con puntaje mínimo de 550 puntos en test TOEIC oficial.',
    completed: false,
  },
  {
    id: 'milestone-hcw',
    title: 'Créditos Humanistas / HCW Convalidables',
    description:
      'Cumplimiento de los créditos humanistas y de formación integral complementaria requeridos.',
    completed: false,
  },
  {
    id: 'milestone-practica-1',
    title: 'Práctica Industrial (Práctica 1)',
    description:
      'Práctica en empresa u organización de al menos 160 a 200 horas laborales aprobada.',
    completed: false,
  },
  {
    id: 'milestone-practica-2',
    title: 'Práctica Profesional (Práctica 2)',
    description:
      'Práctica profesional en área de ciencias de la computación e informática aprobada.',
    completed: false,
  },
];
