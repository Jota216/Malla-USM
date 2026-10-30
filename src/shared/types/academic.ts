/**
 * USM Malla & Grade Solver - Academic Domain Types
 * Formal mathematical modeling & constraint definitions
 */

export type CourseStatus = 'APPROVED' | 'IN_PROGRESS' | 'AVAILABLE' | 'LOCKED';

export interface AreaInfo {
  nombre: string;
  color: string;
}

export interface GradeScale {
  minima: number;
  maxima: number;
  aprobacion: number;
}

export interface Course {
  id: number;
  sigla: string;
  nombre: string;
  semestre: number;
  creditos_usm: number;
  creditos_sct: number;
  area: string;
  prerrequisitos: string[];
  departamento?: string;
  programa_pdf?: string;
  requisito_licenciatura?: boolean;
  horas?: {
    teoricas: number;
    practicas: number;
    laboratorios: number;
    ayudantias: number;
  };
  requisitos_dnf?: Array<Array<{ sigla: string; tipo?: string }>>;
  equivalencias_dnf?: Array<Array<{ sigla: string }>>;
}

export interface CurriculumPlan {
  carrera: string;
  codigo_plan: string;
  plan: string;
  sede?: string;
  jornada?: string;
  mencion?: string;
  universidad: string;
  semestres_totales?: number;
  creditos_totales_sct?: number;
  creditos_totales_usm?: number;
  escala_notas: GradeScale;
  areas: Record<string, AreaInfo>;
  ramos: Course[];
}

export interface ScheduleBlock {
  dia: number; // 0 = Lunes .. 6 = Domingo
  bloque: number; // 1 .. 16
  tipo: string; // Cát, Lab, Ayu, Prá, Tal
  sala: string;
  campus: string;
  profesor: string;
}

export interface CourseParallel {
  sigla: string;
  nombre: string;
  departamento: string;
  paralelo: string;
  profesor: string[];
  cupo: number;
  horario: ScheduleBlock[];
}

export interface ProfessorMetricDetail {
  avg: number;
  safe_score: number;
  stdev: number;
  is_bimodal: boolean;
  distribution: Record<string, number>;
}

export interface ProfessorReviewSummary {
  id: string;
  name: string;
  meta: {
    reviewCount: number;
    effectiveCount: number;
    lastUpdated: string;
    isArchived: boolean;
  };
  stats: {
    accesibilidad: ProfessorMetricDetail | null;
    claridad_expositiva: ProfessorMetricDetail | null;
    coherencia_evaluativa: ProfessorMetricDetail | null;
    dificultad_percibida: ProfessorMetricDetail | null;
    estabilidad_emocional: ProfessorMetricDetail | null;
    gestion_tiempo: ProfessorMetricDetail | null;
    rigor_calificatorio: ProfessorMetricDetail | null;
  };
  tags: Array<[string, number]>;
  comments: Array<{
    date: string;
    tags: string[];
    text: string;
  }>;
}

export interface CareerPlanCatalogItem {
  id: string; // unique composite id: e.g. "Casa Central Valparaíso|Diurna|73-1|0|10730000013"
  sede: string;
  jornada: string;
  careerCode: string;
  careerName: string;
  mentionId: string;
  mentionName: string;
  planInternalId: string;
  planCode: string;
  semestersCount: number;
  coursesCount: number;
}

export interface CourseStatusDetail {
  course: Course;
  status: CourseStatus;
  missingPrerequisites: string[];
  grade?: number;
  semester?: string;
}

export interface Evaluation {
  id: string;
  name: string;
  weight: number; // percentage (0-100) or decimal (0-1)
  score: number | null; // null represents an unknown grade (x_i)
  isRecovery?: boolean;
}

export interface EvaluationGroup {
  id: string;
  name: string;
  weight: number; // percentage (0-100) or decimal (0-1)
  minGrade?: number | null; // e.g. 50 minimum requirement for sudden-death constraint
  hasRecoveryExam?: boolean; // whether recuperative exam is enabled
  recoveryGrade?: number | null; // score achieved in recuperative exam if taken
  evaluations: Evaluation[];
}

export type SubFormulaType = 'simple_average' | 'drop_worst' | 'weighted';

export type FormulaSourceType =
  | 'siga_pdf'
  | 'sct_inferred'
  | 'department_heuristic'
  | 'preset'
  | 'custom';

export interface PiecewiseAlphaRule {
  baseBlockCode: string; // e.g. 'PC'
  targetBlockCode: string; // e.g. 'PT' or 'PL'
  minThreshold: number; // e.g. 30 (PC <= 30 -> alpha = 0)
  maxThreshold: number; // e.g. 60 (PC >= 60 -> alpha = maxAlpha)
  maxAlpha: number; // e.g. 0.30
}

export interface SubFormulaEvaluation {
  id: string;
  name: string;
  weight: number;
  score: number | null;
}

export interface SubFormulaBlock {
  id: string;
  name: string;
  code: string;
  type: SubFormulaType;
  prefix: string;
  count: number;
  dropWorstCount: number;
  minGradeRequired: number | null;
  weightInFinal: number; // e.g. 0.10, 0.45 or 10, 45
  bonusPoints?: number; // Puntos extra sumados directamente al promedio de este bloque (escala 0-100)
  evalBonusPoints?: number; // Puntos extra de actividades externas para un certamen/evaluación del bloque (suma +pts/N al promedio)
  evaluations: SubFormulaEvaluation[];
}

