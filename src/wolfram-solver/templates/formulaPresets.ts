import {
  Course,
  CourseFinalFormula,
  EvaluationGroup,
  PiecewiseAlphaRule,
  SubFormulaBlock,
} from '@/shared/types/academic';
import { createInf292FormulaConfig } from './inf292Template';
import { formatUsmSigla } from '@/curricula/services/sigaService';

export interface FormulaPresetOption {
  id: string;
  label: string;
  departmentTag: string;
  description: string;
  buildFormula: (sigla?: string, pdfUrl?: string) => CourseFinalFormula;
}

const makeEvals = (prefix: string, labelPrefix: string, count: number, weight = 1) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix.toLowerCase()}${i + 1}`,
    name: `${labelPrefix} ${i + 1}`,
    weight,
    score: null,
  }));

/**
 * Catálogo curado extraído de los Programas Oficiales de Asignatura en PDF de SIGA USM
 * (`https://siga.usm.cl/prog_oai/programa_download?pdf=...`).
 */
const OFFICIAL_FORMULAS_MAP: Record<string, CourseFinalFormula> = {
  'IWI-131': {
    expression: '0.50 * PC + 0.20 * PQ + 0.20 * PT + 0.10 * PF',
    passingGrade: 55,
    applyPenaltyRule: true,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118019706)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118019706.pdf',
    syllabusRequirementsNote:
      'PS = PC*0,50 + PCTLS*0,20 + PT*0,20 + PEF*0,05 + PCA*0,05. Para aprobar la asignatura se debe tener PC >= 55; de lo contrario PS será igual a PC. El certamen recuperativo opcional reemplaza la menor nota de los certámenes.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (PC >= 55)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: 55,
        weightInFinal: 0.5,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'controles',
        name: 'Controles (PCTLS)',
        code: 'PQ',
        type: 'simple_average',
        prefix: 'Q',
        count: 8,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.2,
        evaluations: makeEvals('Q', 'Control', 8),
      },
      {
        id: 'tareas',
        name: 'Tareas (PT)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 8,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.2,
        evaluations: makeEvals('T', 'Tarea', 8),
      },
      {
        id: 'formativas',
        name: 'Eval. Formativas y Corrección Automática (PEF + PCA)',
        code: 'PF',
        type: 'simple_average',
        prefix: 'F',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.1,
        evaluations: [
          { id: 'f1', name: 'Evaluaciones Formativas (PEF 5%)', weight: 1, score: null },
          { id: 'f2', name: 'Corrección Automática (PCA 5%)', weight: 1, score: null },
        ],
      },
    ],
  },
  'MAT-021': {
    expression: '0.75 * PC + 0.25 * PQ',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 122005505)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F122005505.pdf',
    syllabusRequirementsNote:
      'Certámenes (3), Controles (6). NP = 0,20*C1 + 0,25*C2 + 0,30*C3 + 0,25*PC donde PC es el promedio de los 5 controles con mejores calificaciones (se elimina la peor nota). Si 45 <= NP < 55, rinde Certamen Global (NF = 0,7*NP + 0,3*E).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (20% / 25% / 30%)',
        code: 'PC',
        type: 'weighted',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.75,
        evaluations: [
          { id: 'c1', name: 'Certamen 1 (20%)', weight: 20, score: null },
          { id: 'c2', name: 'Certamen 2 (25%)', weight: 25, score: null },
          { id: 'c3', name: 'Certamen 3 (30%)', weight: 30, score: null },
        ],
      },
      {
        id: 'controles',
        name: 'Controles (5 mejores de 6)',
        code: 'PQ',
        type: 'drop_worst',
        prefix: 'Q',
        count: 6,
        dropWorstCount: 1,
        minGradeRequired: null,
        weightInFinal: 0.25,
        evaluations: makeEvals('Q', 'Control', 6),
      },
    ],
  },
  'MAT-022': {
    expression: '0.75 * PC + 0.25 * PQ',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 122005605)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F122005605.pdf',
    syllabusRequirementsNote:
      'Certámenes (3), Controles (6). NP = 0,20*C1 + 0,25*C2 + 0,30*C3 + 0,25*PC donde PC promedia los mejores controles eliminando la peor calificación. Si 45 <= NP < 55, habilita Certamen Global.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (20% / 25% / 30%)',
        code: 'PC',
        type: 'weighted',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.75,
        evaluations: [
          { id: 'c1', name: 'Certamen 1 (20%)', weight: 20, score: null },
          { id: 'c2', name: 'Certamen 2 (25%)', weight: 25, score: null },
          { id: 'c3', name: 'Certamen 3 (30%)', weight: 30, score: null },
        ],
      },
      {
        id: 'controles',
        name: 'Controles (5 mejores de 6)',
        code: 'PQ',
        type: 'drop_worst',
        prefix: 'Q',
        count: 6,
        dropWorstCount: 1,
        minGradeRequired: null,
        weightInFinal: 0.25,
        evaluations: makeEvals('Q', 'Control', 6),
      },
    ],
  },
  'MAT-023': {
    expression: '0.75 * PC + 0.25 * PQ',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 122005705)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F122005705.pdf',
    syllabusRequirementsNote:
      'Certámenes (3) ponderados 75% + Controles (25%, elimina la peor nota). Derecho a Certamen Global si 45 <= NP < 55.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (20% / 25% / 30%)',
        code: 'PC',
        type: 'weighted',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.75,
        evaluations: [
          { id: 'c1', name: 'Certamen 1 (20%)', weight: 20, score: null },
          { id: 'c2', name: 'Certamen 2 (25%)', weight: 25, score: null },
          { id: 'c3', name: 'Certamen 3 (30%)', weight: 30, score: null },
        ],
      },
      {
        id: 'controles',
        name: 'Controles (elimina 1 peor)',
        code: 'PQ',
        type: 'drop_worst',
        prefix: 'Q',
        count: 5,
        dropWorstCount: 1,
        minGradeRequired: null,
        weightInFinal: 0.25,
        evaluations: makeEvals('Q', 'Control', 5),
      },
    ],
  },
  'MAT-024': {
    expression: '0.75 * PC + 0.25 * PQ',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 122005805)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F122005805.pdf',
    syllabusRequirementsNote:
      'Certámenes (3) ponderados 75% + Controles (25%, elimina la peor nota). Derecho a Certamen Global si 45 <= NP < 55.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (20% / 25% / 30%)',
        code: 'PC',
        type: 'weighted',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.75,
        evaluations: [
          { id: 'c1', name: 'Certamen 1 (20%)', weight: 20, score: null },
          { id: 'c2', name: 'Certamen 2 (25%)', weight: 25, score: null },
          { id: 'c3', name: 'Certamen 3 (30%)', weight: 30, score: null },
        ],
      },
      {
        id: 'controles',
        name: 'Controles (elimina 1 peor)',
        code: 'PQ',
        type: 'drop_worst',
        prefix: 'Q',
        count: 5,
        dropWorstCount: 1,
        minGradeRequired: null,
        weightInFinal: 0.25,
        evaluations: makeEvals('Q', 'Control', 5),
      },
    ],
  },
  'FIS-100': {
    expression: '0.65 * PC + 0.20 * PQ + 0.10 * PT + 0.05 * PCL',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 121002006)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F121002006.pdf',
    syllabusRequirementsNote:
      'PS = Alfa * (Ce1*0,20 + Ce2*0,20 + Ce3*0,25 + Ta*0,10 + Co*0,20 + PCL*0,05), donde Alfa = 1,0 si asistencia >= 80%. Si 50 <= PS <= 54, rinde Certamen Global (NF = 0,6*PS + 0,4*CeG).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (20% / 20% / 25%)',
        code: 'PC',
        type: 'weighted',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.65,
        evaluations: [
          { id: 'c1', name: 'Certamen 1 (20%)', weight: 20, score: null },
          { id: 'c2', name: 'Certamen 2 (20%)', weight: 20, score: null },
          { id: 'c3', name: 'Certamen 3 (25%)', weight: 25, score: null },
        ],
      },
      {
        id: 'controles',
        name: 'Controles (Co)',
        code: 'PQ',
        type: 'simple_average',
        prefix: 'Q',
        count: 5,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.2,
        evaluations: makeEvals('Q', 'Control', 5),
      },
      {
        id: 'tareas',
        name: 'Tareas (Ta)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 5,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.1,
        evaluations: makeEvals('T', 'Tarea', 5),
      },
      {
        id: 'preclases',
        name: 'Actividades Pre-clases (PCL)',
        code: 'PCL',
        type: 'simple_average',
        prefix: 'P',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.05,
        evaluations: [{ id: 'p1', name: 'Promedio Pre-clases', weight: 1, score: null }],
      },
    ],
  },
  'FIS-110': {
    expression: '0.75 * PC + 0.17 * PQ + 0.08 * PT',
    passingGrade: 55,
    applyPenaltyRule: true,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 121002506)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F121002506.pdf',
    syllabusRequirementsNote:
      'Evaluación Cátedra: 3 Certámenes (75%, requisito C_i >= 50) + Controles (mejores n-1) y Tareas Aula (mejores n-2) = 25% (PTQ = 2/3 PQ + 1/3 PT). Laboratorio: Factor η >= 1,0. Certamen Global si PS >= 50.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (C >= 50)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: 50,
        weightInFinal: 0.75,
        evaluations: makeEvals('C', 'Certamen', 3),
      },
      {
        id: 'controles',
        name: 'Controles (Q - mejores n-1)',
        code: 'PQ',
        type: 'drop_worst',
        prefix: 'Q',
        count: 6,
        dropWorstCount: 1,
        minGradeRequired: null,
        weightInFinal: 0.17,
        evaluations: makeEvals('Q', 'Control', 6),
      },
      {
        id: 'tareas',
        name: 'Tareas Aula (T - mejores n-2)',
        code: 'PT',
        type: 'drop_worst',
        prefix: 'T',
        count: 6,
        dropWorstCount: 2,
        minGradeRequired: null,
        weightInFinal: 0.08,
        evaluations: makeEvals('T', 'Tarea', 6),
      },
    ],
  },
  'QUI-010': {
    expression: '0.70 * PC + 0.20 * PQ + 0.10 * PA',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 123002304)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F123002304.pdf',
    syllabusRequirementsNote:
      'NS = Ce1*0,20 + Ce2*0,25 + Ce3*0,25 + NCo*0,20 + NETC*0,10. Si 50 <= NS <= 54, puede rendir Certamen Global (NF = 0,60*NS + 0,40*CeG). Exige asistencia >= 80% a sesiones de laboratorio.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (20% / 25% / 25%)',
        code: 'PC',
        type: 'weighted',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.7,
        evaluations: [
          { id: 'c1', name: 'Certamen 1 (20%)', weight: 20, score: null },
          { id: 'c2', name: 'Certamen 2 (25%)', weight: 25, score: null },
          { id: 'c3', name: 'Certamen 3 (25%)', weight: 25, score: null },
        ],
      },
      {
        id: 'controles',
        name: 'Controles de Ayudantía (NCo)',
        code: 'PQ',
        type: 'simple_average',
        prefix: 'Q',
        count: 6,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.2,
        evaluations: makeEvals('Q', 'Control', 6),
      },
      {
        id: 'aula',
        name: 'Actividades Grupales de Aula (NETC)',
        code: 'PA',
        type: 'drop_worst',
        prefix: 'A',
        count: 6,
        dropWorstCount: 1,
        minGradeRequired: null,
        weightInFinal: 0.1,
        evaluations: makeEvals('A', 'Trabajo Aula', 6),
      },
    ],
  },
  'HRW-132': {
    expression: '0.60 * PC + 0.40 * PT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 131022405)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F131022405.pdf',
    syllabusRequirementsNote:
      'Nota final = C1*30% + C2*30% + T*40% (2 Certámenes de 30% cada uno y 1 Trabajo semestral de 40%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (30% c/u)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.6,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'trabajo',
        name: 'Trabajo Semestral (T)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.4,
        evaluations: [{ id: 't1', name: 'Trabajo Final', weight: 1, score: null }],
      },
    ],
  },
  'HRW-133': {
    expression: '0.60 * PC + 0.40 * PT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 131022505)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F131022505.pdf',
    syllabusRequirementsNote:
      'PS = C1*0,30 + C2*0,30 + TF*0,40 (2 Certámenes de 30% cada uno y 1 Trabajo Final con exposición/video de 40%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (30% c/u)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.6,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'trabajo',
        name: 'Trabajo Final (TF)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.4,
        evaluations: [{ id: 't1', name: 'Trabajo Final (Exposición/Video)', weight: 1, score: null }],
      },
    ],
  },
  'INF-134': {
    expression: '0.70 * PC + 0.30 * PT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118053305)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118053305.pdf',
    syllabusRequirementsNote:
      'Las evaluaciones que se realizan en esta asignatura son a través de tareas de programación y certámenes: C = Promedio Certámenes (03), T = Promedio de tareas de programación. Fórmula: NF = C * 0,7 + T * 0,3.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (C)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.7,
        evaluations: makeEvals('C', 'Certamen', 3),
      },
      {
        id: 'tareas',
        name: 'Tareas de Programación (T)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 4,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.3,
        evaluations: makeEvals('T', 'Tarea', 4),
      },
    ],
  },
  'INF-152': {
    expression: '0.65 * PC + 0.30 * PQ + 0.05 * PT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118053405)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118053405.pdf',
    syllabusRequirementsNote:
      'Nota final = 0,30*C1 + 0,35*C2 + 0,30*NC + 0,05*T. Certamen 1 (30%), Certamen 2 (35%), Controles (8 controles, 30%) y Trabajo en clases (7 trabajos, 5%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (30% C1 / 35% C2)',
        code: 'PC',
        type: 'weighted',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.65,
        evaluations: [
          { id: 'c1', name: 'Certamen 1 (30%)', weight: 30, score: null },
          { id: 'c2', name: 'Certamen 2 (35%)', weight: 35, score: null },
        ],
      },
      {
        id: 'controles',
        name: 'Controles (NC)',
        code: 'PQ',
        type: 'simple_average',
        prefix: 'Q',
        count: 8,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.3,
        evaluations: makeEvals('Q', 'Control', 8),
      },
      {
        id: 'trabajos',
        name: 'Trabajo en Clases (T)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 7,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.05,
        evaluations: makeEvals('T', 'Trabajo', 7),
      },
    ],
  },
  'INF-260': {
    expression: '0.60 * AG + 0.40 * PP',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118053506)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118053506.pdf',
    syllabusRequirementsNote:
      'PS = AG1*0,20 + AG2*0,20 + AG3*0,20 + P1*0,20 + P2*0,20 (3 Actividades Grupales de 20% c/u y 2 Proyectos de 20% c/u). Si 50 <= PS <= 54, rinde Certamen Global (NF = 0,6*PS + 0,4*CG).',
    subFormulas: [
      {
        id: 'actividades',
        name: 'Actividades Grupales (AG1, AG2, AG3)',
        code: 'AG',
        type: 'simple_average',
        prefix: 'AG',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.6,
        evaluations: makeEvals('AG', 'Actividad Grupal', 3),
      },
      {
        id: 'proyectos',
        name: 'Proyectos (P1 y P2)',
        code: 'PP',
        type: 'simple_average',
        prefix: 'P',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.4,
        evaluations: makeEvals('P', 'Proyecto', 2),
      },
    ],
  },
  'INF-253': {
    expression: '0.46 * PC + 0.20 * PQ + 0.34 * PT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118053905)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118053905.pdf',
    syllabusRequirementsNote:
      'Evaluación individual (66%): 2 Certámenes (23% c/u = 46%) + 5 Controles (4% c/u = 20%). Evaluación grupal (34%): 5 Tareas grupales (EG). NF = Cert*0,46 + controles*0,20 + EG*0,34.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (23% c/u)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.46,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'controles',
        name: 'Controles (4% c/u)',
        code: 'PQ',
        type: 'simple_average',
        prefix: 'Q',
        count: 5,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.2,
        evaluations: makeEvals('Q', 'Control', 5),
      },
      {
        id: 'tareas',
        name: 'Tareas Grupales (EG)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 5,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.34,
        evaluations: makeEvals('T', 'Tarea Grupal', 5),
      },
    ],
  },
  'INF-155': {
    expression: '0.65 * PC + 0.35 * PT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118053805)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118053805.pdf',
    syllabusRequirementsNote:
      'NF = C1 * 0,30 + C2 * 0,35 + T * 0,35. Certamen 1 (30%), Certamen 2 (35%) y Tareas de resolución de problemas (5 a 7 tareas, 35%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (30% C1 / 35% C2)',
        code: 'PC',
        type: 'weighted',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.65,
        evaluations: [
          { id: 'c1', name: 'Certamen 1 (30%)', weight: 30, score: null },
          { id: 'c2', name: 'Certamen 2 (35%)', weight: 35, score: null },
        ],
      },
      {
        id: 'tareas',
        name: 'Tareas (T)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 6,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.35,
        evaluations: makeEvals('T', 'Tarea', 6),
      },
    ],
  },
  'INF-239': {
    expression: '0.60 * PC + 0.25 * PT + 0.10 * CA + 0.05 * PL',
    passingGrade: 55,
    applyPenaltyRule: true,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118057105)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118057105.pdf',
    syllabusRequirementsNote:
      'PS = PC*0,60 + PT*0,25 + C*0,10 + PL*0,05. Requisitos de aprobación: PC >= 50, PT >= 55, Caso (C) >= 55 y Promedio Lecturas (PL) >= 55. Si PC está entre 40 y 49, rinde Certamen Recuperativo que reemplaza la nota de certamen más baja.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (PC >= 50)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: 50,
        weightInFinal: 0.6,
        evaluations: makeEvals('C', 'Certamen', 3),
      },
      {
        id: 'tareas',
        name: 'Tareas de Laboratorio (PT >= 55)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: 55,
        weightInFinal: 0.25,
        evaluations: makeEvals('T', 'Tarea Lab', 2),
      },
      {
        id: 'caso',
        name: 'Caso Práctico (C >= 55)',
        code: 'CA',
        type: 'simple_average',
        prefix: 'CA',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: 55,
        weightInFinal: 0.1,
        evaluations: [{ id: 'ca1', name: 'Caso de Diseño BD', weight: 1, score: null }],
      },
      {
        id: 'lecturas',
        name: 'Controles de Lecturas (PL >= 55)',
        code: 'PL',
        type: 'simple_average',
        prefix: 'L',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: 55,
        weightInFinal: 0.05,
        evaluations: makeEvals('L', 'Control Lectura', 2),
      },
    ],
  },
  'INF-245': {
    expression: 'PC * (1 - α) + α * PT',
    passingGrade: 55,
    applyPenaltyRule: true,
    piecewiseAlpha: {
      baseBlockCode: 'PC',
      targetBlockCode: 'PT',
      minThreshold: 30,
      maxThreshold: 60,
      maxAlpha: 0.3,
    },
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118057205 - Peso Dinámico α)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118057205.pdf',
    syllabusRequirementsNote:
      'Tres certámenes C1, C2 y C3 (promedio PC), y una nota de tareas T (4 tareas en cuadro SCT, requisito T >= 60). NF = PC × (1 - α) + α × T, donde α = 0,30 si PC >= 60; α = 0 si PC <= 30; y α = (PC/100) - 0,30 si 30 < PC < 60.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (C1, C2, C3)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.7,
        evaluations: makeEvals('C', 'Certamen', 3),
      },
      {
        id: 'tareas',
        name: 'Tareas (T >= 60)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 4,
        dropWorstCount: 0,
        minGradeRequired: 60,
        weightInFinal: 0.3,
        evaluations: makeEvals('T', 'Tarea', 4),
      },
    ],
  },
  'INF-280': {
    expression: '0.65 * PC + 0.10 * PQ + 0.25 * PL',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118057305)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118057305.pdf',
    syllabusRequirementsNote:
      'NF = CE*65% + CO*10% + LA*25%. 3 Certámenes (CE: 65%), al menos 3 Controles (CO: 10%) y 5 Experiencias de Laboratorio en R (LA: 25%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (CE)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.65,
        evaluations: makeEvals('C', 'Certamen', 3),
      },
      {
        id: 'controles',
        name: 'Controles (CO)',
        code: 'PQ',
        type: 'simple_average',
        prefix: 'Q',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.1,
        evaluations: makeEvals('Q', 'Control', 3),
      },
      {
        id: 'laboratorios',
        name: 'Experiencias de Laboratorio (LA)',
        code: 'PL',
        type: 'simple_average',
        prefix: 'L',
        count: 5,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.25,
        evaluations: makeEvals('L', 'Laboratorio', 5),
      },
    ],
  },
  'INF-270': {
    expression: '0.50 * PC + 0.10 * CA + 0.40 * EG',
    passingGrade: 55,
    applyPenaltyRule: true,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118057405)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118057405.pdf',
    syllabusRequirementsNote:
      'Evaluación individual (60%): 2 Certámenes (25% c/u = 50%) y 4 Análisis de Casos (10% promedio de los mejores 3). Evaluación grupal (40%, mínimo >= 50): Entrega 1 (5%), Entrega 2 (10%), Revisión de pares (5%) y Entrega final (20%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (25% c/u)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.5,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'casos',
        name: 'Análisis de Casos (3 mejores de 4)',
        code: 'CA',
        type: 'drop_worst',
        prefix: 'CA',
        count: 4,
        dropWorstCount: 1,
        minGradeRequired: null,
        weightInFinal: 0.1,
        evaluations: makeEvals('CA', 'Caso', 4),
      },
      {
        id: 'grupal',
        name: 'Evaluación Grupal (EG >= 50)',
        code: 'EG',
        type: 'weighted',
        prefix: 'E',
        count: 4,
        dropWorstCount: 0,
        minGradeRequired: 50,
        weightInFinal: 0.4,
        evaluations: [
          { id: 'e1', name: 'Entrega 1 (5%)', weight: 5, score: null },
          { id: 'e2', name: 'Entrega 2 (10%)', weight: 10, score: null },
          { id: 'e3', name: 'Revisión de Pares (5%)', weight: 5, score: null },
          { id: 'e4', name: 'Entrega Final (20%)', weight: 20, score: null },
        ],
      },
    ],
  },
  'INF-236': {
    expression: '0.60 * PC + 0.30 * PT + 0.10 * NP',
    passingGrade: 55,
    applyPenaltyRule: true,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118057905)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118057905.pdf',
    syllabusRequirementsNote:
      'Si (C1+C2)/2 >= 50 & T >= 50 & NP >= 50 entonces PS = C1*30% + C2*30% + T*30% + NP*10%; sino PS = min((C1+C2)/2, T, NP).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (C1 y C2 >= 50)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: 50,
        weightInFinal: 0.6,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'tareas',
        name: 'Tareas de Proyecto (T >= 50)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 4,
        dropWorstCount: 0,
        minGradeRequired: 50,
        weightInFinal: 0.3,
        evaluations: makeEvals('T', 'Entrega Proyecto', 4),
      },
      {
        id: 'participacion',
        name: 'Participación y Presentaciones (NP >= 50)',
        code: 'NP',
        type: 'simple_average',
        prefix: 'P',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: 50,
        weightInFinal: 0.1,
        evaluations: makeEvals('P', 'Presentación', 2),
      },
    ],
  },
  'INF-246': {
    expression: '0.70 * PC + 0.30 * PT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118058005)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118058005.pdf',
    syllabusRequirementsNote:
      'Dos certámenes correspondientes cada uno a la mitad de la materia (70%) y tres tareas prácticas (30%). NF = 0,7*((cert1+cert2)/2) + 0,3*((tarea1+tarea2+tarea3)/3).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (C1 y C2)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.7,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'tareas',
        name: 'Tareas Prácticas (T1, T2, T3)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.3,
        evaluations: makeEvals('T', 'Tarea', 3),
      },
    ],
  },
  'INF-276': {
    expression: '0.30 * PC + 0.30 * PT + 0.40 * PP',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118058205)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118058205.pdf',
    syllabusRequirementsNote:
      'NE = 0,30*Tareas + 0,30*Certamen + 0,40*Proyecto (con asistencia >= 80%). 1 Certamen (30%), 3 Tareas ponderadas (T1=50%, T2=25%, T3=25%) y Proyecto en base a 3 informes ponderados (40%, 20%, 40%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certamen (C1)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.3,
        evaluations: [{ id: 'c1', name: 'Certamen Único', weight: 1, score: null }],
      },
      {
        id: 'tareas',
        name: 'Tareas (50% / 25% / 25%)',
        code: 'PT',
        type: 'weighted',
        prefix: 'T',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.3,
        evaluations: [
          { id: 't1', name: 'Tarea 1 (50%)', weight: 50, score: null },
          { id: 't2', name: 'Tarea 2 (25%)', weight: 25, score: null },
          { id: 't3', name: 'Tarea 3 (25%)', weight: 25, score: null },
        ],
      },
      {
        id: 'proyecto',
        name: 'Informes de Proyecto (40% / 20% / 40%)',
        code: 'PP',
        type: 'weighted',
        prefix: 'P',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.4,
        evaluations: [
          { id: 'p1', name: 'Informe 1 (40%)', weight: 40, score: null },
          { id: 'p2', name: 'Informe 2 (20%)', weight: 20, score: null },
          { id: 'p3', name: 'Informe 3 (40%)', weight: 40, score: null },
        ],
      },
    ],
  },
  'INF-221': {
    expression: '0.65 * PC + 0.30 * PT + 0.05 * PA',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118057805)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118057805.pdf',
    syllabusRequirementsNote:
      'Se evalúa mediante 2 certámenes (C1: 30%, C2: 35%), Promedio Tareas (PT: 30%, 7 tareas en cuadro SCT) y Promedio Ayudantía (PA: 5%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (30% C1 / 35% C2)',
        code: 'PC',
        type: 'weighted',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.65,
        evaluations: [
          { id: 'c1', name: 'Certamen 1 (30%)', weight: 30, score: null },
          { id: 'c2', name: 'Certamen 2 (35%)', weight: 35, score: null },
        ],
      },
      {
        id: 'tareas',
        name: 'Promedio Tareas (PT)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 7,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.3,
        evaluations: makeEvals('T', 'Tarea', 7),
      },
      {
        id: 'ayudantia',
        name: 'Participación Ayudantía (PA)',
        code: 'PA',
        type: 'simple_average',
        prefix: 'A',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.05,
        evaluations: [{ id: 'a1', name: 'Promedio Ayudantía', weight: 1, score: null }],
      },
    ],
  },
  'INF-225': {
    expression: '0.45 * PC + 0.10 * PQ + 0.45 * PP',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118058405)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118058405.pdf',
    syllabusRequirementsNote:
      'NF = 0,45*NC + 0,10*NL + 0,45*NP. 2 Certámenes (NC: 45%), 5 a 6 Controles de lectura quincenales (NL: 10%) y Tareas asociadas a un proyecto de ingeniería de software (NP: 45%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (NC)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.45,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'controles',
        name: 'Controles de Lectura Quincenales (NL)',
        code: 'PQ',
        type: 'simple_average',
        prefix: 'Q',
        count: 6,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.1,
        evaluations: makeEvals('Q', 'Control Lectura', 6),
      },
      {
        id: 'proyecto',
        name: 'Tareas de Proyecto (NP)',
        code: 'PP',
        type: 'simple_average',
        prefix: 'P',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.45,
        evaluations: makeEvals('P', 'Hito Proyecto', 3),
      },
    ],
  },
  'INF-256': {
    expression: 'PC * (1 - α) + α * PL',
    passingGrade: 55,
    applyPenaltyRule: true,
    piecewiseAlpha: {
      baseBlockCode: 'PC',
      targetBlockCode: 'PL',
      minThreshold: 30,
      maxThreshold: 60,
      maxAlpha: 0.3,
    },
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118057506 - Peso Dinámico α)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118057506.pdf',
    syllabusRequirementsNote:
      'Tres certámenes (C1, C2 y C3) y una nota de Laboratorio (T, 4 laboratorios en cuadro SCT, requisito T >= 60). NF = PC × (1 - α) + α × T, donde α = 0,30 si PC >= 60; α = 0 si PC <= 30; y α = (PC/100) - 0,30 si 30 < PC < 60.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (C1, C2, C3)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.7,
        evaluations: makeEvals('C', 'Certamen', 3),
      },
      {
        id: 'laboratorios',
        name: 'Laboratorios (T >= 60)',
        code: 'PL',
        type: 'simple_average',
        prefix: 'L',
        count: 4,
        dropWorstCount: 0,
        minGradeRequired: 60,
        weightInFinal: 0.3,
        evaluations: makeEvals('L', 'Laboratorio', 4),
      },
    ],
  },
  'ICN-270': {
    expression: '0.70 * PC + 0.30 * PT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 115038802)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F115038802.pdf',
    syllabusRequirementsNote:
      'NF = C1*0,35 + C2*0,35 + PROMEDIO(T, Q, K)*0,30 (2 Certámenes de 35% c/u = 70%, y Promedio de Controles Q, Tareas T y Casos K = 30%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (35% c/u)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.7,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'complementarias',
        name: 'Promedio Tareas, Controles y Casos (T, Q, K)',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.3,
        evaluations: [
          { id: 't1', name: 'Promedio Tareas (T)', weight: 1, score: null },
          { id: 't2', name: 'Promedio Controles (Q)', weight: 1, score: null },
          { id: 't3', name: 'Promedio Casos (K)', weight: 1, score: null },
        ],
      },
    ],
  },
  'INF-285': {
    expression: '0.75 * PC + 0.25 * PT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118058502)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118058502.pdf',
    syllabusRequirementsNote:
      'Se evaluará mediante 3 certámenes (75%) y a lo más 5 tareas (25%, eliminando la peor nota salvo T2; requiere promedio de tareas NPT >= 55 para sumar el 25% vía escalón H(NPT-55)).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (NC)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.75,
        evaluations: makeEvals('C', 'Certamen', 3),
      },
      {
        id: 'tareas',
        name: 'Tareas (NPT >= 55, elimina 1 peor)',
        code: 'PT',
        type: 'drop_worst',
        prefix: 'T',
        count: 5,
        dropWorstCount: 1,
        minGradeRequired: 55,
        weightInFinal: 0.25,
        evaluations: makeEvals('T', 'Tarea', 5),
      },
    ],
  },
  'INF-293': {
    expression: '1.00 * PC',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118058606)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118058606.pdf',
    syllabusRequirementsNote:
      'Nota Final (NF) se calcula según: NF = N1 * 0,50 + N2 * 0,50 (Certamen 1: 50%, Certamen 2: 50%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (N1 50% / N2 50%)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 1.0,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
    ],
  },
  'INF-322': {
    expression: '0.70 * PC + 0.30 * PT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118017105)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118017105.pdf',
    syllabusRequirementsNote:
      'NF = 35% C1 + 35% C2 + 30% Trabajos (2 Certámenes de 35% c/u = 70% y Trabajos semanales grupales = 30%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (35% c/u)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.7,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'trabajos',
        name: 'Trabajos / Tareas Grupales',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 4,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.3,
        evaluations: makeEvals('T', 'Trabajo', 4),
      },
    ],
  },
  'INF-343': {
    expression: '0.67 * PC + 0.33 * PT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118017805)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118017805.pdf',
    syllabusRequirementsNote:
      'Se evalúa mediante 2 Certámenes (33,5% c/u = 67%) y 3 Tareas grupales (33%).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (33,5% c/u)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.67,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'tareas',
        name: 'Tareas Grupales',
        code: 'PT',
        type: 'simple_average',
        prefix: 'T',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.33,
        evaluations: makeEvals('T', 'Tarea', 3),
      },
    ],
  },
  'INF-295': {
    expression: '0.60 * PC + 0.40 * PP',
    passingGrade: 55,
    applyPenaltyRule: true,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118059606)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118059606.pdf',
    syllabusRequirementsNote:
      'Se evalúa mediante 2 certámenes (30% c/u = 60%) y un proyecto (40%: 1° parte 20%, 2° parte y Defensa 80%). Si el promedio de certámenes >= 50: NF = PC*0,6 + Proyecto*0,4; en caso contrario NF = PC.',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certámenes (PC >= 50)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: 50,
        weightInFinal: 0.6,
        evaluations: makeEvals('C', 'Certamen', 2),
      },
      {
        id: 'proyecto',
        name: 'Proyecto (20% Avance / 80% Defensa)',
        code: 'PP',
        type: 'weighted',
        prefix: 'P',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.4,
        evaluations: [
          { id: 'p1', name: '1° Parte Proyecto (20%)', weight: 20, score: null },
          { id: 'p2', name: '2° Parte y Defensa (80%)', weight: 80, score: null },
        ],
      },
    ],
  },
  'INF-266': {
    expression: '0.40 * PC + 0.20 * EI + 0.20 * AG + 0.20 * DC',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118059706)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118059706.pdf',
    syllabusRequirementsNote:
      'PS = 0,20*EI + 0,20*AG + 0,20*DC + 0,40*C (Entregables Individuales 20%, Actividades Grupales 20%, Desarrollo de un Caso 20%, 1 Certamen 40%). Si algún componente < 55, rinde Certamen Acumulativo (NF = 0,65*PS + 0,35*CA).',
    subFormulas: [
      {
        id: 'certamenes',
        name: 'Certamen (C)',
        code: 'PC',
        type: 'simple_average',
        prefix: 'C',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.4,
        evaluations: [{ id: 'c1', name: 'Certamen', weight: 1, score: null }],
      },
      {
        id: 'individuales',
        name: 'Entregables Individuales (EI)',
        code: 'EI',
        type: 'simple_average',
        prefix: 'EI',
        count: 5,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.2,
        evaluations: makeEvals('EI', 'Entregable Ind.', 5),
      },
      {
        id: 'grupales',
        name: 'Actividades Grupales (AG)',
        code: 'AG',
        type: 'simple_average',
        prefix: 'AG',
        count: 5,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.2,
        evaluations: makeEvals('AG', 'Actividad Grupal', 5),
      },
      {
        id: 'caso',
        name: 'Desarrollo de un Caso (DC)',
        code: 'DC',
        type: 'simple_average',
        prefix: 'DC',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.2,
        evaluations: [{ id: 'dc1', name: 'Caso Aplicado', weight: 1, score: null }],
      },
    ],
  },
  'TEL-101': {
    expression: '1.00 * PC',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 112037802)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F112037802.pdf',
    syllabusRequirementsNote:
      'Promedio controles (PC) = 100% (4 controles considerados de 5 rendidos; se elimina la nota más baja). Si 50 <= PC < 55, existe la posibilidad de rendir un control global que reemplaza la menor nota entre las 4 consideradas.',
    subFormulas: [
      {
        id: 'controles',
        name: 'Controles (4 mejores de 5)',
        code: 'PC',
        type: 'drop_worst',
        prefix: 'C',
        count: 5,
        dropWorstCount: 1,
        minGradeRequired: null,
        weightInFinal: 1.0,
        evaluations: makeEvals('C', 'Control', 5),
      },
    ],
  },
  'INF-360': {
    expression: '0.45 * HP + 0.25 * PI + 0.20 * EA + 0.10 * CC',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118060505)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118060505.pdf',
    syllabusRequirementsNote:
      'Se evalúa por proyectos sin certamen tradicional: NF = 0,15*(L + PP + EE) + 0,10*(EI + AG) + 0,25*PI + 0,10*CC (Licitación 15%, Plan de Proyecto 15%, Evaluación Económica 15%, Entregables Individuales 10%, Actividades Grupales 10%, Prototipo Inicial 25%, Compromiso 10%).',
    subFormulas: [
      {
        id: 'hitos',
        name: 'Hitos de Proyecto (L, PP, EE)',
        code: 'HP',
        type: 'simple_average',
        prefix: 'H',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.45,
        evaluations: [
          { id: 'h1', name: 'Licitación (L)', weight: 1, score: null },
          { id: 'h2', name: 'Plan de Proyecto (PP)', weight: 1, score: null },
          { id: 'h3', name: 'Evaluación Económica (EE)', weight: 1, score: null },
        ],
      },
      {
        id: 'prototipo',
        name: 'Prototipo Inicial (PI)',
        code: 'PI',
        type: 'simple_average',
        prefix: 'PI',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.25,
        evaluations: [
          { id: 'pi1', name: 'Prototipo Inicial', weight: 1, score: null },
        ],
      },
      {
        id: 'actividades',
        name: 'Entregables Ind. (EI) y Grupales (AG)',
        code: 'EA',
        type: 'simple_average',
        prefix: 'E',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.2,
        evaluations: [
          { id: 'e1', name: 'Entregables Individuales (EI)', weight: 1, score: null },
          { id: 'e2', name: 'Actividades Grupales (AG)', weight: 1, score: null },
        ],
      },
      {
        id: 'compromiso',
        name: 'Compromiso y Cumplimiento (CC)',
        code: 'CC',
        type: 'simple_average',
        prefix: 'CC',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.1,
        evaluations: [
          { id: 'cc1', name: 'Compromiso y Cumplimiento', weight: 1, score: null },
        ],
      },
    ],
  },
  'INF-228': {
    expression: '0.39 * EE + 0.26 * GP + 0.35 * FE',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118060205)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118060205.pdf',
    syllabusRequirementsNote:
      'NF = 0,65 * PS + 0,35 * Feria Informática. Donde PS se compone de 3 Entregables en equipo (60% de PS = 39% total) y Gestión/Tareas/Marketing/Compromiso (40% de PS = 26% total).',
    subFormulas: [
      {
        id: 'entregables',
        name: '3 Entregables en Equipo (60% de PS)',
        code: 'EE',
        type: 'simple_average',
        prefix: 'E',
        count: 3,
        dropWorstCount: 0,
        minGradeRequired: 55,
        weightInFinal: 0.39,
        evaluations: makeEvals('E', 'Entregable', 3),
      },
      {
        id: 'gestion',
        name: 'Tareas Ind., Plan, Marketing y Compromiso (40% de PS)',
        code: 'GP',
        type: 'weighted',
        prefix: 'G',
        count: 4,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.26,
        evaluations: [
          { id: 'g1', name: '10 Tareas Individuales (16%)', weight: 16, score: null },
          { id: 'g2', name: 'Actualización Plan Proyecto (8%)', weight: 8, score: null },
          { id: 'g3', name: 'Elementos de Marketing (8%)', weight: 8, score: null },
          { id: 'g4', name: 'Compromiso y Cumplimiento (8%)', weight: 8, score: null },
        ],
      },
      {
        id: 'feria',
        name: 'Feria Informática (35%)',
        code: 'FE',
        type: 'simple_average',
        prefix: 'F',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.35,
        evaluations: [{ id: 'f1', name: 'Exposición Feria Informática', weight: 1, score: null }],
      },
    ],
  },
  'INF-309': {
    expression: '0.50 * HT + 0.25 * VI + 0.25 * PFT',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118060305)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118060305.pdf',
    syllabusRequirementsNote:
      'NS = ET*0,10 + EM*0,10 + PIT*0,10 + FB*0,10 + MR*0,10 + VI*0,25 + PFT*0,25 (Análisis examen título 10%, Análisis memoria 10%, Propuesta inicial 10%, Fichas 10%, Minutas 10%, Video 25%, Propuesta final 25%).',
    subFormulas: [
      {
        id: 'hitos',
        name: 'Entregables Preliminares (ET, EM, PIT, FB, MR - 10% c/u)',
        code: 'HT',
        type: 'simple_average',
        prefix: 'H',
        count: 5,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.5,
        evaluations: [
          { id: 'h1', name: 'Análisis Examen de Título (ET)', weight: 1, score: null },
          { id: 'h2', name: 'Análisis Escrito Memoria (EM)', weight: 1, score: null },
          { id: 'h3', name: 'Propuesta Inicial Tema (PIT)', weight: 1, score: null },
          { id: 'h4', name: 'Fichas Bibliográficas (FB)', weight: 1, score: null },
          { id: 'h5', name: 'Minutas de Reunión (MR)', weight: 1, score: null },
        ],
      },
      {
        id: 'video',
        name: 'Video de Presentación (VI)',
        code: 'VI',
        type: 'simple_average',
        prefix: 'VI',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.25,
        evaluations: [{ id: 'vi1', name: 'Video Presentación', weight: 1, score: null }],
      },
      {
        id: 'propuesta',
        name: 'Propuesta Final de Tema (PFT)',
        code: 'PFT',
        type: 'simple_average',
        prefix: 'PF',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: 55,
        weightInFinal: 0.25,
        evaluations: [{ id: 'pf1', name: 'Defensa Propuesta Final', weight: 1, score: null }],
      },
    ],
  },
  'INF-310': {
    expression: '0.20 * IA + 0.40 * IF + 0.40 * ET',
    passingGrade: 60,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (PDF 118060405)',
    syllabusPdfUrl:
      'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118060405.pdf',
    syllabusRequirementsNote:
      'Informes de avances (Profesor guía: 20%), Informe final de memoria (Comisión: 40%) y Examen de titulación y defensa (Comisión: 40%). La nota mínima de aprobación es un 60 (escala de 0 a 100).',
    subFormulas: [
      {
        id: 'avances',
        name: 'Informes de Avance (Profesor Guía)',
        code: 'IA',
        type: 'simple_average',
        prefix: 'A',
        count: 2,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.2,
        evaluations: makeEvals('A', 'Informe Avance', 2),
      },
      {
        id: 'informe',
        name: 'Informe Final de Memoria (Comisión)',
        code: 'IF',
        type: 'simple_average',
        prefix: 'IF',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.4,
        evaluations: [{ id: 'if1', name: 'Informe Escrito Memoria', weight: 1, score: null }],
      },
      {
        id: 'defensa',
        name: 'Examen de Titulación y Defensa (Comisión)',
        code: 'ET',
        type: 'simple_average',
        prefix: 'ET',
        count: 1,
        dropWorstCount: 0,
        minGradeRequired: null,
        weightInFinal: 0.4,
        evaluations: [{ id: 'et1', name: 'Defensa Oral de Título', weight: 1, score: null }],
      },
    ],
  },
};

