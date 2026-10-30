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
}

export interface CurriculumPlan {
  carrera: string;
  codigo_plan: string;
  plan: string;
  universidad: string;
  escala_notas: GradeScale;
  areas: Record<string, AreaInfo>;
  ramos: Course[];
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
  evaluations: SubFormulaEvaluation[];
}

export interface CourseFinalFormula {
  expression: string;
  passingGrade: number; // default 55
  applyPenaltyRule: boolean; // IF all blocks with minGrade >= minGrade THEN NF = formula ELSE NF = min(block averages)
  subFormulas: SubFormulaBlock[];
}

export interface EnrolledCourseConfig {
  sigla: string;
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

