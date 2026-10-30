import {
  Course,
  CourseFinalFormula,
  EvaluationGroup,
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

/**
 * Catálogo curado extraído de los Programas Oficiales de Asignatura en PDF de SIGA USM
 * (`https://siga.usm.cl/prog_oai/programa_download?pdf=...`), espejo en `public/data/formulas_asignaturas.json`.
 */
const OFFICIAL_FORMULAS_MAP: Record<string, CourseFinalFormula> = {
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
        evaluations: Array.from({ length: 6 }, (_, i) => ({
          id: `q${i + 1}`,
          name: `Control ${i + 1}`,
          weight: 1,
          score: null,
        })),
      },
    ],
  },
  'MAT-022': {
    expression: '0.75 * PC + 0.25 * PQ',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (Depto. Matemática)',
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
        evaluations: Array.from({ length: 6 }, (_, i) => ({
          id: `q${i + 1}`,
          name: `Control ${i + 1}`,
          weight: 1,
          score: null,
        })),
      },
    ],
  },
  'MAT-023': {
    expression: '0.75 * PC + 0.25 * PQ',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (Depto. Matemática)',
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
        evaluations: Array.from({ length: 5 }, (_, i) => ({
          id: `q${i + 1}`,
          name: `Control ${i + 1}`,
          weight: 1,
          score: null,
        })),
      },
    ],
  },
  'MAT-024': {
    expression: '0.75 * PC + 0.25 * PQ',
    passingGrade: 55,
    applyPenaltyRule: false,
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (Depto. Matemática)',
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
        evaluations: Array.from({ length: 5 }, (_, i) => ({
          id: `q${i + 1}`,
          name: `Control ${i + 1}`,
          weight: 1,
          score: null,
        })),
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
      'Evaluación Cátedra: 3 Certámenes (75%, requisito C_i >= 50) + Controles (mejores n-1) y Tareas Aula (mejores n-2) = 25% (PTQ = 2/3 PQ + 1/3 PT). Laboratorio: Factor η >= 1,0 (30% controles lab + 70% informes). Certamen Global si PS >= 50.',
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
        evaluations: [
          { id: 'c1', name: 'Certamen 1', weight: 1, score: null },
          { id: 'c2', name: 'Certamen 2', weight: 1, score: null },
          { id: 'c3', name: 'Certamen 3', weight: 1, score: null },
        ],
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
        evaluations: Array.from({ length: 6 }, (_, i) => ({
          id: `q${i + 1}`,
          name: `Control ${i + 1}`,
          weight: 1,
          score: null,
        })),
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
        evaluations: Array.from({ length: 6 }, (_, i) => ({
          id: `t${i + 1}`,
          name: `Tarea ${i + 1}`,
          weight: 1,
          score: null,
        })),
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
        evaluations: Array.from({ length: 5 }, (_, i) => ({
          id: `c${i + 1}`,
          name: `Control ${i + 1}`,
          weight: 1,
          score: null,
        })),
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
};

/**
 * Reconstruye la expresión algebraica legible (ej. "0.75 * PC + 0.25 * PQ")
 * a partir de los bloques actuales de una CourseFinalFormula.
 */