// Reutilizar FIS-110 para FIS-120, FIS-130, FIS-140 con sus respectivos PDFs oficiales de SIGA
OFFICIAL_FORMULAS_MAP['FIS-120'] = {
  ...JSON.parse(JSON.stringify(OFFICIAL_FORMULAS_MAP['FIS-110'])),
  sourceLabel: 'Programa Oficial SIGA (PDF 121002806)',
  syllabusPdfUrl:
    'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F121002806.pdf',
};
OFFICIAL_FORMULAS_MAP['FIS-130'] = {
  ...JSON.parse(JSON.stringify(OFFICIAL_FORMULAS_MAP['FIS-110'])),
  sourceLabel: 'Programa Oficial SIGA (PDF 121003106)',
  syllabusPdfUrl:
    'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F121003106.pdf',
};
OFFICIAL_FORMULAS_MAP['FIS-140'] = {
  ...JSON.parse(JSON.stringify(OFFICIAL_FORMULAS_MAP['FIS-110'])),
  sourceLabel: 'Programa Oficial SIGA (PDF 121003406)',
  syllabusPdfUrl:
    'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F121003406.pdf',
};

/**
 * Reconstruye la expresión algebraica legible (ej. "0.75 * PC + 0.25 * PQ" o "PC * (1 - α) + α * PT")
 * a partir de los bloques actuales, regla por tramos, multiplicador y puntos extra de una CourseFinalFormula.
 */
