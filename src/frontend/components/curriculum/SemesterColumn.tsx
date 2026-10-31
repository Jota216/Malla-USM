import { useState } from "react";
import { Course, CourseStatusDetail } from "@/shared/types/academic";
import { CriticalPathMetric } from "@/curricula/planner/criticalPathPlanner";
import { CourseCard } from "./CourseCard";
import { Progress } from "@/frontend/components/ui/progress";
import { CheckCheck, AlertTriangle, Calendar } from "lucide-react";

interface SemesterColumnProps {
  semesterNumber: number;
  courses: Course[];
  coursesStatus: Record<string, CourseStatusDetail>;
  areas: Record<string, { nombre: string; color: string }>;
  onOpenDetail: (course: Course) => void;
  onNavigateToSolver?: (sigla: string) => void;
  onToggleSemesterApproval?: (semesterNumber: number) => void;
  isPlannedMode?: boolean;
  maxCreditsSct?: number;
  criticalMetrics?: Map<string, CriticalPathMetric>;
  totalPlannedSemesters?: number;
  onMoveCourse?: (sigla: string, targetSemester: number, cascadePush?: boolean) => void;
  onCourseDrop?: (sigla: string, targetSemester: number) => void;
  conflictingSiglas?: Set<string>;
}

const ROMAN_NUMERALS = [
  "",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
  "XVII",
  "XVIII",
  "XIX",
  "XX",
];

export function SemesterColumn({
  semesterNumber,
  courses,
  coursesStatus,
  areas,
  onOpenDetail,
  onNavigateToSolver,
  onToggleSemesterApproval,
  isPlannedMode = false,
  maxCreditsSct = 30,
  criticalMetrics,
  totalPlannedSemesters = 11,
  onMoveCourse,
  onCourseDrop,
  conflictingSiglas,
}: SemesterColumnProps) {
  const roman = ROMAN_NUMERALS[semesterNumber] || `${semesterNumber}`;
  const [isDragOver, setIsDragOver] = useState(false);

  // Semester metrics
  const totalCourses = courses.length;
  const approvedCount = courses.filter(
    (c) => coursesStatus[c.sigla]?.status === "APPROVED"
  ).length;

  const totalSct = courses.reduce((sum, c) => sum + (c.creditos_sct || 0), 0);
  const totalUsm = courses.reduce((sum, c) => sum + (c.creditos_usm || 0), 0);

  const percent = totalCourses > 0 ? (approvedCount / totalCourses) * 100 : 0;
  const isComplete = totalCourses > 0 && approvedCount === totalCourses;
  const isOverCreditLimit = isPlannedMode && totalSct > maxCreditsSct;

  return (
    <div
      onDragOver={(e) => {
        if (!isPlannedMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isDragOver) setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!isPlannedMode) return;
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        if (!isPlannedMode) return;
        e.preventDefault();
        setIsDragOver(false);
        const sigla = e.dataTransfer.getData("text/plain");
        if (sigla && onCourseDrop) {
          onCourseDrop(sigla, semesterNumber);
        }
      }}
      className={`flex flex-col w-[215px] shrink-0 rounded-xl p-2.5 border shadow-2xs transition-all ${
        isDragOver
          ? "border-dashed border-2 border-[#D99B00] bg-[#D99B00]/10 ring-2 ring-[#D99B00]/30 shadow-md"
          : isOverCreditLimit
          ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
          : "bg-slate-50/70 dark:bg-slate-900/40 border-border/80"
      }`}
    >
      {/* Column Header */}
      <div className="pb-2 mb-2 border-b">
        <div className="flex items-center justify-between gap-1">
          <h4 className="font-extrabold text-xs tracking-tight text-foreground flex items-center gap-1.5">
            <span
              className={`inline-flex items-center justify-center h-5 w-5 rounded font-black text-[11px] ${
                isComplete
                  ? "bg-emerald-600 text-white"
                  : isPlannedMode
                  ? "bg-[#D99B00] text-[#002B49]"
                  : "bg-[#002B49] text-[#D99B00]"
              }`}
            >
              {roman}
            </span>
            <span>Semestre {roman}</span>
          </h4>

          <div className="flex items-center gap-1">
            {onToggleSemesterApproval && totalCourses > 0 && !isPlannedMode && (
              <button
                type="button"
                onClick={() => onToggleSemesterApproval(semesterNumber)}
                className={`inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-semibold border transition-colors ${
                  isComplete
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40"
                    : "bg-background/80 text-muted-foreground border-border hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40"
                }`}
                title={
                  isComplete
                    ? `Desmarcar todos los ramos del Semestre ${roman}`
                    : `Marcar todo el Semestre ${roman} como aprobado`
                }
              >
                <CheckCheck className="h-3 w-3" />
              </button>
            )}

            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isComplete
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : isOverCreditLimit
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {approvedCount}/{totalCourses}
            </span>
          </div>
        </div>

        {/* Credits subtitle & Progress */}
        <div className="mt-1 flex items-center justify-between text-[10px] font-medium">
          <span
            className={
              isOverCreditLimit
                ? "text-amber-700 dark:text-amber-300 font-bold flex items-center gap-0.5"
                : "text-muted-foreground"
            }
          >
            {isOverCreditLimit && <AlertTriangle className="h-3 w-3 inline text-amber-500" />}
            {totalSct} SCT | {totalUsm} USM
            {isPlannedMode && (
              <span className="text-[9px] opacity-75 font-normal ml-0.5">
                (máx {maxCreditsSct})
              </span>
            )}
          </span>
          <span className="text-muted-foreground">{Math.round(percent)}%</span>
        </div>
        <Progress
          value={percent}
          className="h-1 mt-1 bg-slate-200 dark:bg-slate-800"
          indicatorClassName={isComplete ? "bg-emerald-600" : isPlannedMode ? "bg-[#D99B00]" : "bg-[#002B49]"}
        />
      </div>

      {/* Courses List */}
      <div className="flex flex-col space-y-2 flex-1">
        {courses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-3 text-center border border-dashed border-border/70 rounded-lg my-2 min-h-[90px]">
            <Calendar className="h-4 w-4 text-muted-foreground/60 mb-1" />
            <span className="text-[11px] text-muted-foreground italic">
              {isPlannedMode ? "Semestre sin asignaturas. Puedes mover ramos aquí." : "Sin asignaturas"}
            </span>
          </div>
        ) : (
          courses.map((course) => {
            const detail = coursesStatus[course.sigla] || {
              course,
              status: "AVAILABLE",
              missingPrerequisites: [],
            };
            const area = areas[course.area] || {
              nombre: course.area,
              color: "#64748B",
            };

            return (
              <CourseCard
                key={course.sigla}
                course={course}
                statusDetail={detail}
                areaColor={area.color}
                onOpenDetail={onOpenDetail}
                onNavigateToSolver={onNavigateToSolver}
                isPlannedMode={isPlannedMode}
                plannedSemester={semesterNumber}
                criticalMetric={criticalMetrics?.get(course.sigla)}
                totalPlannedSemesters={totalPlannedSemesters}
                onMoveCourse={onMoveCourse}
                hasConflict={conflictingSiglas?.has(course.sigla)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
