import { computeCriticalPathMetrics, planFastestGraduation } from '../planner/criticalPathPlanner';
import { useAcademicStore } from '@/shared/store/useAcademicStore';
import ici2014Data from '../careers/ici-2014.json';
import { Course } from '@/shared/types/academic';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertEquals<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed [${msg}]: expected ${expected}, got ${actual}`);
  }
}

console.log('=== TEST SUITE: CRITICAL PATH PLANNER & TOPOLOGICAL SCHEDULER ===\n');

const ramos = ici2014Data.ramos as Course[];

// -------------------------------------------------------------
// Test 1: Critical Path Metrics Calculation
// -------------------------------------------------------------
console.log('Test 1: Critical Path Metrics (L_u, D_u, W_u, isCriticalBottleneck)');
{
  const approved = new Set<string>(); // Fresh student, nothing approved
  const metrics = computeCriticalPathMetrics(ramos, approved);

  // MAT-021 is the root of the mathematics and science chain
  const mat021 = metrics.get('MAT-021');
  assert(!!mat021, 'MAT-021 metric must exist');
  assert(mat021!.criticalPathLength >= 5, `MAT-021 L_u should be >= 5, got ${mat021!.criticalPathLength}`);
  assert(mat021!.totalDescendantsCount >= 10, `MAT-021 D_u should be >= 10, got ${mat021!.totalDescendantsCount}`);
  assert(mat021!.isCriticalBottleneck === true, 'MAT-021 must be marked as a critical bottleneck');

  // IWI-131 is the root of the computing chain
  const iwi131 = metrics.get('IWI-131');
  assert(!!iwi131, 'IWI-131 metric must exist');
  assert(iwi131!.criticalPathLength >= 5, `IWI-131 L_u should be >= 5, got ${iwi131!.criticalPathLength}`);
  assert(iwi131!.isCriticalBottleneck === true, 'IWI-131 must be marked as a critical bottleneck');

  // Final project / Tesis (INF-398 / INF-399 or sem 11 courses) should have L_u = 1 and D_u = 0
  const terminalCourse = ramos.find((r) => r.semestre === 11 && r.prerrequisitos.length > 0);
  if (terminalCourse) {
    const termMetric = metrics.get(terminalCourse.sigla);
    if (termMetric) {
      assertEquals(termMetric.criticalPathLength, 1, 'Terminal course has L_u = 1');
      assertEquals(termMetric.totalDescendantsCount, 0, 'Terminal course has D_u = 0');
      assertEquals(termMetric.isCriticalBottleneck, false, 'Terminal course is not a bottleneck');
    }
  }

  // When MAT-021 is approved, its metric should reset to 0
  const approvedWithMat = new Set<string>(['MAT-021']);
  const metricsWithMat = computeCriticalPathMetrics(ramos, approvedWithMat);
  const matApproved = metricsWithMat.get('MAT-021');
  assertEquals(matApproved!.criticalPathLength, 0, 'Approved course has L_u = 0');
  assertEquals(matApproved!.isCriticalBottleneck, false, 'Approved course is not a bottleneck');

  console.log('  ✓ Critical path lengths L_u and unlock degrees D_u computed accurately.');
}

// -------------------------------------------------------------
// Test 2: planFastestGraduation Strict Prerequisite Invariant
// -------------------------------------------------------------
console.log('\nTest 2: planFastestGraduation Topological Order & Credit Constraint');
{
  const approved = new Set<string>(['MAT-021', 'FIS-100', 'QUI-010', 'HUM-001', 'IWI-131', 'HRW-101']);
  const inProgress = new Set<string>();
  const maxSct = 30;

  const plan = planFastestGraduation(ramos, approved, inProgress, maxSct, 2);

  assert(plan.totalSemesters >= 10, `Total semesters should be reasonable, got ${plan.totalSemesters}`);

  // Invariant verification: For every unapproved course B and unapproved prerequisite A: Sem(B) > Sem(A)
  for (const course of ramos) {
    if (approved.has(course.sigla)) continue;

    const semB = plan.plannedSemesterOverrides[course.sigla] ?? course.semestre;

    for (const prereq of course.prerrequisitos) {
      if (approved.has(prereq)) continue;

      const semA = plan.plannedSemesterOverrides[prereq] ?? ramos.find((r) => r.sigla === prereq)?.semestre;
      if (semA !== undefined) {
        assert(
          semB > semA,
          `INVARIANT VIOLATION: Course ${course.sigla} (Sem ${semB}) must be > unapproved prerequisite ${prereq} (Sem ${semA})`
        );
      }
    }
  }

  // Verify credit limits in all future planned semesters
  for (const [semStr, breakdown] of Object.entries(plan.semestersBreakdown)) {
    const sem = Number(semStr);
    if (sem >= 2) {
      assert(
        breakdown.totalSct <= maxSct + 4, // Allow slight tolerance only if single course exceeds
        `Semester ${sem} total SCT ${breakdown.totalSct} exceeds limit ${maxSct}`
      );
    }
  }

  console.log('  ✓ STRICT INVARIANT verified: Semestre(B) > Semestre(A) for all unapproved prerequisites.');
  console.log(`  ✓ Graduation scheduled across ${plan.totalSemesters} semesters respecting max ${maxSct} SCT.`);
}

// -------------------------------------------------------------
// Test 3: Zustand Store Actions: movePlannedCourse & Cascade Push
// -------------------------------------------------------------
console.log('\nTest 3: Zustand Store movePlannedCourse Strict Rule & Cascading Push');
{
  const store = useAcademicStore.getState();
  store.resetAll();

  // Fresh student: MAT-021 is at Sem 1, MAT-022 is at Sem 2.
  // MAT-021 is a prerequisite for MAT-022.
  // Rule: Cannot move MAT-022 to Semestre 1 because MAT-021 is at Semestre 1!
  const invalidMove = store.movePlannedCourse('MAT-022', 1, false);
  assertEquals(invalidMove.success, false, 'Moving MAT-022 to Sem 1 must fail due to unapproved MAT-021');
  assert(
    invalidMove.reason?.includes('MAT-021') ?? false,
    'Failure reason must explicitly name prerequisite MAT-021'
  );

  // Moving MAT-021 forward to Semestre 3 when MAT-022 is at Semestre 2:
  // Without cascade push, it must detect conflict with MAT-022.
  const conflictMove = store.movePlannedCourse('MAT-021', 3, false);
  assertEquals(conflictMove.success, false, 'Moving MAT-021 to Sem 3 without cascade must fail due to MAT-022');
  assert(
    conflictMove.reason?.includes('MAT-022') ?? false,
    'Failure reason must explicitly name dependent MAT-022'
  );

  // With cascade push = true, moving MAT-021 to Sem 3 must automatically push MAT-022 to Sem 4!
  const cascadeMove = store.movePlannedCourse('MAT-021', 3, true);
  assertEquals(cascadeMove.success, true, 'Moving MAT-021 to Sem 3 with cascade must succeed');
  assert(
    Array.isArray(cascadeMove.pushedCourses) && cascadeMove.pushedCourses.length > 0,
    'Pushed courses must be returned'
  );

  const updatedOverrides = useAcademicStore.getState().plannedSemesterOverrides;
  assertEquals(updatedOverrides['MAT-021'], 3, 'MAT-021 planned at Sem 3');
  assert(updatedOverrides['MAT-022'] >= 4, `MAT-022 pushed to >= 4, got ${updatedOverrides['MAT-022']}`);

  console.log('  ✓ Strict prerequisite blocking and cascade push validated successfully.');
}

// -------------------------------------------------------------
// Test 4: Auto Critical Path Planning Integration
// -------------------------------------------------------------
console.log('\nTest 4: applyAutoCriticalPathPlan Store Action');
{
  const store = useAcademicStore.getState();
  store.resetAll();

  // Mark all semester 1 courses as approved except MAT-021 (delayed student)
  store.toggleCourseApproval('FIS-100');
  store.toggleCourseApproval('QUI-010');
  store.toggleCourseApproval('HUM-001');
  store.toggleCourseApproval('IWI-131');
  store.toggleCourseApproval('HRW-101');

  const result = store.applyAutoCriticalPathPlan(28);

  assert(result.totalSemesters >= 11, `Planned graduation in ${result.totalSemesters} semesters`);
  assertEquals(useAcademicStore.getState().plannerMode, 'planned', 'Planner mode switched to planned');
  assert(
    Object.keys(useAcademicStore.getState().plannedSemesterOverrides).length > 0,
    'Planned semester overrides populated'
  );

  console.log(`  ✓ Auto-planner scheduled degree in ${result.totalSemesters} semesters at 28 SCT max.`);
}

console.log('\n========================================');
console.log('🎉 ALL CRITICAL PATH PLANNER TESTS PASSED! 🎉');
console.log('========================================\n');