export function buildFormulaExpression(
  subFormulas: SubFormulaBlock[],
  piecewiseAlpha?: PiecewiseAlphaRule,
  finalGradeMultiplier?: number,
  finalGradeBonusPoints?: number
): string {
  let baseExpr = '1.00 * PC';
  if (piecewiseAlpha) {
    baseExpr = `${piecewiseAlpha.baseBlockCode} * (1 - α) + α * ${piecewiseAlpha.targetBlockCode}`;
  } else if (subFormulas && subFormulas.length > 0) {
    const sum = subFormulas.reduce(
      (acc, b) => acc + (b.weightInFinal > 0 ? b.weightInFinal : 0),
      0
    );
    baseExpr = subFormulas
      .map((b) => {
        const normW =
          sum > 0
            ? (b.weightInFinal > 0 ? b.weightInFinal : 0) / sum
            : 1 / subFormulas.length;
        return `${normW.toFixed(2)} * ${b.code}`;
      })
      .join(' + ');
  }

  const mult = finalGradeMultiplier ?? 1;
  const bonus = finalGradeBonusPoints ?? 0;

  if (Math.abs(mult - 1) > 0.001) {
    baseExpr = `${mult.toFixed(2)} * (${baseExpr})`;
  }
  if (Math.abs(bonus) > 0.001) {
    baseExpr = `${baseExpr} ${bonus > 0 ? '+' : '-'} ${Math.abs(bonus)}`;
  }

  return baseExpr;
}

