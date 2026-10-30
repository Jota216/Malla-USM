import { Course, CourseStatusDetail } from '@/shared/types/academic';

/**
 * Computes missing prerequisites for a given course against an approved set.
 */
export function getMissingPrerequisites(
  course: Course,
  approvedSiglas: Set<string> | string[]
): string[] {
  const approvedSet = approvedSiglas instanceof Set ? approvedSiglas : new Set(approvedSiglas);
  return course.prerrequisitos.filter((req) => !approvedSet.has(req.trim().toUpperCase()));
}

/**
 * Returns all courses that directly depend on the specified course as a prerequisite.
 */
export function getUnlockedByCourse(sigla: string, allCourses: Course[]): Course[] {
  const normalizedSigla = sigla.trim().toUpperCase();
  return allCourses.filter((c) =>
    c.prerrequisitos.some((p) => p.trim().toUpperCase() === normalizedSigla)
  );
}

/**
 * Returns courses that are currently LOCKED and would become AVAILABLE if `targetSigla` were approved.
 */
export function getDirectlyUnlockedCoursesIfApproved(
  targetSigla: string,
  allCourses: Course[],
  approvedSiglas: Set<string> | string[],
  inProgressSiglas: Set<string> | string[] = new Set()
): Course[] {
  const approvedSet = new Set(
    Array.from(approvedSiglas).map((s) => s.trim().toUpperCase())
  );
  const inProgressSet = new Set(
    Array.from(inProgressSiglas).map((s) => s.trim().toUpperCase())
  );
  const normalizedTarget = targetSigla.trim().toUpperCase();

  // If already approved, it's not going to unlock anything new
  if (approvedSet.has(normalizedTarget)) {
    return [];
  }

  const simulatedApproved = new Set(approvedSet);
  simulatedApproved.add(normalizedTarget);

  return allCourses.filter((course) => {
    const courseSigla = course.sigla.trim().toUpperCase();
    // Cannot unlock a course that is already approved or enrolled
    if (approvedSet.has(courseSigla) || inProgressSet.has(courseSigla)) {
      return false;
    }

    // Must have this target in prerequisites
    const hasTargetInPrereqs = course.prerrequisitos.some(
      (p) => p.trim().toUpperCase() === normalizedTarget
    );
    if (!hasTargetInPrereqs) {
      return false;
    }

    // Must be currently locked (at least one prereq missing)
    const currentMissing = getMissingPrerequisites(course, approvedSet);
    if (currentMissing.length === 0) {
      return false;
    }

    // And must have 0 missing with simulatedApproved
    const newMissing = getMissingPrerequisites(course, simulatedApproved);
    return newMissing.length === 0;
  });
}

/**
 * Computes all ancestor prerequisites (full chain) recursively for a given course.
 */
export function getPrerequisiteChain(sigla: string, allCourses: Course[]): string[] {
  const courseMap = new Map<string, Course>(
    allCourses.map((c) => [c.sigla.trim().toUpperCase(), c])
  );
  const ancestors = new Set<string>();
  const queue = [sigla.trim().toUpperCase()];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const course = courseMap.get(current);
    if (!course) continue;

    for (const prereq of course.prerrequisitos) {
      const normalizedPrereq = prereq.trim().toUpperCase();
      if (!ancestors.has(normalizedPrereq)) {
        ancestors.add(normalizedPrereq);
        queue.push(normalizedPrereq);
      }
    }
  }

  return Array.from(ancestors);
}

/**
 * Validates that the curriculum graph is a Directed Acyclic Graph (DAG) with no circular dependencies.
 * Returns true if valid (acyclic), false if cycle detected.
 */
export function validateGraphAcyclic(allCourses: Course[]): { isAcyclic: boolean; cycleNodes?: string[] } {
  const adj = new Map<string, string[]>();
  for (const course of allCourses) {
    adj.set(course.sigla.trim().toUpperCase(), course.prerrequisitos.map((p) => p.trim().toUpperCase()));
  }

  const visited = new Map<string, 0 | 1 | 2>(); // 0: unvisited, 1: visiting, 2: visited
  const cyclePath: string[] = [];

  function dfs(node: string): boolean {
    visited.set(node, 1);
    cyclePath.push(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      const state = visited.get(neighbor) ?? 0;
      if (state === 1) {
        // Cycle detected
        return false;
      }
      if (state === 0) {
        if (!dfs(neighbor)) return false;
      }
    }

    cyclePath.pop();
    visited.set(node, 2);
    return true;
  }

  for (const course of allCourses) {
    const sigla = course.sigla.trim().toUpperCase();
    if ((visited.get(sigla) ?? 0) === 0) {
      if (!dfs(sigla)) {
        return { isAcyclic: false, cycleNodes: cyclePath };
      }
    }
  }

  return { isAcyclic: true };
}

/**
 * Resolves the full DAG status for all courses in the curriculum.
 */
export function calculateCurriculumGraph(
  allCourses: Course[],
  approvedCourses: Record<string, { grade?: number; semester?: string }> | Set<string> | string[],
  inProgressSiglas: Set<string> | string[] = new Set()
): Record<string, CourseStatusDetail> {
  const approvedMap = new Map<string, { grade?: number; semester?: string }>();

  if (approvedCourses instanceof Set || Array.isArray(approvedCourses)) {
    const list = Array.from(approvedCourses);
    for (const s of list) {
      approvedMap.set(s.trim().toUpperCase(), {});
    }
  } else {
    for (const [s, data] of Object.entries(approvedCourses)) {
      approvedMap.set(s.trim().toUpperCase(), data);
    }
  }

  const inProgressSet = new Set(
    (inProgressSiglas instanceof Set ? Array.from(inProgressSiglas) : inProgressSiglas).map((s) =>
      s.trim().toUpperCase()
    )
  );

  const result: Record<string, CourseStatusDetail> = {};

  for (const course of allCourses) {
    const siglaNorm = course.sigla.trim().toUpperCase();

    // 1. APPROVED check
    if (approvedMap.has(siglaNorm)) {
      const record = approvedMap.get(siglaNorm);
      result[course.sigla] = {
        course,
        status: 'APPROVED',
        missingPrerequisites: [],
        grade: record?.grade,
        semester: record?.semester,
      };
      continue;
    }

    // 2. IN_PROGRESS check
    if (inProgressSet.has(siglaNorm)) {
      result[course.sigla] = {
        course,
        status: 'IN_PROGRESS',
        missingPrerequisites: [],
      };
      continue;
    }

    // 3. Prerequisite resolution for unapproved / not in-progress courses
    const missing = course.prerrequisitos.filter(
      (prereq) => !approvedMap.has(prereq.trim().toUpperCase())
    );

    if (missing.length === 0) {
      result[course.sigla] = {
        course,
        status: 'AVAILABLE',
        missingPrerequisites: [],
      };
    } else {
      result[course.sigla] = {
        course,
        status: 'LOCKED',
        missingPrerequisites: missing,
      };
    }
  }

  return result;
}