export function buildFormulaExpression(subFormulas: SubFormulaBlock[]): string {
  if (!subFormulas || subFormulas.length === 0) return '1.00 * PC';
  const sum = subFormulas.reduce(
    (acc, b) => acc + (b.weightInFinal > 0 ? b.weightInFinal : 0),
    0
  );
  return subFormulas
    .map((b) => {
      const normW =
        sum > 0
          ? (b.weightInFinal > 0 ? b.weightInFinal : 0) / sum
          : 1 / subFormulas.length;
      return `${normW.toFixed(2)} * ${b.code}`;
    })
    .join(' + ');
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
      sourceLabel: 'Syllabus Oficial INF-292 (Optimización)',
      syllabusRequirementsNote:
        'NF = 0,10*PCE + 0,45*PC + 0,45*PP. En Controles de Entrada (PCE) se descarta la peor nota de 7. Se exige promedio mínimo >= 50 en cada bloque; de lo contrario aplica regla de penalización USM.',
      syllabusPdfUrl: pdfUrlOverride,
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
          evaluations: Array.from({ length: 6 }, (_, i) => ({
            id: `q${i + 1}`,
            name: `Control ${i + 1}`,
            weight: 1,
            score: null,
          })),
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
          evaluations: [
            { id: 'c1', name: 'Certamen 1', weight: 1, score: null },
            { id: 'c2', name: 'Certamen 2', weight: 1, score: null },
            { id: 'c3', name: 'Certamen 3', weight: 1, score: null },
          ],
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
          evaluations: Array.from({ length: 6 }, (_, i) => ({
            id: `q${i + 1}`,
            name: `Control ${i + 1}`,
            weight: 1,
            score: null,
          })),
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
          evaluations: Array.from({ length: 6 }, (_, i) => ({
            id: `t${i + 1}`,
            name: `Tarea ${i + 1}`,
            weight: 1,
            score: null,
          })),
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
          evaluations: [
            { id: 'c1', name: 'Certamen 1', weight: 1, score: null },
            { id: 'c2', name: 'Certamen 2', weight: 1, score: null },
          ],
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
          evaluations: Array.from({ length: 4 }, (_, i) => ({
            id: `l${i + 1}`,
            name: `Laboratorio ${i + 1}`,
            weight: 1,
            score: null,
          })),
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
          evaluations: Array.from({ length: 4 }, (_, i) => ({
            id: `q${i + 1}`,
            name: `Control ${i + 1}`,
            weight: 1,
            score: null,
          })),
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
          evaluations: [
            { id: 'c1', name: 'Certamen 1', weight: 1, score: null },
            { id: 'c2', name: 'Certamen 2', weight: 1, score: null },
          ],
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
          evaluations: [
            { id: 't1', name: 'Tarea 1', weight: 1, score: null },
            { id: 't2', name: 'Tarea 2', weight: 1, score: null },
            { id: 't3', name: 'Tarea 3', weight: 1, score: null },
          ],
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
          evaluations: Array.from({ length: 4 }, (_, i) => ({
            id: `q${i + 1}`,
            name: `Control ${i + 1}`,
            weight: 1,
            score: null,
          })),
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
          count: 3,
          dropWorstCount: 0,
          minGradeRequired: null,
          weightInFinal: 0.3,
          evaluations: [
            { id: 't1', name: 'Evaluación 1', weight: 1, score: null },
            { id: 't2', name: 'Evaluación 2', weight: 1, score: null },
            { id: 't3', name: 'Evaluación 3', weight: 1, score: null },
          ],
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
          evaluations: [
            { id: 'h1', name: 'Hito 1', weight: 1, score: null },
            { id: 'h2', name: 'Hito 2', weight: 1, score: null },
            { id: 'h3', name: 'Hito 3', weight: 1, score: null },
          ],
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
          evaluations: [
            { id: 'a1', name: 'Actividad 1', weight: 1, score: null },
            { id: 'a2', name: 'Actividad 2', weight: 1, score: null },
            { id: 'a3', name: 'Actividad 3', weight: 1, score: null },
          ],
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
          evaluations: Array.from({ length: 5 }, (_, i) => ({
            id: `c${i + 1}`,
            name: `Control ${i + 1}`,
            weight: 1,
            score: null,
          })),
        },
      ],
    }),
  },
];

/**
 * Infiere automáticamente la mejor CourseFinalFormula para una asignatura:
 * 1. Busca primero en el catálogo extraído de PDFs oficiales de SIGA (`formulas_asignaturas.json` + `INF-292`).
 * 2. Si no está en el catálogo explícito, infiere según el departamento, prefijo de sigla y horas de laboratorio/práctica en `planes_carreras.json`.
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
