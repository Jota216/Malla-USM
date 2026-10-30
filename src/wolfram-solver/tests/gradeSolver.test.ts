import { solveCourseStatus, rebalanceSliders, normalizeWeights } from '@/wolfram-solver/engine/gradeSolver';
import {
  calculateCurriculumGraph,
  getUnlockedByCourse,
  getDirectlyUnlockedCoursesIfApproved,
  validateGraphAcyclic,
  getPrerequisiteChain,
} from '@/curricula/prerequisites/graphUnlock';
import { createDefaultCourseConfig } from '@/wolfram-solver/templates/defaultTemplates';
import ici2014Data from '@/curricula/careers/ici-2014.json';
import { Course } from '@/shared/types/academic';

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

console.log('=== RUNNING TESTS FOR USM MALLA & GRADE SOLVER ===\n');

// -------------------------------------------------------------
// 1. Weight Normalization Tests
// -------------------------------------------------------------
console.log('Test 1: Weight Normalization');
{
  const norm1 = normalizeWeights([70, 30]);
  assertApprox(norm1[0], 0.7, 0.001, 'Weight 70% normalized to 0.7');
  assertApprox(norm1[1], 0.3, 0.001, 'Weight 30% normalized to 0.3');

  const norm2 = normalizeWeights([33.3, 33.3, 33.4]);
  assertApprox(norm2.reduce((a, b) => a + b, 0), 1.0, 0.001, 'Three certámenes weights sum to 1.0');

  const norm3 = normalizeWeights([0.5, 0.5]);
  assertApprox(norm3[0], 0.5, 0.001, 'Fractions preserved');
  console.log('  ✓ Normalization works accurately.');
}

// -------------------------------------------------------------
// 2. Grade Solver: Standard passing calculation
// -------------------------------------------------------------
console.log('\nTest 2: Standard Course Grade Solve');
{
  // Bloque 1: Certamenes (70%) -> C1 (33.33%), C2 (33.33%), C3 (33.34%), minGrade: 50
  // Bloque 2: Tareas (30%) -> T1 (50%), T2 (50%), minGrade: null
  const config = createDefaultCourseConfig('INF-253');
  // Student scored C1=55, C2=55, T1=55
  config.groups[0].evaluations[0].score = 55;
  config.groups[0].evaluations[1].score = 55;
  config.groups[1].evaluations[0].score = 55;

  const result = solveCourseStatus(config);
  assert(result.status === 'ON_TRACK', `Expected ON_TRACK, got ${result.status}`);
  // If student scored 55 in everything so far, they need exactly 55 in C3 and T2 to get 55
  assertApprox(result.requiredGlobalGrade!, 55, 0.2, 'Uniform required grade for 55 is ~55');
  console.log(`  ✓ Solver correctly computed required grade: ${result.requiredGlobalGrade} (status: ${result.status})`);
}

// -------------------------------------------------------------
// 3. Grade Solver: Group Minimum "Sudden-Death" Constraint
// -------------------------------------------------------------
console.log('\nTest 3: Group Minimum Binding Constraint');
{
  const config = createDefaultCourseConfig('INF-253');
  // Tareas: 100 on both T1 and T2!
  // Tareas are 30% of final grade, so student already has 30 points accumulated!
  config.groups[1].evaluations[0].score = 100;
  config.groups[1].evaluations[1].score = 100;

  // Certámenes: student got 40 in C1, C2 and C3 are unknown.
  // Group requirement for Certámenes is 50!
  config.groups[0].evaluations[0].score = 40;

  const result = solveCourseStatus(config);
  // To reach global 55:
  // Points needed = 55 - 30 - (0.7 * (1/3) * 40) = 25 - 9.33 = 15.67
  // Remaining global weight in C2 and C3 = 0.7 * (2/3) = 0.4667
  // X_global = 15.67 / 0.4667 = ~33.6
  assertApprox(result.requiredGlobalGrade!, 33.6, 0.5, 'Global needed grade is ~33.6');

  // BUT for Certámenes group to average 50:
  // (40 + C2 + C3)/3 >= 50 => C2 + C3 >= 110 => average in C2 and C3 must be >= 55!
  const certGroup = result.groups.find((g) => g.groupId === 'certamenes')!;
  assertApprox(certGroup.requiredGradeForMin!, 55, 0.5, 'Certamenes group needs ~55');

  // Therefore, the binding constraint MUST be GROUP_MIN!
  assertEquals(result.bindingConstraint, 'GROUP_MIN', 'Binding constraint should be GROUP_MIN');
  assertApprox(result.effectiveRequiredGrade!, 55, 0.5, 'Effective required grade is 55 due to group minimum');
  console.log(`  ✓ Group sudden-death constraint identified! Binding: ${result.bindingConstraint}, required: ${result.effectiveRequiredGrade}`);
}

