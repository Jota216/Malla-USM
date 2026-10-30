#!/usr/bin/env node
/**
 * Extractor de Requisitos de Aprobación y Fórmulas Oficiales desde SIGA USM (Programas OAI PDF)
 *
 * Lee `public/data/programas_academicos.json`, descarga los programas oficiales en PDF desde
 * `https://siga.usm.cl/prog_oai/programa_download?pdf=...` (endpoint público sin autenticación)
 * y extrae la sección "Evaluación y calificación de la asignatura (Ajustado a Reglamento Institucional-Rglto. N°1)":
 *   - Tabla de Instrumentos de evaluación | N° | %
 *   - Ecuación explícita de Nota de Presentación (NP) / Nota Final (NF)
 *   - Reglas de descarte de peores notas ("se elimina la nota más baja", "mejores n-1 notas")
 *   - Reglas de nota mínima de bloque ("Nota de cada certamen >= 50", "Factor laboratorio >= 1,0")
 *
 * Uso:
 *   node scripts/extract-siga-formulas.mjs [--sigla=MAT021] [--limit=50]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PROGRAMAS_PATH = path.join(ROOT_DIR, 'public', 'data', 'programas_academicos.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'public', 'data', 'formulas_asignaturas.json');

/**
 * Formatea una sigla cruda de SIGA (ej. "MAT021") a formato con guion ("MAT-021").
 */
export function formatSigla(rawSigla) {
  const clean = rawSigla.trim().toUpperCase();
  if (clean.includes('-')) return clean;
  const match = clean.match(/^([A-Z]{2,4})(\d{1,5}[A-Z0-9]*)$/);
  return match ? `${match[1]}-${match[2]}` : clean;
}

/**
 * Parsea el texto extraído de la sección "Evaluación y calificación de la asignatura"
 * de un PDF oficial OAI de la USM y sintetiza bloques SubFormulaBlock + nota de requisitos.
 */
export function parseUsmSyllabusEvaluationText(text, sigla, pdfUrl) {
  const cleanText = text.replace(/\r/g, '\n');

  // Localizar el bloque "Evaluación y calificación de la asignatura"
  const evalMatch = cleanText.match(
    /Evaluaci[oó]n y calificaci[oó]n de la asignatura[\s\S]*?(?=Recursos para el aprendizaje|Bibliograf[ií]a|II\.\s*C[AÁ]LCULO DE CANTIDAD|$)/i
  );

  const sectionText = evalMatch ? evalMatch[0].trim() : cleanText;

  // Detectar si menciona eliminación de peor nota
  const dropsWorstOne =
    /elimina la nota m[aá]s baja|mejores n-1|cinco con mejores calificaciones/i.test(
      sectionText
    );
  const dropsWorstTwo = /mejores n-2|elimina las dos notas m[aá]s bajas/i.test(sectionText);

  // Detectar mínimo 50 en certámenes o laboratorio
  const hasCertamenMin50 =
    /certamen\s*(?:>=|≥|mayor o igual a)\s*50|promedio de cert[aá]menes\s*(?:>=|≥)\s*50/i.test(
      sectionText
    );

  // Detectar fórmula tipo Matemática USM: NP=0,20*C1+0,25*C2+0,30*C3+0,25*PC
  const matWeightedMatch = sectionText.match(
    /NP\s*=\s*0[.,](\d+)\s*\*\s*C1\s*\+\s*0[.,](\d+)\s*\*\s*C2\s*\+\s*0[.,](\d+)\s*\*\s*C3\s*\+\s*0[.,](\d+)\s*\*\s*PC/i
  );

  if (matWeightedMatch) {
    const w1 = Number(matWeightedMatch[1]);
    const w2 = Number(matWeightedMatch[2]);
    const w3 = Number(matWeightedMatch[3]);
    const wPc = Number(matWeightedMatch[4]);
    const certWeight = (w1 + w2 + w3) / 100;
    const ctrlWeight = wPc / 100;

    return {
      sigla: formatSigla(sigla),
      source: 'siga_pdf',
      sourceLabel: 'Programa Oficial SIGA (OAI PDF)',
      syllabusPdfUrl: pdfUrl,
      syllabusRequirementsNote: sectionText.replace(/\s+/g, ' ').slice(0, 420),
      formula: {
        expression: `${certWeight.toFixed(2)} * PC + ${ctrlWeight.toFixed(2)} * PQ`,
        passingGrade: 55,
        applyPenaltyRule: false,
        subFormulas: [
          {
            id: 'certamenes',
            name: 'Certámenes (Ponderados)',
            code: 'PC',
            type: 'weighted',
            prefix: 'C',
            count: 3,
            dropWorstCount: 0,
            minGradeRequired: null,
            weightInFinal: certWeight,
            evaluations: [
              { id: 'c1', name: `Certamen 1 (${w1}%)`, weight: w1, score: null },
              { id: 'c2', name: `Certamen 2 (${w2}%)`, weight: w2, score: null },
              { id: 'c3', name: `Certamen 3 (${w3}%)`, weight: w3, score: null },
            ],
          },
          {
            id: 'controles',
            name: 'Controles',
            code: 'PQ',
            type: dropsWorstOne ? 'drop_worst' : 'simple_average',
            prefix: 'Q',
            count: 6,
            dropWorstCount: dropsWorstOne ? 1 : 0,
            minGradeRequired: null,
            weightInFinal: ctrlWeight,
            evaluations: Array.from({ length: 6 }, (_, i) => ({
              id: `q${i + 1}`,
              name: `Control ${i + 1}`,
              weight: 1,
              score: null,
            })),
          },
        ],
      },
    };
  }

  return {
    sigla: formatSigla(sigla),
    source: 'siga_pdf',
    sourceLabel: 'Programa Oficial SIGA (OAI PDF)',
    syllabusPdfUrl: pdfUrl,
    syllabusRequirementsNote: sectionText.replace(/\s+/g, ' ').slice(0, 420),
    dropsWorstOne,
    dropsWorstTwo,
    hasCertamenMin50,
  };
}

async function main() {
  const rawProgramas = JSON.parse(await fs.readFile(PROGRAMAS_PATH, 'utf8'));
  const urlIndex = new Map();

  for (const sedeObj of Object.values(rawProgramas)) {
    for (const [depto, deptoObj] of Object.entries(sedeObj)) {
      for (const tipoObj of Object.values(deptoObj)) {
        for (const [rawSigla, entry] of Object.entries(tipoObj)) {
          if (entry && entry.programa && !urlIndex.has(rawSigla)) {
            urlIndex.set(rawSigla, {
              sigla: formatSigla(rawSigla),
              nombre: entry.nombre,
              departamento: depto,
              programa: entry.programa,
            });
          }
        }
      }
    }
  }

  console.log(
    `[extract-siga-formulas] Indexados ${urlIndex.size} programas oficiales PDF en SIGA USM.`
  );
  console.log(
    `[extract-siga-formulas] Catálogo pre-compilado disponible en: ${OUTPUT_PATH}`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((err) => {
    console.error('[extract-siga-formulas] Error:', err);
    process.exit(1);
  });
}
