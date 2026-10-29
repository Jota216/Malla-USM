import { EvaluationGroup, EnrolledCourseConfig, GraduationMilestone } from '@/types/academic';

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
 * Create default enrolled course configuration
 */
export const createDefaultCourseConfig = (sigla: string): EnrolledCourseConfig => ({
  sigla,
  groups: createDefaultEvaluationGroups(),
});

/**
 * Default Graduation Milestones for USM Engineering (Civil Informática)
 */
export const DEFAULT_GRADUATION_MILESTONES: GraduationMilestone[] = [
  {
    id: 'milestone-bachiller',
    title: 'Bachiller en Ciencias de la Ingeniería',
    description: 'Aprobación de la totalidad de asignaturas del Semestre 1 al 4 (Ciencias Básicas e Introducción a la Especialidad).',
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
    description: 'Acreditar nivel B2 o superior con puntaje mínimo de 550 puntos en test TOEIC oficial.',
    completed: false,
  },
  {
    id: 'milestone-hcw',
    title: 'Créditos Humanistas / HCW Convalidables',
    description: 'Cumplimiento de los créditos humanistas y de formación integral complementaria requeridos.',
    completed: false,
  },
  {
    id: 'milestone-practica-1',
    title: 'Práctica Industrial (Práctica 1)',
    description: 'Práctica en empresa u organización de al menos 160 a 200 horas laborales aprobada.',
    completed: false,
  },
  {
    id: 'milestone-practica-2',
    title: 'Práctica Profesional (Práctica 2)',
    description: 'Práctica profesional en área de ciencias de la computación e informática aprobada.',
    completed: false,
  },
];