// -------------------------------------------------------------
// 4. Grade Solver: Certamen Recuperativo Substitution
// -------------------------------------------------------------
console.log('\nTest 4: Certamen Recuperativo Substitution');
{
  const config = createDefaultCourseConfig('INF-253');
  config.groups[0].evaluations[0].score = 25; // C1 = 25 (failed)
  config.groups[0].evaluations[1].score = 60; // C2 = 60
  config.groups[0].evaluations[2].score = 55; // C3 = 55
  config.groups[1].evaluations[0].score = 70; // T1 = 70
  config.groups[1].evaluations[1].score = 70; // T2 = 70

  // Without recovery exam:
  const resultBefore = solveCourseStatus(config);
  // Certamen average is (25 + 60 + 55)/3 = 46.67 < 50 minimum!
  assert(resultBefore.status === 'REQUIRES_RECOVERY' || resultBefore.status === 'FAILED', 'Fails group min without recovery');

  // Now student takes recuperative exam and scores 75:
  config.groups[0].recoveryGrade = 75;
  const resultAfter = solveCourseStatus(config);

  const certGroup = resultAfter.groups.find((g) => g.groupId === 'certamenes')!;
  assert(certGroup.recoveryApplied, 'Recovery should be applied');
  assertEquals(certGroup.replacedEvaluationId, 'c1', 'Should replace c1 (lowest grade)');
  assertEquals(certGroup.originalReplacedGrade, 25, 'Original grade replaced was 25');
  // New certamen average is (75 + 60 + 55)/3 = 63.33 >= 50!
  assertApprox(certGroup.currentAverage!, 63.3, 0.2, 'New certamen average is 63.3');
  assertEquals(resultAfter.status, 'APPROVED', 'Course is approved after recovery exam');
  console.log(`  ✓ Recovery exam replaced lowest grade (25 -> 75) and course status became ${resultAfter.status}!`);
}

// -------------------------------------------------------------
// 5. Grade Solver: Slider Dynamic Rebalance
// -------------------------------------------------------------
console.log('\nTest 5: Interactive Slider Dynamic Rebalance');
{
  const config = createDefaultCourseConfig('INF-253');
  // C1 = 45, T1 = 70.
  // Unknowns are C2, C3, and T2.
  config.groups[0].evaluations[0].score = 45;
  config.groups[1].evaluations[0].score = 70;

  // Student fixes C2 slider to 70:
  const rebalance1 = rebalanceSliders(config, { c2: 70 });
  // The solver redistributes required points among C3 and T2 so simulated NF == 55
  assertApprox(rebalance1.simulatedFinalGrade, 55, 0.5, 'Simulated grade is exactly 55');
  assert(rebalance1.otherUnknownsRequiredGrade !== null, 'Calculated required grade for other unknowns');
  console.log(`  ✓ Slider rebalance kept NF = 55. Other unknowns need: ${rebalance1.otherUnknownsRequiredGrade}`);
}

// -------------------------------------------------------------
// 6. Grade Solver: Mathematically Approved with 0 in rest
// -------------------------------------------------------------
console.log('\nTest 6: Mathematically Approved');
{
  const config = createDefaultCourseConfig('INF-253');
  // C1 = 90, C2 = 90 (average is 60 already even if C3=0, which is >= 50 minimum)
  // T1 = 100, T2 = 100
  config.groups[0].evaluations[0].score = 90;
  config.groups[0].evaluations[1].score = 90;
  config.groups[1].evaluations[0].score = 100;
  config.groups[1].evaluations[1].score = 100;

  const result = solveCourseStatus(config);
  assertEquals(result.status, 'APPROVED', 'Should be mathematically APPROVED even with C3 unknown');
  console.log(`  ✓ Mathematically approved detected! Accumulated: ${result.accumulatedPoints} pts, status: ${result.status}`);
}