/**
 * Sincroniza `EvaluationGroup[]` heredados a partir de `CourseFinalFormula`
 * para mantener compatibilidad con todos los selectores del store.
 */
export function syncGroupsFromFormula(formula: CourseFinalFormula): EvaluationGroup[] {
  return (formula.subFormulas || []).map((block) => ({
    id: block.id,
    name: block.name,
    weight:
      Math.round(
        (block.weightInFinal <= 1 ? block.weightInFinal * 100 : block.weightInFinal) * 10
      ) / 10,
    minGrade: block.minGradeRequired,
    hasRecoveryExam: block.code === 'PC',
    recoveryGrade: null,
    evaluations: (block.evaluations || []).map((ev) => ({
      id: ev.id,
      name: ev.name,
      weight: ev.weight,
      score: ev.score,
    })),
  }));
}

/**
 * Busca si existe una fórmula oficial extraída del PDF de SIGA para la sigla indicada.
 */
export function getOfficialSigaFormula(
  sigla: string,
  pdfUrlOverride?: string
): CourseFinalFormula | null {
  const formatted = formatUsmSigla(sigla);
  if (formatted === 'INF-292') {
    const inf292 = createInf292FormulaConfig();
    return {
      ...inf292,
      source: 'siga_pdf',
      sourceLabel: 'Programa Oficial SIGA (PDF 118058106)',
      syllabusRequirementsNote:
        'NF = 0,10*PCE + 0,45*PC + 0,45*PP. En Controles de Entrada (PCE) se descarta la peor nota de 7. Se exige promedio mínimo >= 50 en cada bloque; de lo contrario aplica regla de penalización USM.',
      syllabusPdfUrl:
        pdfUrlOverride ||
        'https://siga.usm.cl/prog_oai/programa_download?pdf=%2Fusr%2Flocal%2Fsiga_doc%2Fprograma%2F118058106.pdf',
    };
  }

  const rawEntry =
    OFFICIAL_FORMULAS_MAP[formatted] ||
    OFFICIAL_FORMULAS_MAP[sigla.trim().toUpperCase()];

  if (!rawEntry) return null;

  const cloned: CourseFinalFormula = JSON.parse(JSON.stringify(rawEntry));
  if (pdfUrlOverride) {
    cloned.syllabusPdfUrl = pdfUrlOverride;
  }
  return cloned;
}

