import {
  computeBlockAverage,
  computeBlockDetails,
  solveBlockRequiredGrade,
  solveSubFormulaCourse,
} from './subFormulaSolver';
import {
  createInf292FormulaConfig,
  createInf292CourseConfig,
  createInf292ExampleScenario,
} from '../data/inf292Template';
import { useAcademicStore } from '../store/useAcademicStore';
import { SubFormulaBlock } from '../types/academic';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual: any, expected: any, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Assertion failed [${message}]: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertApprox(actual: number, expected: number, tolerance: number = 0.1, message: string = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Assertion failed [${message}]: Expected ~${expected}, got ${actual} (diff: ${Math.abs(actual - expected)})`);
  }
}

console.log('=== RUNNING TESTS FOR SUB-FORMULAS & USM PENALTY ENGINE ===\n');

// -------------------------------------------------------------
// Test 1: Block Average - simple_average
// -------------------------------------------------------------
console.log('Test 1: Simple Average computation');
{
  const block: SubFormulaBlock = {
    id: 'pc',
    name: 'Certámenes',
    code: 'PC',
    type: 'simple_average',
    prefix: 'C',
    count: 3,
    dropWorstCount: 0,
    minGradeRequired: 50,
    weightInFinal: 0.45,
    evaluations: [
      { id: 'c1', name: 'C1', weight: 1, score: 60 },
      { id: 'c2', name: 'C2', weight: 1, score: 70 },
      { id: 'c3', name: 'C3', weight: 1, score: 80 },
    ],
  };

  const avg = computeBlockAverage(block);
  assertEquals(avg, 70, 'All known simple average: (60+70+80)/3 = 70');

  // With empty scores and treatEmptyAsZero = false
  block.evaluations[1].score = null;
  block.evaluations[2].score = null;
  const partialAvg = computeBlockAverage(block, false);
  assertEquals(partialAvg, 60, 'Partial simple average: 60/1 = 60');

  // With empty scores and treatEmptyAsZero = true
  const zeroAvg = computeBlockAverage(block, true);
  assertEquals(zeroAvg, 20, 'Zero-filled simple average: (60+0+0)/3 = 20');

  // All empty
  block.evaluations[0].score = null;
  const emptyAvg = computeBlockAverage(block, false);
  assertEquals(emptyAvg, null, 'All empty simple average is null');
  console.log('  ✓ Simple average calculations passed.');
}

// -------------------------------------------------------------
// Test 2: Block Average - drop_worst
// -------------------------------------------------------------
console.log('\nTest 2: Drop Worst K grades computation');
{
  const block: SubFormulaBlock = {
    id: 'pce',
    name: 'Controles de Entrada',
    code: 'PCE',
    type: 'drop_worst',
    prefix: 'CE',
    count: 7,
    dropWorstCount: 1,
    minGradeRequired: 50,
    weightInFinal: 0.1,
    evaluations: [
      { id: 'ce1', name: 'CE1', weight: 1, score: 40 }, // worst grade
      { id: 'ce2', name: 'CE2', weight: 1, score: 70 },
      { id: 'ce3', name: 'CE3', weight: 1, score: 80 },
      { id: 'ce4', name: 'CE4', weight: 1, score: 90 },
      { id: 'ce5', name: 'CE5', weight: 1, score: 85 },
      { id: 'ce6', name: 'CE6', weight: 1, score: 75 },
      { id: 'ce7', name: 'CE7', weight: 1, score: 100 },
    ],
  };

  const details = computeBlockDetails(block);
  // Total sum = 540, minus 40 = 500. 500 / 6 = 83.33
  assertApprox(details.average!, 83.33, 0.05, 'Drops single worst grade 40 and averages best 6');
  assertEquals(details.droppedScores, [40], 'Dropped score was 40');
  assertEquals(details.usedScores.length, 6, '6 grades used');

  // Partial progress: 6 knowns out of 7 (at least count - dropWorst = 6)
  block.evaluations[6].score = null; // CE7 is empty
  const partialDetails = computeBlockDetails(block, false);
  // Knowns: 40, 70, 80, 90, 85, 75. 40 is dropped. Remaining 5 sum: 400. 400 / 5 = 80.0
  assertApprox(partialDetails.average!, 80.0, 0.05, 'Drops 40 among 6 knowns and averages 5');

  // Partial progress: only 3 knowns (less than count - dropWorst = 6)
  block.evaluations[3].score = null;
  block.evaluations[4].score = null;
  block.evaluations[5].score = null;
  // Knowns: 40, 70, 80. Not enough to drop worst yet: average of all 3 = 190 / 3 = 63.33
  const fewKnowns = computeBlockDetails(block, false);
  assertApprox(fewKnowns.average!, 63.33, 0.05, 'When < 6 knowns, does not drop worst yet');
  assertEquals(fewKnowns.droppedScores.length, 0, 'No dropped scores yet');

  // With treatEmptyAsZero = true: 3 knowns (40, 70, 80) and 4 zeros.
  // One zero is dropped, remaining: 3 zeros and 40, 70, 80 -> sum = 190, 190 / 6 = 31.67
  const zeroDetails = computeBlockDetails(block, true);
  assertApprox(zeroDetails.average!, 31.67, 0.05, 'One zero dropped with treatEmptyAsZero');
  assertEquals(zeroDetails.droppedScores, [0], 'Dropped score is 0');
  console.log('  ✓ Drop worst K calculations passed.');
}

// -------------------------------------------------------------
// Test 3: Algebraic Clearance for Block Minimum
// -------------------------------------------------------------
console.log('\nTest 3: Algebraic Clearance for Block Minimums');
{
  // 3 certamenes, min 50. Student scored C1=40, C2=null, C3=null.
  // Need: (40 + 2*X) / 3 >= 50 => 2*X >= 110 => X >= 55.0
  const pcBlock: SubFormulaBlock = {
    id: 'pc',
    name: 'Certámenes',
    code: 'PC',
    type: 'simple_average',
    prefix: 'C',
    count: 3,
    dropWorstCount: 0,
    minGradeRequired: 50,
    weightInFinal: 0.45,
    evaluations: [
      { id: 'c1', name: 'C1', weight: 1, score: 40 },
      { id: 'c2', name: 'C2', weight: 1, score: null },
      { id: 'c3', name: 'C3', weight: 1, score: null },
    ],
  };

  const reqPC = solveBlockRequiredGrade(pcBlock, 50);
  assertApprox(reqPC!, 55.0, 0.01, 'PC requires 55.0 on C2 and C3 to reach 50');

  // PCE: 7 quizzes, drops 1, min 50.
  // 5 knowns of 50, 2 empty.
  // If X = 50, one 50 is dropped, remaining six 50s average 50.0.
  const pceBlock: SubFormulaBlock = {
    id: 'pce',
    name: 'Controles',
    code: 'PCE',
    type: 'drop_worst',
    prefix: 'CE',
    count: 7,
    dropWorstCount: 1,
    minGradeRequired: 50,
    weightInFinal: 0.1,
    evaluations: [
      { id: 'ce1', name: 'CE1', weight: 1, score: 50 },
      { id: 'ce2', name: 'CE2', weight: 1, score: 50 },
      { id: 'ce3', name: 'CE3', weight: 1, score: 50 },
      { id: 'ce4', name: 'CE4', weight: 1, score: 50 },
      { id: 'ce5', name: 'CE5', weight: 1, score: 50 },
      { id: 'ce6', name: 'CE6', weight: 1, score: null },
      { id: 'ce7', name: 'CE7', weight: 1, score: null },
    ],
  };

  const reqPCE = solveBlockRequiredGrade(pceBlock, 50);
  assertApprox(reqPCE!, 50.0, 0.1, 'PCE requires 50.0 on CE6 and CE7');

  // Impossible case: C1=20, C2=20, C3=null, min 50.
  // Max possible: (20 + 20 + 100) / 3 = 46.67 < 50.
  // Required: (150 - 40) = 110.0 > 100
  pcBlock.evaluations[1].score = 20;
  pcBlock.evaluations[0].score = 20;
  const reqImpossible = solveBlockRequiredGrade(pcBlock, 50);
  assert(reqImpossible !== null && reqImpossible > 100, 'Impossible block requirement exceeds 100');
  console.log('  ✓ Algebraic clearance for block minimums passed.');
}

// -------------------------------------------------------------
// Test 4: USM Penalty Rule Evaluation
// -------------------------------------------------------------
console.log('\nTest 4: USM Penalty Condition Evaluation');
{
  const formula = createInf292FormulaConfig();
  // Case A: All blocks meet 50
  // PCE: 7 quizzes all 60 -> avg 60
  // PC: 3 certamenes all 55 -> avg 55
  // PP: 3 entregas all 90 -> avg 90
  // Weighted: 0.10*60 + 0.45*55 + 0.45*90 = 6 + 24.75 + 40.5 = 71.25 >= 55
  formula.subFormulas[0].evaluations.forEach((e) => (e.score = 60));
  formula.subFormulas[1].evaluations.forEach((e) => (e.score = 55));
  formula.subFormulas[2].evaluations.forEach((e) => (e.score = 90));

  const resultOk = solveSubFormulaCourse(formula);
  assertEquals(resultOk.isPenaltyTriggered, false, 'Penalty does not trigger when all >= 50');
  assertApprox(resultOk.currentFinalGrade, 71.25, 0.1, 'Final grade is formula grade (71.3)');
  assertEquals(resultOk.status, 'APPROVED', 'Status is APPROVED');

  // Case B: PC fails minimum (PC = 45 < 50)
  // Weighted would be: 0.10*60 + 0.45*45 + 0.45*90 = 6 + 20.25 + 40.5 = 66.75 (would normally pass!)
  // BUT USM Penalty forces: NF = min(60, 45, 90) = 45.0 < 55 => REPROBADO!
  formula.subFormulas[1].evaluations.forEach((e) => (e.score = 45));
  const resultPenalty = solveSubFormulaCourse(formula);
  assertEquals(resultPenalty.isPenaltyTriggered, true, 'Penalty triggers when PC = 45 < 50');
  assertEquals(resultPenalty.penaltyGrade, 45.0, 'Penalty grade is min(60, 45, 90) = 45.0');
  assertEquals(resultPenalty.currentFinalGrade, 45.0, 'Final grade is penalized to 45.0');
  assertEquals(resultPenalty.status, 'FAILED', 'Status is FAILED despite 66.8 weighted average');
  assert(resultPenalty.diagnosticMessage.includes('regla de penalización'), 'Message mentions penalty rule');
  console.log('  ✓ USM Penalty rule properly penalizes NF to min(blocks) when a block fails.');
}

// -------------------------------------------------------------
// Test 5: Binding Condition Identification (BLOCK_MIN vs GLOBAL)
// -------------------------------------------------------------
console.log('\nTest 5: Binding Constraint Detection (BLOCK_MIN vs GLOBAL)');
{
  const formula = createInf292FormulaConfig();
  // Scenario where BLOCK_MIN on PC is more demanding than GLOBAL formula:
  // PCE: CE1..CE6 = 60, CE7 = null (avg = 60)
  // PC: C1 = 40, C2 = null, C3 = null (needs 55.0 to reach 50)
  // PP: E1 = 70, E2 = null, E3 = null (needs 40.0 to reach 50)
  // Global formula for NF >= 55 requires uniform score ~54.17
  // But PC minimum strictly requires 55.0!
  for (let i = 0; i < 6; i++) {
    formula.subFormulas[0].evaluations[i].score = 60;
  }
  formula.subFormulas[0].evaluations[6].score = null;

  formula.subFormulas[1].evaluations[0].score = 40;
  formula.subFormulas[1].evaluations[1].score = null;
  formula.subFormulas[1].evaluations[2].score = null;

  formula.subFormulas[2].evaluations[0].score = 70;
  formula.subFormulas[2].evaluations[1].score = null;
  formula.subFormulas[2].evaluations[2].score = null;

  const resBlockBinding = solveSubFormulaCourse(formula);
  assertEquals(resBlockBinding.bindingCondition, 'BLOCK_MIN', 'BLOCK_MIN constraint binds');
  assertEquals(resBlockBinding.bindingBlockCode, 'PC', 'Binding block is PC');
  assertApprox(resBlockBinding.requiredUniformGrade!, 55.0, 0.1, 'Effective required grade is 55.0');
  assert(resBlockBinding.requiredGlobalGrade! < 55.0, 'Global required grade was lower (~54.2)');

  // Scenario where GLOBAL formula is more demanding:
  // PCE: CE1..CE6 = 50, CE7 = null (PCE needs 50)
  // PC: C1 = 60, C2 = null, C3 = null (PC needs 45 to reach 50)
  // PP: E1 = 60, E2 = null, E3 = null (PP needs 45 to reach 50)
  // Block mins only need <= 50, but global formula NF >= 55 requires > 50!
  for (let i = 0; i < 6; i++) {
    formula.subFormulas[0].evaluations[i].score = 50;
  }
  formula.subFormulas[1].evaluations[0].score = 60;
  formula.subFormulas[2].evaluations[0].score = 60;

  const resGlobalBinding = solveSubFormulaCourse(formula);
  assertEquals(resGlobalBinding.bindingCondition, 'GLOBAL', 'GLOBAL formula binds');
  assert(resGlobalBinding.requiredUniformGrade! > 50, 'Required uniform grade is > 50');
  console.log('  ✓ Correctly distinguishes BLOCK_MIN binding vs GLOBAL formula binding.');
}

// -------------------------------------------------------------
// Test 6: Academic Status - APPROVED, IN_DANGER, REQUIRES_PERFECT
// -------------------------------------------------------------
console.log('\nTest 6: Academic Status Spectrum');
{
  const formula = createInf292FormulaConfig();
  // 1. Mathematically Approved:
  // Student scored 95 in CE1..CE7, 95 in C1..C3, 95 in E1, E2. Only E3 is empty.
  formula.subFormulas[0].evaluations.forEach((e) => (e.score = 95));
  formula.subFormulas[1].evaluations.forEach((e) => (e.score = 95));
  formula.subFormulas[2].evaluations[0].score = 95;
  formula.subFormulas[2].evaluations[1].score = 95;
  formula.subFormulas[2].evaluations[2].score = null;

  const resApproved = solveSubFormulaCourse(formula);
  assertEquals(resApproved.status, 'APPROVED', 'Already mathematically approved with 0 in E3');
  assertEquals(resApproved.bindingCondition, 'NONE', 'No binding condition');

  // 2. IN_DANGER (requires > 80):
  // C1=20, E1=40, CE1..CE6=40
  formula.subFormulas[0].evaluations.forEach((e) => (e.score = 40));
  formula.subFormulas[0].evaluations[6].score = null;
  formula.subFormulas[1].evaluations[0].score = 25;
  formula.subFormulas[1].evaluations[1].score = null;
  formula.subFormulas[1].evaluations[2].score = null;
  formula.subFormulas[2].evaluations[0].score = 30;
  formula.subFormulas[2].evaluations[1].score = null;
  formula.subFormulas[2].evaluations[2].score = null;

  const resDanger = solveSubFormulaCourse(formula);
  assert(resDanger.requiredUniformGrade! > 80, 'Required grade > 80');
  assert(
    resDanger.status === 'IN_DANGER' || resDanger.status === 'REQUIRES_PERFECT',
    'Status is IN_DANGER or REQUIRES_PERFECT'
  );

  // 3. REQUIRES_PERFECT (> 100 on PC):
  // C1=10, C2=10, only C3 left. Max PC = (10+10+100)/3 = 40 < 50.
  formula.subFormulas[1].evaluations[0].score = 10;
  formula.subFormulas[1].evaluations[1].score = 10;
  formula.subFormulas[1].evaluations[2].score = null;
  const resImpossible = solveSubFormulaCourse(formula);
  assertEquals(resImpossible.status, 'REQUIRES_PERFECT', 'Status is REQUIRES_PERFECT (> 100 on block min)');
  console.log('  ✓ Status spectrum (APPROVED, ON_TRACK, IN_DANGER, REQUIRES_PERFECT) validated.');
}

// -------------------------------------------------------------
// Test 7: INF-292 Template Structure & Example Scenario
// -------------------------------------------------------------
console.log('\nTest 7: INF-292 Template & Example Scenario');
{
  const infConfig = createInf292CourseConfig();
  assertEquals(infConfig.sigla, 'INF-292', 'Course sigla is INF-292');
  assert(!!infConfig.formulaConfig, 'formulaConfig exists');
  assertEquals(infConfig.formulaConfig?.subFormulas.length, 3, 'Has 3 sub-formulas (PCE, PC, PP)');

  const pce = infConfig.formulaConfig?.subFormulas[0]!;
  assertEquals(pce.code, 'PCE', 'Block 1 is PCE');
  assertEquals(pce.type, 'drop_worst', 'PCE is drop_worst');
  assertEquals(pce.count, 7, 'PCE has 7 evaluations');
  assertEquals(pce.dropWorstCount, 1, 'PCE drops 1 worst score');
  assertEquals(pce.minGradeRequired, 50, 'PCE requires min 50');
  assertEquals(pce.weightInFinal, 0.1, 'PCE weight is 10%');

  const pc = infConfig.formulaConfig?.subFormulas[1]!;
  assertEquals(pc.code, 'PC', 'Block 2 is PC');
  assertEquals(pc.type, 'simple_average', 'PC is simple_average');
  assertEquals(pc.count, 3, 'PC has 3 certamenes');
  assertEquals(pc.minGradeRequired, 50, 'PC requires min 50');
  assertEquals(pc.weightInFinal, 0.45, 'PC weight is 45%');

  const pp = infConfig.formulaConfig?.subFormulas[2]!;
  assertEquals(pp.code, 'PP', 'Block 3 is PP');
  assertEquals(pp.count, 3, 'PP has 3 entregas');
  assertEquals(pp.minGradeRequired, 50, 'PP requires min 50');
  assertEquals(pp.weightInFinal, 0.45, 'PP weight is 45%');

  const exampleScenario = createInf292ExampleScenario();
  const solveExample = solveSubFormulaCourse(exampleScenario.formulaConfig!);
  assert(solveExample.status === 'ON_TRACK', 'Example scenario is ON_TRACK');
  assert(solveExample.requiredUniformGrade! > 0, 'Requires positive score in unknowns');
  console.log('  ✓ INF-292 template specification exactly verified.');
}

// -------------------------------------------------------------
// Test 8: Zustand Store Integration with INF-292
// -------------------------------------------------------------
console.log('\nTest 8: Zustand Store Integration');
{
  const store = useAcademicStore.getState();
  store.resetAll();

  // Test loadInf292Example action
  store.loadInf292Example();
  const enrolledINF292 = useAcademicStore.getState().inProgressCourses['INF-292'];
  assert(!!enrolledINF292, 'INF-292 is enrolled');
  assert(!!enrolledINF292.formulaConfig, 'formulaConfig initialized');
  assertEquals(useAcademicStore.getState().selectedCourseSigla, 'INF-292', 'INF-292 is selected');

  // Test setSubFormulaEvaluationScore action
  store.setSubFormulaEvaluationScore('INF-292', 'pc', 'c2', 85);
  const updatedINF292 = useAcademicStore.getState().inProgressCourses['INF-292'];
  const pcBlock = updatedINF292.formulaConfig?.subFormulas.find((b) => b.code === 'PC');
  const c2Eval = pcBlock?.evaluations.find((e) => e.id === 'c2');
  assertEquals(c2Eval?.score, 85, 'Sub-formula score updated to 85');

  // Verify legacy groups were synchronized
  const pcGroup = updatedINF292.groups.find((g) => g.id === 'pc');
  const c2GroupEval = pcGroup?.evaluations.find((e) => e.id === 'c2');
  assertEquals(c2GroupEval?.score, 85, 'Legacy group evaluation score synchronized to 85');

  // Test getSubFormulaSolveResult getter
  const solveRes = useAcademicStore.getState().getSubFormulaSolveResult('INF-292');
  assert(solveRes !== null, 'Sub-formula solve result is retrieved');
  assert(solveRes!.formulaFinalGrade > 0, 'Formula grade computed');
  console.log('  ✓ Zustand store sub-formula actions and synchronized getters passed.');
}

console.log('\n========================================');
console.log('🎉 ALL SUB-FORMULA ENGINE & STORE TESTS PASSED! 🎉');
console.log('========================================');