// -------------------------------------------------------------
// 7. DAG Graph Prerequisite Tests with ICI 2014 Data
// -------------------------------------------------------------
console.log('\nTest 7: DAG Prerequisite Resolution');
{
  const allCourses = ici2014Data.ramos as Course[];
  assertEquals(allCourses.length, 59, '59 courses in ICI 2014 curriculum');

  // Verify graph is acyclic
  const acyclicCheck = validateGraphAcyclic(allCourses);
  assert(acyclicCheck.isAcyclic, 'ICI 2014 curriculum graph must be strictly acyclic (DAG)');
  console.log('  ✓ Graph acyclicity confirmed (no circular prerequisite loops).');

  // Initial state: No courses approved
  const initialGraph = calculateCurriculumGraph(allCourses, {});

  // First semester courses should be AVAILABLE
  assertEquals(initialGraph['IWI-131'].status, 'AVAILABLE', 'IWI-131 must be AVAILABLE initially');
  assertEquals(initialGraph['MAT-021'].status, 'AVAILABLE', 'MAT-021 must be AVAILABLE initially');
  assertEquals(initialGraph['FIS-100'].status, 'AVAILABLE', 'FIS-100 must be AVAILABLE initially');

  // Second semester courses should be LOCKED
  assertEquals(initialGraph['MAT-022'].status, 'LOCKED', 'MAT-022 must be LOCKED initially');
  assertEquals(initialGraph['MAT-022'].missingPrerequisites, ['MAT-021'], 'MAT-022 missing MAT-021');

  // FIS-110 requires MAT-021 and FIS-100
  assertEquals(initialGraph['FIS-110'].status, 'LOCKED', 'FIS-110 must be LOCKED');
  assert(initialGraph['FIS-110'].missingPrerequisites.includes('MAT-021'), 'FIS-110 missing MAT-021');
  assert(initialGraph['FIS-110'].missingPrerequisites.includes('FIS-100'), 'FIS-110 missing FIS-100');

  // Now simulate approving MAT-021:
  const graphWithMat021 = calculateCurriculumGraph(allCourses, { 'MAT-021': { grade: 75 } });
  assertEquals(graphWithMat021['MAT-021'].status, 'APPROVED', 'MAT-021 is APPROVED');
  assertEquals(graphWithMat021['MAT-022'].status, 'AVAILABLE', 'MAT-022 becomes AVAILABLE when MAT-021 is approved');
  // FIS-110 should still be LOCKED because FIS-100 is still missing
  assertEquals(graphWithMat021['FIS-110'].status, 'LOCKED', 'FIS-110 is still LOCKED');
  assertEquals(graphWithMat021['FIS-110'].missingPrerequisites, ['FIS-100'], 'FIS-110 missing only FIS-100');

  // Test getUnlockedByCourse
  const unlockedByIwi131 = getUnlockedByCourse('IWI-131', allCourses).map((c) => c.sigla);
  assert(unlockedByIwi131.includes('INF-134'), 'IWI-131 unlocks INF-134');
  assert(unlockedByIwi131.includes('INF-152'), 'IWI-131 unlocks INF-152');
  assert(unlockedByIwi131.includes('INF-280'), 'IWI-131 unlocks INF-280');
  assert(unlockedByIwi131.includes('INF-292'), 'IWI-131 unlocks INF-292');
  console.log(`  ✓ getUnlockedByCourse('IWI-131') returned ${unlockedByIwi131.join(', ')}.`);

  // Test getDirectlyUnlockedCoursesIfApproved
  const directUnlocks = getDirectlyUnlockedCoursesIfApproved('MAT-021', allCourses, new Set());
  // Approving MAT-021 unlocks MAT-022 (because MAT-022 only needs MAT-021).
  // FIS-110 is NOT in directUnlocks because FIS-100 is still missing!
  const directSiglas = directUnlocks.map((c) => c.sigla);
  assert(directSiglas.includes('MAT-022'), 'MAT-022 is directly unlocked by MAT-021');
  assert(!directSiglas.includes('FIS-110'), 'FIS-110 is NOT directly unlocked because FIS-100 is also needed');
  console.log(`  ✓ getDirectlyUnlockedCoursesIfApproved('MAT-021') returned: ${directSiglas.join(', ')}.`);

  // Test getPrerequisiteChain
  const chainInf236 = getPrerequisiteChain('INF-236', allCourses);
  // INF-236 requires INF-239 and INF-253. Both require INF-134. INF-134 requires IWI-131.
  assert(chainInf236.includes('INF-239'), 'Chain has INF-239');
  assert(chainInf236.includes('INF-253'), 'Chain has INF-253');
  assert(chainInf236.includes('INF-134'), 'Chain has INF-134');
  assert(chainInf236.includes('IWI-131'), 'Chain has IWI-131');
  console.log(`  ✓ getPrerequisiteChain('INF-236') computed full ancestral tree: ${chainInf236.join(' <- ')}.`);
}