/**
 * Catálogo de Plantillas Departamentales USM para selección rápida con 1 clic.
 */
export const USM_FORMULA_PRESETS: FormulaPresetOption[] = [
  {
    id: 'usm_inf_alpha',
    label: 'Informática USM Peso Dinámico α(PC) (INF-245 / INF-256)',
    departmentTag: 'INF-α',
    description:
      'NF = PC × (1 - α) + α × PT, donde α∈[0, 0.30] interpola linealmente entre PC=30 y PC=60, con requisito PT ≥ 60.',
    buildFormula: (_sigla, pdfUrl) => ({
      expression: 'PC * (1 - α) + α * PT',
      passingGrade: 55,
      applyPenaltyRule: true,
      piecewiseAlpha: {
        baseBlockCode: 'PC',
        targetBlockCode: 'PT',
        minThreshold: 30,
        maxThreshold: 60,
        maxAlpha: 0.3,
      },
      source: 'preset',
      sourceLabel: 'Plantilla Informática USM (Peso Dinámico α)',
      syllabusRequirementsNote:
        'Tres certámenes C1, C2 y C3 (PC) y Tareas/Lab (PT >= 60). NF = PC*(1-α) + α*PT, donde α = 0,30 si PC >= 60; α = 0 si PC <= 30; α = (PC/100) - 0,30 si 30 < PC < 60.',
      syllabusPdfUrl: pdfUrl,
      subFormulas: [
        {
          id: 'certamenes',
          name: 'Certámenes (C1, C2, C3)',
          code: 'PC',
          type: 'simple_average',
          prefix: 'C',
          count: 3,
          dropWorstCount: 0,
          minGradeRequired: null,
          weightInFinal: 0.7,
          evaluations: makeEvals('C', 'Certamen', 3),
        },
        {
          id: 'tareas',
          name: 'Tareas / Laboratorio (T >= 60)',
          code: 'PT',
          type: 'simple_average',
          prefix: 'T',
          count: 4,
          dropWorstCount: 0,
          minGradeRequired: 60,
          weightInFinal: 0.3,
          evaluations: makeEvals('T', 'Tarea', 4),
        },
      ],
    }),
  },
  {
    id: 'usm_mat',
    label: 'Depto. Matemática USM (MAT-021 a MAT-024)',
    departmentTag: 'MAT',
    description:
      'NP = 0,20*C1 + 0,25*C2 + 0,30*C3 + 0,25*PQ (6 controles, se elimina la peor nota).',
    buildFormula: (_sigla, pdfUrl) => ({
      expression: '0.75 * PC + 0.25 * PQ',
      passingGrade: 55,
      applyPenaltyRule: false,
      source: 'preset',
      sourceLabel: 'Plantilla Oficial Depto. Matemática USM',
      syllabusRequirementsNote:
        'Reglamento Depto. Matemática USM: 3 Certámenes ponderados (20%, 25%, 30% = 75%) + 6 Controles (25%, se elimina la nota más baja). Si 45 <= NP < 55, rinde Certamen Global.',
      syllabusPdfUrl: pdfUrl,
      subFormulas: [
        {
          id: 'certamenes',
          name: 'Certámenes (20% / 25% / 30%)',
          code: 'PC',
          type: 'weighted',
          prefix: 'C',
          count: 3,
          dropWorstCount: 0,
          minGradeRequired: null,
          weightInFinal: 0.75,
          evaluations: [
            { id: 'c1', name: 'Certamen 1 (20%)', weight: 20, score: null },
            { id: 'c2', name: 'Certamen 2 (25%)', weight: 25, score: null },
            { id: 'c3', name: 'Certamen 3 (30%)', weight: 30, score: null },
          ],
        },
        {
          id: 'controles',
          name: 'Controles (5 mejores de 6)',
          code: 'PQ',
          type: 'drop_worst',
          prefix: 'Q',
          count: 6,
          dropWorstCount: 1,
          minGradeRequired: null,
          weightInFinal: 0.25,
          evaluations: makeEvals('Q', 'Control', 6),
        },
      ],
    }),
  },
  {
    id: 'usm_fis',
    label: 'Depto. Física USM (FIS-110 a FIS-140)',
    departmentTag: 'FIS',
    description:
      'Certámenes 75% (mín. 50) + Controles 17% (elimina 1 peor) + Tareas Aula 8% (elimina 2 peores).',
    buildFormula: (_sigla, pdfUrl) => ({
      expression: '0.75 * PC + 0.17 * PQ + 0.08 * PT',
      passingGrade: 55,
      applyPenaltyRule: true,
      source: 'preset',
      sourceLabel: 'Plantilla Oficial Depto. Física USM',
      syllabusRequirementsNote:
        'Reglamento Depto. Física USM: 3 Certámenes (75%, mín. >= 50) + Controles (mejores n-1) y Tareas Aula (mejores n-2) = 25%. Requiere aprobación de Laboratorio (factor η >= 1,0).',
      syllabusPdfUrl: pdfUrl,
      subFormulas: [
        {
          id: 'certamenes',
          name: 'Certámenes (C)',
          code: 'PC',
          type: 'simple_average',
          prefix: 'C',
          count: 3,
          dropWorstCount: 0,
          minGradeRequired: 50,
          weightInFinal: 0.75,
          evaluations: makeEvals('C', 'Certamen', 3),
        },
        {
          id: 'controles',
          name: 'Controles (Q - elimina 1 peor)',
          code: 'PQ',
          type: 'drop_worst',
          prefix: 'Q',
          count: 6,
          dropWorstCount: 1,
          minGradeRequired: null,
          weightInFinal: 0.17,
          evaluations: makeEvals('Q', 'Control', 6),
        },
        {
          id: 'tareas',
          name: 'Tareas Aula (T - elimina 2 peores)',
          code: 'PT',
          type: 'drop_worst',
          prefix: 'T',
          count: 6,
          dropWorstCount: 2,
          minGradeRequired: null,
          weightInFinal: 0.08,
          evaluations: makeEvals('T', 'Tarea', 6),
        },
      ],
    }),
  },
  {
    id: 'usm_inf_lab',
    label: 'Ramo con Laboratorio (Cátedra 50% + Lab 30% + Tareas/Controles 20%)',
    departmentTag: 'LAB',
    description:
      'Para asignaturas con horas de laboratorio (INF, ELO, TEL, QUI, MEC) con mínimo >= 50 en Cátedra y Laboratorio.',
    buildFormula: (_sigla, pdfUrl) => ({
      expression: '0.50 * PC + 0.30 * PL + 0.20 * PQ',
      passingGrade: 55,
      applyPenaltyRule: true,
      source: 'preset',
      sourceLabel: 'Plantilla Asignatura con Laboratorio USM',
      syllabusRequirementsNote:
        'Exige promedio de Certámenes (PC >= 50) y promedio de Laboratorio (PL >= 50). En Controles (PQ) se elimina la peor calificación.',
      syllabusPdfUrl: pdfUrl,
      subFormulas: [
        {
          id: 'certamenes',
          name: 'Certámenes Cátedra',
          code: 'PC',
          type: 'simple_average',
          prefix: 'C',
          count: 2,
          dropWorstCount: 0,
          minGradeRequired: 50,
          weightInFinal: 0.5,
          evaluations: makeEvals('C', 'Certamen', 2),
        },
        {
          id: 'laboratorios',
          name: 'Laboratorios / Experiencias',
          code: 'PL',
          type: 'simple_average',
          prefix: 'L',
          count: 4,
          dropWorstCount: 0,
          minGradeRequired: 50,
          weightInFinal: 0.3,
          evaluations: makeEvals('L', 'Laboratorio', 4),
        },
        {
          id: 'controles',
          name: 'Controles / Tareas (elimina 1 peor)',
          code: 'PQ',
          type: 'drop_worst',
          prefix: 'Q',
          count: 4,
          dropWorstCount: 1,
          minGradeRequired: null,
          weightInFinal: 0.2,
          evaluations: makeEvals('Q', 'Control', 4),
        },
      ],
    }),
  },
  {
    id: 'usm_inf_teorico',
    label: 'Depto. Informática / Especialidad (Certámenes 60% + Tareas 25% + Controles 15%)',
    departmentTag: 'INF',
    description:
      'Estructura clásica de Informática USM con 2 o 3 certámenes (mín. 50), entregas de tareas y controles.',
    buildFormula: (_sigla, pdfUrl) => ({
      expression: '0.60 * PC + 0.25 * PT + 0.15 * PQ',
      passingGrade: 55,
      applyPenaltyRule: true,
      source: 'preset',
      sourceLabel: 'Plantilla Depto. Informática USM',
      syllabusRequirementsNote:
        'Promedio de Certámenes (PC >= 50) pondera 60%, Tareas/Proyectos (PT) pondera 25% y Controles (PQ, elimina 1 peor) pondera 15%.',
      syllabusPdfUrl: pdfUrl,
      subFormulas: [
        {
          id: 'certamenes',
          name: 'Certámenes',
          code: 'PC',
          type: 'simple_average',
          prefix: 'C',
          count: 2,
          dropWorstCount: 0,
          minGradeRequired: 50,
          weightInFinal: 0.6,
          evaluations: makeEvals('C', 'Certamen', 2),
        },
        {
          id: 'tareas',
          name: 'Tareas / Entregas',
          code: 'PT',
          type: 'simple_average',
          prefix: 'T',
          count: 3,
          dropWorstCount: 0,
          minGradeRequired: null,
          weightInFinal: 0.25,
          evaluations: makeEvals('T', 'Tarea', 3),
        },
        {
          id: 'controles',
          name: 'Controles (elimina 1 peor)',
          code: 'PQ',
          type: 'drop_worst',
          prefix: 'Q',
          count: 4,
          dropWorstCount: 1,
          minGradeRequired: null,
          weightInFinal: 0.15,
          evaluations: makeEvals('Q', 'Control', 4),
        },
      ],
    }),
  },
  {
    id: 'usm_standard',
    label: 'Estándar General USM (Certámenes 70% + Controles/Tareas 30%)',
    departmentTag: 'USM',
    description:
      '3 Certámenes (70%, mín. 50) + Controles/Tareas (30%). Ideal para ramos teóricos generales.',
    buildFormula: (_sigla, pdfUrl) => ({
      expression: '0.70 * PC + 0.30 * PT',
      passingGrade: 55,
      applyPenaltyRule: true,
      source: 'preset',
      sourceLabel: 'Plantilla Estándar USM (70/30)',
      syllabusRequirementsNote:
        '3 Certámenes con promedio mínimo >= 50 (70% de la nota final) y evaluaciones complementarias/tareas (30%).',
      syllabusPdfUrl: pdfUrl,
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
          evaluations: makeEvals('C', 'Certamen', 3),
        },
        {
          id: 'tareas',
          name: 'Controles / Tareas',
          code: 'PT',
          type: 'simple_average',
          prefix: 'T',
          count: 3,
          dropWorstCount: 0,
          minGradeRequired: null,
          weightInFinal: 0.3,
          evaluations: makeEvals('T', 'Evaluación', 3),
        },
      ],
    }),
  },
  {
    id: 'usm_project',
    label: 'Taller / Proyecto de Ingeniería (Hitos 50% + Prototipo 30% + Avances 20%)',
    departmentTag: 'PROY',
    description:
      'Para asignaturas basadas en proyectos, talleres de diseño o seminarios sin certámenes.',
    buildFormula: (_sigla, pdfUrl) => ({
      expression: '0.50 * HP + 0.30 * PF + 0.20 * EA',
      passingGrade: 55,
      applyPenaltyRule: false,
      source: 'preset',
      sourceLabel: 'Plantilla Taller / Proyecto USM',
      syllabusRequirementsNote:
        'Evaluación continua basada en entregas de Hitos de Proyecto (50%), Entregable/Prototipo Final (30%) y Exposiciones/Actividades (20%).',
      syllabusPdfUrl: pdfUrl,
      subFormulas: [
        {
          id: 'hitos',
          name: 'Hitos del Proyecto',
          code: 'HP',
          type: 'simple_average',
          prefix: 'H',
          count: 3,
          dropWorstCount: 0,
          minGradeRequired: null,
          weightInFinal: 0.5,
          evaluations: makeEvals('H', 'Hito', 3),
        },
        {
          id: 'prototipo',
          name: 'Informe / Prototipo Final',
          code: 'PF',
          type: 'simple_average',
          prefix: 'P',
          count: 1,
          dropWorstCount: 0,
          minGradeRequired: null,
          weightInFinal: 0.3,
          evaluations: [{ id: 'p1', name: 'Entrega Final', weight: 1, score: null }],
        },
        {
          id: 'avances',
          name: 'Actividades / Presentaciones',
          code: 'EA',
          type: 'simple_average',
          prefix: 'A',
          count: 3,
          dropWorstCount: 0,
          minGradeRequired: null,
          weightInFinal: 0.2,
          evaluations: makeEvals('A', 'Actividad', 3),
        },
      ],
    }),
  },
  {
    id: 'usm_controles_only',
    label: 'Evaluación Continua / Controles 100% (elimina 1 peor)',
    departmentTag: 'CONT',
    description:
      'Para ramos introductorios (ej. TEL-101), humanistas o talleres evaluados 100% con controles periódicos.',
    buildFormula: (_sigla, pdfUrl) => ({
      expression: '1.00 * PC',
      passingGrade: 55,
      applyPenaltyRule: false,
      source: 'preset',
      sourceLabel: 'Evaluación Continua (100% Controles)',
      syllabusRequirementsNote:
        'Promedio de controles (PC) = 100%, eliminando la calificación más baja del semestre.',
      syllabusPdfUrl: pdfUrl,
      subFormulas: [
        {
          id: 'controles',
          name: 'Controles / Evaluaciones (elimina 1 peor)',
          code: 'PC',
          type: 'drop_worst',
          prefix: 'C',
          count: 5,
          dropWorstCount: 1,
          minGradeRequired: null,
          weightInFinal: 1.0,
          evaluations: makeEvals('C', 'Control', 5),
        },
      ],
    }),
  },
];

