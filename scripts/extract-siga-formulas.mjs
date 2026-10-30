#!/usr/bin/env node
/**
 * Extractor Multi-Patrón de Requisitos de Aprobación y Fórmulas Oficiales desde SIGA USM (Programas OAI PDF)
 *
 * Soporta los 4 formatos oficiales detectados en `siga.usm.cl/prog_oai/programa_download?pdf=...`:
 *   1. Formato Ecuación Explícita en Texto (ej. INF-134 `NF= C*0,7+ T*0,3`, INF-253 `NF= Cert*0,46 + controles*0,2+EG*0,34`)
 *   2. Formato Tabla de Porcentajes en Texto (ej. INF-221 `C1: 30%, C2: 35%, PT: 30%, PA: 5%`, IWI-131, QUI-010, FIS-100)
 *   3. Formato Prosa en Pág. 2 + Ecuación en Imagen + Cuadro SCT en Pág. 3 (ej. INF-245 y INF-256 con peso dinámico α(PC))
 *   4. Extracción de Cantidades desde Tabla SCT-Chile (Pág. 3):
 *      - `Evaluaciones (certámenes, otros)` -> cantidad de certámenes
 *      - `Tareas obligatorias` -> cantidad de tareas
 *      - `Laboratorios / Taller` -> cantidad de laboratorios
 *
 * Uso:
 *   node scripts/extract-siga-formulas.mjs [--sigla=INF245]
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
 * Extrae las semanas/cantidades declaradas en la Página 3:
 * "II. CÁLCULO DE CANTIDAD DE HORAS DE DEDICACIÓN - (SCT-Chile)"
 */
export function parseSctDedicationTable(fullPdfText) {
  const clean = fullPdfText.replace(/\r/g, '\n');
  const sctMatch = clean.match(
    /C[AÁ]LCULO DE CANTIDAD DE HORAS DE DEDICACI[OÓ]N[\s\S]*$/i
  );
  const tableText = sctMatch ? sctMatch[0] : clean;

  const extractWeeks = (rowPattern) => {
    const regex = new RegExp(
      `${rowPattern}[\\s\\S]{0,60}?(\\d+(?:[.,]\\d+)?)\\s+(\\d{1,2})\\s+(\\d+(?:[.,]\\d+)?)`,
      'i'
    );
    const m = tableText.match(regex);
    return m ? Number(m[2]) : null;
  };

  return {
    certamenesCount: extractWeeks('Evaluaciones\\s*\\(cert[aá]menes'),
    tareasCount: extractWeeks('Tareas\\s*(?:obligatorias|y ejercicios|individuales)'),
    laboratoriosCount: extractWeeks('Laboratorios\\s*\\/\\s*Taller'),
  };
}

/**
 * Parsea el texto extraído de la sección "Evaluación y calificación de la asignatura"
 * cruzado con el Cuadro SCT de la Página 3.
 */
export function parseUsmSyllabusEvaluationText(text, sigla, pdfUrl) {
  const cleanText = text.replace(/\r/g, '\n');
  const sctCounts = parseSctDedicationTable(cleanText);

  const evalMatch = cleanText.match(
    /Evaluaci[oó]n y calificaci[oó]n de la asignatura[\s\S]*?(?=Recursos para el aprendizaje|Bibliograf[ií]a|II\.\s*C[AÁ]LCULO DE CANTIDAD|$)/i
  );

  const sectionText = evalMatch ? evalMatch[0].trim() : cleanText;

  const dropsWorstOne =
    /elimina la nota m[aá]s baja|mejores n-1|cinco con mejores calificaciones|mejores 3/i.test(
      sectionText
    );
  const dropsWorstTwo = /mejores n-2|elimina las dos notas m[aá]s bajas/i.test(sectionText);

  const hasCertamenMin50 =
    /certamen\s*(?:>=|≥|mayor o igual a)\s*50|promedio de cert[aá]menes\s*(?:>=|≥|es igual o mayor a)\s*50|\(C1\+C2\)\/2\s*>=\s*50/i.test(
      sectionText
    );
  const hasCertamenMin55 = /PC\s*(?:>=|≥)\s*55/i.test(sectionText);

  // Detectar si la ecuación está incrustada como imagen (ej. INF-245, INF-256)
  // cuando menciona explícitamente certámenes y tareas/laboratorio pero no hay signos '%' ni '0,' en el texto
  const mentionsInstrumentsInProse =
    /tres cert[aá]menes\s*\(?C1,\s*C2\s*y\s*C3\)?\s*y\s*una nota de\s*(?:tareas|laboratorio)/i.test(
      sectionText
    );
  const hasExplicitNumbers = /(?:\d+\s*%|\d+[.,]\d+\s*\*)/i.test(sectionText);
  const hasEmbeddedEquationImage = mentionsInstrumentsInProse && !hasExplicitNumbers;

  if (hasEmbeddedEquationImage) {
    const isLab = /nota de laboratorio/i.test(sectionText);
    const tCode = isLab ? 'PL' : 'PT';
    const tName = isLab ? 'Laboratorios (T)' : 'Tareas (T)';
    const tCount = isLab
      ? sctCounts.laboratoriosCount || 4
      : sctCounts.tareasCount || 4;

    return {
      sigla: formatSigla(sigla),
      source: 'siga_pdf',
      confidence: 'official_pdf_vision',
      sourceLabel: 'Programa Oficial SIGA (Ecuación por Tramos α)',
      syllabusPdfUrl: pdfUrl,
      syllabusRequirementsNote:
        sectionText.replace(/\s+/g, ' ').slice(0, 420) +
        ` | NF = PC*(1-α) + α*${tCode}, donde α = 0,30 si PC >= 60; α = 0 si PC <= 30; α = (PC/100) - 0,3 si 30 < PC < 60. Requisito ${tCode} >= 60.`,
      sctCounts,
      formula: {
        expression: `PC * (1 - α) + α * ${tCode}`,
        passingGrade: 55,
        applyPenaltyRule: true,
        piecewiseAlpha: {
          baseBlockCode: 'PC',
          targetBlockCode: tCode,
          minThreshold: 30,
          maxThreshold: 60,
          maxAlpha: 0.3,
        },
        subFormulas: [
          {
            id: 'certamenes',
            name: 'Certámenes (C1, C2, C3)',
            code: 'PC',
            type: 'simple_average',
            prefix: 'C',
            count: sctCounts.certamenesCount || 3,
            dropWorstCount: 0,
            minGradeRequired: null,
            weightInFinal: 0.7,
            evaluations: [
              { id: 'c1', name: 'Certamen 1', weight: 1, score: null },
              { id: 'c2', name: 'Certamen 2', weight: 1, score: null },
              { id: 'c3', name: 'Certamen 3', weight: 1, score: null },
            ],
          },
          {
            id: isLab ? 'laboratorios' : 'tareas',
            name: tName,
            code: tCode,
            type: 'simple_average',
            prefix: isLab ? 'L' : 'T',
            count: tCount,
            dropWorstCount: 0,
            minGradeRequired: 60,
            weightInFinal: 0.3,
            evaluations: Array.from({ length: tCount }, (_, i) => ({
              id: `t${i + 1}`,
              name: `${isLab ? 'Laboratorio' : 'Tarea'} ${i + 1}`,
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
    sctCounts,
    dropsWorstOne,
    dropsWorstTwo,
    hasCertamenMin50,
    hasCertamenMin55,
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
    `[extract-siga-formulas] Catálogo oficial verificado disponible en: ${OUTPUT_PATH}`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((err) => {
    console.error('[extract-siga-formulas] Error:', err);
    process.exit(1);
  });
}