// -------------------------------------------------------------
// 8. Zustand Academic Store Tests
// -------------------------------------------------------------
console.log('\nTest 8: Zustand Store Actions & Selectors');
{
  const { useAcademicStore } = await import('@/shared/store/useAcademicStore');
  const store = useAcademicStore.getState();

  // Reset store
  store.resetAll();

  // Initially: 0 credits approved, 0% progress
  let stats = useAcademicStore.getState().getStatistics();
  assertEquals(stats.sctCreditsApproved, 0, 'Initial SCT credits approved is 0');
  assertEquals(stats.percentProgress, 0, 'Initial percent progress is 0');

  // Toggle approval for MAT-021 (grade: 80, credits_sct: 8, credits_usm: 5)
  useAcademicStore.getState().toggleCourseApproval('MAT-021', 80);
  stats = useAcademicStore.getState().getStatistics();
  assertEquals(stats.sctCreditsApproved, 8, 'MAT-021 gives 8 SCT credits');
  assertEquals(stats.usmCreditsApproved, 5, 'MAT-021 gives 5 USM credits');
  assertEquals(stats.gpa, 80, 'GPA is 80 with single course');

  // Toggle approval for IWI-131 (grade: 60, credits_sct: 5, credits_usm: 3)
  useAcademicStore.getState().toggleCourseApproval('IWI-131', 60);
  stats = useAcademicStore.getState().getStatistics();
  assertEquals(stats.sctCreditsApproved, 13, 'Total 13 SCT credits approved');
  assertEquals(stats.usmCreditsApproved, 8, 'Total 8 USM credits approved');
  // Weighted GPA: (80*8 + 60*5) / (8+5) = (640 + 300) / 13 = 940 / 13 = 72.3
  assertApprox(stats.gpa, 72.3, 0.2, 'Weighted GPA is ~72.3');

  // Check DAG status reactively
  const statusMap = useAcademicStore.getState().getCoursesStatus();
  assertEquals(statusMap['MAT-021'].status, 'APPROVED', 'MAT-021 is APPROVED');
  assertEquals(statusMap['IWI-131'].status, 'APPROVED', 'IWI-131 is APPROVED');
  // MAT-022 should now be AVAILABLE
  assertEquals(statusMap['MAT-022'].status, 'AVAILABLE', 'MAT-022 is AVAILABLE');
  // INF-134 should now be AVAILABLE (prereq was IWI-131)
  assertEquals(statusMap['INF-134'].status, 'AVAILABLE', 'INF-134 is AVAILABLE');

  // Enroll in INF-134 (moves to inProgressCourses with default template)
  useAcademicStore.getState().enrollCourse('INF-134');
  const inProgressStatus = useAcademicStore.getState().getCoursesStatus();
  assertEquals(inProgressStatus['INF-134'].status, 'IN_PROGRESS', 'INF-134 is IN_PROGRESS');

  // Set grades in INF-134
  useAcademicStore.getState().setEvaluationScore('INF-134', 'certamenes', 'c1', 70);
  const enrolledConfig = useAcademicStore.getState().inProgressCourses['INF-134'];
  assertEquals(enrolledConfig.groups[0].evaluations[0].score, 70, 'C1 grade recorded as 70');

  // Check solve result for enrolled course
  const solveRes = useAcademicStore.getState().getCourseSolveResult('INF-134');
  assert(solveRes !== null, 'Solver returned result for INF-134');
  assertEquals(solveRes!.status, 'ON_TRACK', 'INF-134 is ON_TRACK');

  // Test Export and Import JSON backup
  const exported = useAcademicStore.getState().exportJSON();
  assert(exported.includes('INF-134'), 'Backup includes enrolled INF-134');
  assert(exported.includes('MAT-021'), 'Backup includes approved MAT-021');

  // Reset all
  useAcademicStore.getState().resetAll();
  assertEquals(useAcademicStore.getState().getStatistics().sctCreditsApproved, 0, 'Reset cleared approved credits');

  // Import JSON backup
  const importOk = useAcademicStore.getState().importJSON(exported);
  assert(importOk, 'Import JSON succeeded');
  const restoredStats = useAcademicStore.getState().getStatistics();
  assertEquals(restoredStats.sctCreditsApproved, 13, 'Import restored 13 SCT credits');

  console.log('  ✓ Zustand store actions, DAG integration, solver query & JSON backup passed!');
}

console.log('\n========================================');
console.log('🎉 ALL ENGINE & GRAPH TESTS PASSED SUCCESSFULLY! 🎉');
console.log('========================================\n');