/**
 * Infiere automáticamente la mejor CourseFinalFormula para una asignatura:
 * 1. Busca primero en el catálogo extraído de PDFs oficiales de SIGA (`OFFICIAL_FORMULAS_MAP` + `INF-292`).
 * 2. Si no está en el catálogo explícito, infiere según el departamento, prefijo de sigla y horas de laboratorio/práctica.
 */
export function inferCourseFormulaConfig(
  sigla: string,
  courseInfo?: Course | null
): CourseFinalFormula {
  const formatted = formatUsmSigla(sigla);
  const pdfUrl = courseInfo?.programa_pdf;

  // 1. Catálogo oficial extraído de SIGA PDF
  const official = getOfficialSigaFormula(formatted, pdfUrl);
  if (official) {
    return official;
  }

  const prefix = formatted.split('-')[0] || '';
  const depto = (courseInfo?.departamento || '').toUpperCase();
  const nombre = (courseInfo?.nombre || '').toUpperCase();
  const labHours = courseInfo?.horas?.laboratorios || 0;
  const teoHours = courseInfo?.horas?.teoricas ?? 3;

  // 2. Regla Departamento de Matemática
  if (prefix === 'MAT' || depto.includes('MATEMATICA')) {
    const formula = USM_FORMULA_PRESETS.find((p) => p.id === 'usm_mat')!.buildFormula(
      formatted,
      pdfUrl
    );
    return {
      ...formula,
      source: 'department_heuristic',
      sourceLabel: 'Reglamento Depto. Matemática USM',
    };
  }

  // 3. Regla Departamento de Física
  if (prefix === 'FIS' || depto.includes('FISICA')) {
    const formula = USM_FORMULA_PRESETS.find((p) => p.id === 'usm_fis')!.buildFormula(
      formatted,
      pdfUrl
    );
    return {
      ...formula,
      source: 'department_heuristic',
      sourceLabel: 'Reglamento Depto. Física USM',
    };
  }

  // 4. Ramos de Taller / Proyecto sin cátedra teórica tradicional
  if (
    (teoHours === 0 && labHours === 0) ||
    nombre.includes('TALLER') ||
    nombre.includes('PROYECTO') ||
    nombre.includes('SEMINARIO')
  ) {
    const formula = USM_FORMULA_PRESETS.find((p) => p.id === 'usm_project')!.buildFormula(
      formatted,
      pdfUrl
    );
    return {
      ...formula,
      source: 'department_heuristic',
      sourceLabel: 'Heurística SIGA (Taller / Proyecto)',
    };
  }

  // 5. Ramos Humanistas / Deportes / Inglés
  if (
    ['EFI', 'DEW', 'HCW', 'HRW', 'HIW', 'HAW', 'HFW'].includes(prefix) ||
    depto.includes('DEFIDER') ||
    depto.includes('HUMANISTICOS')
  ) {
    const formula = USM_FORMULA_PRESETS.find(
      (p) => p.id === 'usm_controles_only'
    )!.buildFormula(formatted, pdfUrl);
    return {
      ...formula,
      source: 'department_heuristic',
      sourceLabel: 'Heurística SIGA (Evaluación Continua)',
    };
  }

  // 6. Ramos con Horas de Laboratorio explícitas en SIGA (`horas.laboratorios > 0`)
  if (labHours > 0) {
    const formula = USM_FORMULA_PRESETS.find((p) => p.id === 'usm_inf_lab')!.buildFormula(
      formatted,
      pdfUrl
    );
    return {
      ...formula,
      source: 'department_heuristic',
      sourceLabel: `Inferido por SIGA (${labHours}h Laboratorio/sem)`,
    };
  }

  // 7. Ramos de Informática / Computación / Telemática / Electrónica
  if (
    ['INF', 'ILI', 'IWI', 'TEL', 'ELO'].includes(prefix) ||
    depto.includes('INFORMATICA') ||
    depto.includes('ELECTRONICA')
  ) {
    const formula = USM_FORMULA_PRESETS.find(
      (p) => p.id === 'usm_inf_teorico'
    )!.buildFormula(formatted, pdfUrl);
    return {
      ...formula,
      source: 'department_heuristic',
      sourceLabel: 'Estándar Depto. Informática / ELO USM',
    };
  }

  // 8. Fallback general USM (70% Certámenes + 30% Controles/Tareas)
  const fallback = USM_FORMULA_PRESETS.find((p) => p.id === 'usm_standard')!.buildFormula(
    formatted,
    pdfUrl
  );
  return {
    ...fallback,
    source: 'department_heuristic',
    sourceLabel: 'Plantilla Estándar USM (70/30)',
  };
}