export interface CourseFinalFormula {
  expression: string;
  passingGrade: number; // default 55
  applyPenaltyRule: boolean; // IF all blocks with minGrade >= minGrade THEN NF = formula ELSE NF = min(block averages)
  subFormulas: SubFormulaBlock[];
  piecewiseAlpha?: PiecewiseAlphaRule;
  finalGradeMultiplier?: number; // Multiplicador sobre la nota final (ej. 1.05 para +5%, default 1.0)
  finalGradeBonusPoints?: number; // Puntos extra sumados directamente a la Nota Final por actividades externas
  source?: FormulaSourceType;
  sourceLabel?: string;
  syllabusRequirementsNote?: string;
  syllabusPdfUrl?: string;
}

export interface EnrolledCourseConfig {
  sigla: string;
  selectedParallel?: string;
  customName?: string;
  customCreditsSct?: number;
  groups: EvaluationGroup[];
  formulaConfig?: CourseFinalFormula;
}

export type SubFormulaSolverStatus =
  | 'APPROVED'
  | 'ON_TRACK'
  | 'IN_DANGER'
  | 'REQUIRES_PERFECT'
  | 'FAILED';

export interface SubFormulaBlockSolveResult {
  blockId: string;
  blockCode: string;
  blockName: string;
  type: SubFormulaType;
  weightInFinal: number; // normalized (0 to 1)
  minGradeRequired: number | null;
  currentAverage: number | null;
  rawAverage?: number | null;
  effectiveBonusPoints?: number;
  projectedAverageWithZero: number;
  requiredForBlockMin: number | null;
  meetsMinGrade: boolean;
  isMinGradeCritical: boolean;
  knownCount: number;
  unknownCount: number;
  droppedScores?: number[];
}

export interface SubFormulaCourseSolveResult {
  sigla?: string;
  status: SubFormulaSolverStatus;
  currentFinalGrade: number;
  formulaFinalGrade: number;
  minPossibleGrade?: number;
  dynamicAlpha?: number | null;
  finalGradeMultiplier?: number;
  finalGradeBonusPoints?: number;
  penaltyRuleApplies: boolean;
  isPenaltyTriggered: boolean;
  penaltyGrade: number | null;
  requiredUniformGrade: number | null;
  requiredGlobalGrade: number | null;
  bindingCondition: 'GLOBAL' | 'BLOCK_MIN' | 'NONE';
  bindingBlockCode?: string;
  bindingBlockName?: string;
  blocks: SubFormulaBlockSolveResult[];
  diagnosticMessage: string;
}

export type SolverStatus = 
  | 'APPROVED' 
  | 'ON_TRACK' 
  | 'REQUIRES_RECOVERY' 
  | 'IN_DANGER' 
  | 'FAILED';

export interface GroupSolveResult {
  groupId: string;
  groupName: string;
  groupWeight: number; // normalized (0 to 1)
  currentAverage: number | null;
  minGradeRequired: number | null;
  requiredGradeForMin: number | null;
  meetsMinGrade: boolean;
  isMinGradeCritical: boolean;
  hasRecoveryExam: boolean;
  recoveryApplied: boolean;
  replacedEvaluationId?: string;
  originalReplacedGrade?: number;
}

export interface UnknownEvaluationDetail {
  groupId: string;
  groupName: string;
  evalId: string;
  evalName: string;
  weightInGroup: number; // normalized (0 to 1)
  globalWeight: number; // alpha_e (0 to 1)
  requiredUniformGrade: number | null;
}

export interface RecoveryScenario {
  needed: boolean;
  possible: boolean;
  minScoreNeeded: number | null;
  replacesEvaluationId?: string;
  originalGrade?: number;
  description: string;
}

export interface CourseSolveResult {
  sigla: string;
  status: SolverStatus;
  finalGrade: number; // current calculated final grade with knowns
  accumulatedPoints: number; // P_acum
  remainingWeight: number; // alpha_rest (0 to 1)
  requiredGlobalGrade: number | null; // X_global
  effectiveRequiredGrade: number | null; // max(X_global, requiredGroupGrades)
  bindingConstraint: 'GLOBAL' | 'GROUP_MIN' | 'NONE';
  bindingGroupId?: string;
  bindingGroupName?: string;
  groups: GroupSolveResult[];
  unknownEvaluations: UnknownEvaluationDetail[];
  recoveryScenario?: RecoveryScenario;
  message: string;
}

export interface SliderRebalanceResult {
  simulatedFinalGrade: number;
  simulatedAccumulatedPoints: number;
  remainingWeight: number;
  otherUnknownsRequiredGrade: number | null;
  values: Record<string, number>; // evalId -> simulatedScore
  isFeasible: boolean;
  meetsAllConstraints: boolean;
  groupAverages: Record<string, number>;
  bindingConstraintDescription?: string;
}

export interface ApprovedCourseRecord {
  sigla: string;
  grade?: number;
  semester?: string;
  approvedAt?: string;
}

export interface GraduationMilestone {
  id: string;
  title: string;
  description: string;
  semesterTarget?: number;
  completed: boolean;
  completedAt?: string;
}

export interface AcademicStatistics {
  sctCreditsApproved: number;
  sctCreditsTotal: number;
  usmCreditsApproved: number;
  usmCreditsTotal: number;
  percentProgress: number;
  gpa: number; // Weighted grade average
  approvedCoursesCount: number;
  inProgressCoursesCount: number;
  totalCoursesCount: number;
}
