import {
  SubFormulaBlock,
  CourseFinalFormula,
  SubFormulaCourseSolveResult,
  SubFormulaBlockSolveResult,
  SubFormulaSolverStatus,
} from '@/shared/types/academic';

/**
 * Rounds a number to a specified number of decimal places (default 1).
 */
export function roundTo(val: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Normalizes an array of weights (supports percentages e.g. [10, 45, 45] or decimals [0.1, 0.45, 0.45]).
 */
export function normalizeWeights(weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((acc, w) => acc + (w > 0 ? w : 0), 0);
  if (sum <= 0) {
    const uniform = 1 / weights.length;
    return weights.map(() => uniform);
  }
  return weights.map((w) => (w > 0 ? w / sum : 0));
}

export interface BlockEvaluationBreakdown {
  average: number | null;
  droppedScores: number[];
  usedScores: number[];
  knownCount: number;
  unknownCount: number;
}

/**
 * Computes detailed evaluation breakdown for a sub-formula block.
 */
export function computeBlockDetails(
  block: SubFormulaBlock,
  treatEmptyAsZero: boolean = false
): BlockEvaluationBreakdown {
  const evals = block.evaluations || [];
  const totalCount = block.count || evals.length;
  const dropWorst = Math.max(0, block.dropWorstCount || 0);

  const knownScores: number[] = [];
  let unknownCount = 0;

  for (const ev of evals) {
    if (ev.score !== null && ev.score !== undefined && !isNaN(ev.score)) {
      knownScores.push(Number(ev.score));
    } else {
      unknownCount++;
      if (treatEmptyAsZero) {
        knownScores.push(0);
      }
    }
  }

  const knownCount = evals.length - unknownCount;

  // If no known scores and empty values are not treated as zero, average is null
  if (!treatEmptyAsZero && knownScores.length === 0) {
    return {
      average: null,
      droppedScores: [],
      usedScores: [],
      knownCount: 0,
      unknownCount,
    };
  }

  // 1. Simple Average
  if (block.type === 'simple_average') {
    if (knownScores.length === 0) {
      return { average: null, droppedScores: [], usedScores: [], knownCount, unknownCount };
    }
    const sum = knownScores.reduce((a, b) => a + b, 0);
    return {
      average: sum / knownScores.length,
      droppedScores: [],
      usedScores: [...knownScores],
      knownCount,
      unknownCount,
    };
  }

  // 2. Drop Worst K scores
  if (block.type === 'drop_worst') {
    if (knownScores.length === 0) {
      return { average: null, droppedScores: [], usedScores: [], knownCount, unknownCount };
    }

    const sorted = [...knownScores].sort((a, b) => a - b);

    if (treatEmptyAsZero) {
      // With empty as zero, all evaluations exist (unknowns are 0)
      const dropsAllowed = Math.min(dropWorst, Math.max(0, sorted.length - 1));
      const dropped = sorted.slice(0, dropsAllowed);
      const used = sorted.slice(dropsAllowed);
      const sum = used.reduce((a, b) => a + b, 0);
      return {
        average: used.length > 0 ? sum / used.length : null,
        droppedScores: dropped,
        usedScores: used,
        knownCount,
        unknownCount,
      };
    } else {
      // Partial progress without zero-fill:
      // Drop lowest K only if at least (count - dropWorstCount) evaluations have been taken
      const requiredToDrop = Math.max(1, totalCount - dropWorst);
      if (knownScores.length >= requiredToDrop && dropWorst > 0) {
        const dropsAllowed = Math.min(dropWorst, Math.max(0, sorted.length - 1));
        const dropped = sorted.slice(0, dropsAllowed);
        const used = sorted.slice(dropsAllowed);
        const sum = used.reduce((a, b) => a + b, 0);
        return {
          average: used.length > 0 ? sum / used.length : null,
          droppedScores: dropped,
          usedScores: used,
          knownCount,
          unknownCount,
        };
      } else {
        // Not enough evaluations taken yet to drop worst: average all known scores
        const sum = sorted.reduce((a, b) => a + b, 0);
        return {
          average: sum / sorted.length,
          droppedScores: [],
          usedScores: sorted,
          knownCount,
          unknownCount,
        };
      }
    }
  }

  // 3. Weighted within block
  if (block.type === 'weighted') {
    let weightSum = 0;
    let pointSum = 0;
    const used: number[] = [];

    for (const ev of evals) {
      const isKnown = ev.score !== null && ev.score !== undefined && !isNaN(ev.score);
      const w = ev.weight > 0 ? ev.weight : 1;
      if (isKnown) {
        const score = Number(ev.score);
        pointSum += w * score;
        weightSum += w;
        used.push(score);
      } else if (treatEmptyAsZero) {
        weightSum += w;
        used.push(0);
      }
    }

    if (weightSum <= 0) {
      return { average: null, droppedScores: [], usedScores: [], knownCount, unknownCount };
    }

    return {
      average: pointSum / weightSum,
      droppedScores: [],
      usedScores: used,
      knownCount,
      unknownCount,
    };
  }

  return { average: null, droppedScores: [], usedScores: [], knownCount, unknownCount };
}

/**
 * Pure function: Computes current average of a sub-formula block.
 * - simple_average: average of known grades. If all empty, returns null.
 * - drop_worst: drops lowest K grades if at least (count - dropWorstCount) knowns exist.
 * - weighted: normalized weighted sum of known evaluations.
 * If treatEmptyAsZero is true, unknown scores are treated as 0.
 */
export function computeBlockAverage(
  block: SubFormulaBlock,
  treatEmptyAsZero: boolean = false
): number | null {
  const breakdown = computeBlockDetails(block, treatEmptyAsZero);
  return breakdown.average !== null ? roundTo(breakdown.average, 2) : null;
}

/**
 * Helper: Computes the simulated average of a block if ALL unknown evaluations
 * within this block receive uniform score X.
 */
export function computeBlockAverageWithScore(
  block: SubFormulaBlock,
  uniformUnknownScore: number
): number {
  const evals = block.evaluations || [];
  const totalCount = block.count || evals.length;
  const dropWorst = Math.max(0, block.dropWorstCount || 0);

  const scores: number[] = [];
  for (const ev of evals) {
    if (ev.score !== null && ev.score !== undefined && !isNaN(ev.score)) {
      scores.push(Number(ev.score));
    } else {
      scores.push(uniformUnknownScore);
    }
  }

  if (scores.length === 0) return 0;

  if (block.type === 'simple_average') {
    const sum = scores.reduce((a, b) => a + b, 0);
    return sum / scores.length;
  }

  if (block.type === 'drop_worst') {
    const sorted = [...scores].sort((a, b) => a - b);
    const dropsAllowed = Math.min(dropWorst, Math.max(0, totalCount - 1));
    const used = sorted.slice(dropsAllowed);
    const sum = used.reduce((a, b) => a + b, 0);
    return used.length > 0 ? sum / used.length : 0;
  }

  if (block.type === 'weighted') {
    const weights = normalizeWeights(evals.map((e) => e.weight));
    let sum = 0;
    for (let i = 0; i < scores.length; i++) {
      sum += weights[i] * scores[i];
    }
    return sum;
  }

  return 0;
}

/**
 * Algebraic Clearance: Solves for uniform score X in unknown evaluations of a single block
 * needed to satisfy the block's minimum threshold (A_b(X) >= targetMin).
 * Returns:
 * - 0 if already satisfied even with 0 in all unknowns.
 * - Required score X (can be > 100 if mathematically impossible under normal scale).
 * - null if the block has no unknowns and already fails/passes.
 */
export function solveBlockRequiredGrade(
  block: SubFormulaBlock,
  targetMin: number
): number | null {
  const evals = block.evaluations || [];
  const unknownCount = evals.filter(
    (e) => e.score === null || e.score === undefined || isNaN(e.score)
  ).length;

  if (unknownCount === 0) {
    const current = computeBlockAverage(block, true) ?? 0;
    return current >= targetMin ? 0 : null; // null indicates no clearance possible (fixed outcome)
  }

  // Check if 0 is already sufficient
  const avgAt0 = computeBlockAverageWithScore(block, 0);
  if (avgAt0 >= targetMin) {
    return 0;
  }

  // Analytical clearance for simple_average: (sum(known) + U*X) / N >= targetMin
  if (block.type === 'simple_average') {
    const N = evals.length;
    const knownSum = evals
      .filter((e) => e.score !== null && e.score !== undefined && !isNaN(e.score))
      .reduce((acc, e) => acc + Number(e.score), 0);
    const needed = (N * targetMin - knownSum) / unknownCount;
    return roundTo(needed, 2);
  }

  // Analytical clearance for weighted: (knownPoints + sum(U_w)*X) / totalW >= targetMin
  if (block.type === 'weighted') {
    const normalizedEvalWeights = normalizeWeights(evals.map((e) => e.weight));
    let knownPoints = 0;
    let unknownWeight = 0;
    evals.forEach((e, idx) => {
      const w = normalizedEvalWeights[idx];
      if (e.score !== null && e.score !== undefined && !isNaN(e.score)) {
        knownPoints += w * Number(e.score);
      } else {
        unknownWeight += w;
      }
    });

    if (unknownWeight <= 0) return null;
    const needed = (targetMin - knownPoints) / unknownWeight;
    return roundTo(needed, 2);
  }

  // Bisection search for piecewise linear drop_worst:
  let low = 0;
  let high = 300; // allow searching beyond 100 to detect impossible requirements cleanly

  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    const val = computeBlockAverageWithScore(block, mid);
    if (val >= targetMin) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return roundTo(high, 2);
}

/**
 * Helper: Solves the uniform score X required across ALL course unknowns
 * to reach the global passing grade (formulaFinalGrade >= passingGrade),
 * without considering block sudden-death minimums.
 */
export function solveGlobalFormulaUniformGrade(
  config: CourseFinalFormula,
  passingGrade: number
): number | null {
  const blocks = config.subFormulas || [];
  const normalizedWeights = normalizeWeights(blocks.map((b) => b.weightInFinal));

  // Count total unknowns across entire course
  let totalUnknowns = 0;
  for (const block of blocks) {
    const u = (block.evaluations || []).filter(
      (e) => e.score === null || e.score === undefined || isNaN(e.score)
    ).length;
    totalUnknowns += u;
  }

  // Function to evaluate global formula with uniform score X
  const evalFormulaWithX = (X: number): number => {
    let nf = 0;
    for (let i = 0; i < blocks.length; i++) {
      const w = normalizedWeights[i];
      const avg = computeBlockAverageWithScore(blocks[i], X);
      nf += w * avg;
    }
    return nf;
  };

  if (totalUnknowns === 0) {
    const finalGrade = evalFormulaWithX(0);
    return finalGrade >= passingGrade ? 0 : null;
  }

  if (evalFormulaWithX(0) >= passingGrade) {
    return 0;
  }

  // Bisection search on [0, 300]
  let low = 0;
  let high = 300;

  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    const nf = evalFormulaWithX(mid);
    if (nf >= passingGrade) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return roundTo(high, 2);
}

/**
 * Pure Mathematical Engine: Solves Sub-Formula Course Status.
 *
 * Implements:
 * 1. Current average of each sub-formula block (drop worst, simple, weighted).
 * 2. Minimum threshold satisfaction per block (e.g. >= 50).
 * 3. USM Penalty Condition:
 *    IF all blocks with minGrade >= minGrade THEN NF = formula ELSE NF = min(block averages).
 * 4. Algebraic clearance:
 *    - X_block: uniform grade needed in empty evaluations of block b to reach M_b.
 *    - X_global: uniform grade needed across all empty evaluations to reach NF >= 55.
 *    - X_effective: max(X_global, max_b(X_block)).
 * 5. Binding condition detection ('GLOBAL' | 'BLOCK_MIN' | 'NONE').
 * 6. Academic status ('APPROVED' | 'ON_TRACK' | 'IN_DANGER' | 'REQUIRES_PERFECT' | 'FAILED').
 * 7. Concise and actionable diagnostic message.
 */
export function solveSubFormulaCourse(
  config: CourseFinalFormula,
  passingGradeOverride?: number
): SubFormulaCourseSolveResult {
  const passingGrade = passingGradeOverride ?? config.passingGrade ?? 55;
  const blocks = config.subFormulas || [];
  const normalizedBlockWeights = normalizeWeights(blocks.map((b) => b.weightInFinal));

  // 1. Solve each block independently
  const blockResults: SubFormulaBlockSolveResult[] = [];
  let totalUnknowns = 0;
  let totalKnowns = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const weightInFinal = normalizedBlockWeights[i];
    const breakdown = computeBlockDetails(block, false);
    const zeroFilledBreakdown = computeBlockDetails(block, true);

    const minGrade = block.minGradeRequired ?? null;
    const knownCount = breakdown.knownCount;
    const unknownCount = breakdown.unknownCount;
    totalKnowns += knownCount;
    totalUnknowns += unknownCount;

    // Check if current known average meets min grade
    const currentAvg = breakdown.average !== null ? roundTo(breakdown.average, 2) : null;
    const projectedWithZero = roundTo(zeroFilledBreakdown.average ?? 0, 2);

    let requiredForBlockMin: number | null = null;
    if (minGrade !== null) {
      requiredForBlockMin = solveBlockRequiredGrade(block, minGrade);
    }

    // Meets min grade if:
    // - has no min requirement, OR
    // - unknownCount == 0 and currentAvg >= minGrade, OR
    // - unknownCount > 0 and currentAvg is currently >= minGrade (on track)
    const meetsMin =
      minGrade === null
        ? true
        : currentAvg !== null
        ? currentAvg >= minGrade
        : false;

    blockResults.push({
      blockId: block.id,
      blockCode: block.code,
      blockName: block.name,
      type: block.type,
      weightInFinal: roundTo(weightInFinal, 4),
      minGradeRequired: minGrade,
      currentAverage: currentAvg,
      projectedAverageWithZero: projectedWithZero,
      requiredForBlockMin,
      meetsMinGrade: meetsMin,
      isMinGradeCritical: false, // will flag if it binds over global
      knownCount,
      unknownCount,
      droppedScores: breakdown.droppedScores,
    });
  }

  // 2. Compute current final grade
  // Using current known averages (normalized across blocks with known grades):
  let knownWeightedSum = 0;
  let knownWeightSum = 0;
  const currentBlockAveragesForPenalty: number[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const bResult = blockResults[i];
    const w = normalizedBlockWeights[i];
    if (bResult.currentAverage !== null) {
      knownWeightedSum += w * bResult.currentAverage;
      knownWeightSum += w;
      currentBlockAveragesForPenalty.push(bResult.currentAverage);
    } else {
      currentBlockAveragesForPenalty.push(0);
    }
  }

  const formulaFinalGrade =
    knownWeightSum > 0 ? roundTo(knownWeightedSum / knownWeightSum, 2) : 0;

  // 3. Evaluate USM Penalty Rule
  // If applyPenaltyRule is true:
  // IF all blocks with minGrade >= minGrade THEN NF = formula ELSE NF = min(promedios_de_bloques)
  const penaltyRuleApplies = !!config.applyPenaltyRule && blocks.some((b) => b.minGradeRequired !== null);

  let isPenaltyTriggered = false;
  let penaltyGrade: number | null = null;

  if (penaltyRuleApplies) {
    const failingBlock = blockResults.find(
      (b) => b.minGradeRequired !== null && (b.currentAverage === null || b.currentAverage < b.minGradeRequired)
    );
    if (failingBlock) {
      isPenaltyTriggered = true;
      const minBlockAvg = Math.min(...currentBlockAveragesForPenalty);
      penaltyGrade = roundTo(minBlockAvg, 2);
    }
  }

  const currentFinalGrade = isPenaltyTriggered && penaltyGrade !== null
    ? penaltyGrade
    : formulaFinalGrade;

  // 4. Algebraic Clearance: Global grade vs Block minimums
  const requiredGlobalGrade = solveGlobalFormulaUniformGrade(config, passingGrade);

  let effectiveRequiredGrade: number | null = null;
  let bindingCondition: 'GLOBAL' | 'BLOCK_MIN' | 'NONE' = 'NONE';
  let bindingBlockCode: string | undefined;
  let bindingBlockName: string | undefined;

  if (totalUnknowns > 0) {
    let maxRequired = requiredGlobalGrade ?? 0;
    bindingCondition = maxRequired > 0 ? 'GLOBAL' : 'NONE';

    for (const bResult of blockResults) {
      if (bResult.minGradeRequired !== null && bResult.requiredForBlockMin !== null) {
        if (bResult.requiredForBlockMin > maxRequired) {
          maxRequired = bResult.requiredForBlockMin;
          bindingCondition = 'BLOCK_MIN';
          bindingBlockCode = bResult.blockCode;
          bindingBlockName = bResult.blockName;
          bResult.isMinGradeCritical = true;
        }
      }
    }

    effectiveRequiredGrade = roundTo(maxRequired, 2);
  }

  // 5. Status Determination & Diagnostic Message
  let status: SubFormulaSolverStatus = 'ON_TRACK';
  let diagnosticMessage = '';

  if (totalUnknowns === 0) {
    // All evaluations have been taken
    const allMinsMet = blockResults.every((b) => {
      if (b.minGradeRequired === null) return true;
      return (b.currentAverage ?? 0) >= b.minGradeRequired;
    });

    if (currentFinalGrade >= passingGrade && allMinsMet) {
      status = 'APPROVED';
      diagnosticMessage = `¡Ramo Aprobado! Nota final: ${currentFinalGrade} (cumple todos los mínimos exigidos).`;
    } else {
      status = 'FAILED';
      if (isPenaltyTriggered) {
        const failed = blockResults.find(
          (b) => b.minGradeRequired !== null && (b.currentAverage ?? 0) < b.minGradeRequired
        );
        diagnosticMessage = `Reprobado por regla de penalización USM: ${failed?.blockName} (${failed?.blockCode}) promedió ${failed?.currentAverage ?? 0} (mínimo exigido: ${failed?.minGradeRequired}). Nota final castigada a ${currentFinalGrade}.`;
      } else {
        diagnosticMessage = `Reprobado. Nota final: ${currentFinalGrade} (mínimo de aprobación: ${passingGrade}).`;
      }
    }
  } else {
    // Unknown evaluations remain
    const req = effectiveRequiredGrade ?? 0;

    // Check if mathematically approved with 0 in remaining
    const minPossiblePoints = blockResults.reduce(
      (acc, b, idx) => acc + normalizedBlockWeights[idx] * b.projectedAverageWithZero,
      0
    );
    const allMinsMetWithZero = blockResults.every((b) => {
      if (b.minGradeRequired === null) return true;
      return (b.requiredForBlockMin ?? 0) <= 0;
    });

    if (minPossiblePoints >= passingGrade && allMinsMetWithZero) {
      status = 'APPROVED';
      bindingCondition = 'NONE';
      effectiveRequiredGrade = 0;
      diagnosticMessage = `¡Matemáticamente Aprobado! Tienes ${currentFinalGrade} asegurado. Aún obteniendo 0 en lo restante apruebas el ramo.`;
    } else if (req > 100) {
      status = 'REQUIRES_PERFECT';
      if (bindingCondition === 'BLOCK_MIN') {
        const minReq = blockResults.find((b) => b.blockCode === bindingBlockCode)?.minGradeRequired;
        diagnosticMessage = `Exigencia extrema: ${bindingBlockName} (${bindingBlockCode}) requiere ${req} (> 100) para cumplir el mínimo de ${minReq}. Aplica regla de penalización USM si no se recupera.`;
      } else {
        diagnosticMessage = `Exigencia extrema: Se requiere promediar ${req} (> 100) en evaluaciones restantes para alcanzar la nota ${passingGrade}.`;
      }
    } else if (req > 80) {
      status = 'IN_DANGER';
      if (bindingCondition === 'BLOCK_MIN') {
        const minReq = blockResults.find((b) => b.blockCode === bindingBlockCode)?.minGradeRequired;
        diagnosticMessage = `¡En Peligro! Restricción crítica en ${bindingBlockName} (${bindingBlockCode}): necesitas promediar al menos ${req} para cumplir el mínimo de ${minReq} y evitar la penalización USM.`;
      } else {
        diagnosticMessage = `¡En Peligro! Necesitas promediar ${req} en las evaluaciones restantes para alcanzar la nota de aprobación ${passingGrade}.`;
      }
    } else {
      status = 'ON_TRACK';
      if (bindingCondition === 'BLOCK_MIN') {
        const minReq = blockResults.find((b) => b.blockCode === bindingBlockCode)?.minGradeRequired;
        diagnosticMessage = `En curso. Condición vinculante: ${bindingBlockName} (${bindingBlockCode}) exige promediar al menos ${req} en sus evaluaciones restantes para asegurar el mínimo de ${minReq}.`;
      } else {
        diagnosticMessage = `En curso. Necesitas promediar ${req} en las evaluaciones restantes para aprobar el ramo (NF >= ${passingGrade}).`;
      }
    }
  }

  return {
    status,
    currentFinalGrade,
    formulaFinalGrade,
    penaltyRuleApplies,
    isPenaltyTriggered,
    penaltyGrade,
    requiredUniformGrade: effectiveRequiredGrade,
    requiredGlobalGrade: requiredGlobalGrade !== null ? roundTo(requiredGlobalGrade, 2) : null,
    bindingCondition,
    bindingBlockCode,
    bindingBlockName,
    blocks: blockResults,
    diagnosticMessage,
  };
}

/**
 * Simulates final grade with custom simulated scores for unknowns.
 */
export function simulateSubFormulaGrades(
  config: CourseFinalFormula,
  simulatedScores: Record<string, number>
): SubFormulaCourseSolveResult {
  const clonedConfig: CourseFinalFormula = JSON.parse(JSON.stringify(config));

  for (const block of clonedConfig.subFormulas) {
    for (const ev of block.evaluations) {
      if (ev.score === null || ev.score === undefined || isNaN(ev.score)) {
        if (simulatedScores[ev.id] !== undefined) {
          ev.score = simulatedScores[ev.id];
        }
      }
    }
  }

  return solveSubFormulaCourse(clonedConfig);
}
