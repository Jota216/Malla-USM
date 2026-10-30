import { Course, CourseStatusDetail } from "@/shared/types/academic";
import { CourseCard } from "./CourseCard";
import { Progress } from "@/frontend/components/ui/progress";

interface SemesterColumnProps {
  semesterNumber: number;
  courses: Course[];
  coursesStatus: Record<string, CourseStatusDetail>;
  areas: Record<string, { nombre: string; color: string }>;
  onOpenDetail: (course: Course) => void;
  onNavigateToSolver?: (sigla: string) => void;
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
];

export function SemesterColumn({
  semesterNumber,
  courses,
  coursesStatus,
  areas,
  onOpenDetail,
  onNavigateToSolver,
}: SemesterColumnProps) {
  const roman = ROMAN_NUMERALS[semesterNumber] || `${semesterNumber}`;

  // Semester metrics
  const totalCourses = courses.length;
  const approvedCount = courses.filter(
    (c) => coursesStatus[c.sigla]?.status === "APPROVED"
  ).length;

  const totalSct = courses.reduce((sum, c) => sum + (c.creditos_sct || 0), 0);
  const totalUsm = courses.reduce((sum, c) => sum + (c.creditos_usm || 0), 0);

  const percent = totalCourses > 0 ? (approvedCount / totalCourses) * 100 : 0;
  const isComplete = totalCourses > 0 && approvedCount === totalCourses;

  return (
    <div className="flex flex-col w-[210px] shrink-0 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl p-2.5 border border-border/80 shadow-2xs">
      {/* Column Header */}
      <div className="pb-2 mb-2 border-b">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-xs tracking-tight text-foreground flex items-center gap-1.5">
            <span
              className={`inline-flex items-center justify-center h-5 w-5 rounded font-black text-[11px] ${
                isComplete
                  ? "bg-emerald-600 text-white"
                  : "bg-[#002B49] text-[#D99B00]"
              }`}
            >
              {roman}
            </span>
            <span>Semestre {roman}</span>
          </h4>

          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isComplete
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {approvedCount}/{totalCourses}
          </span>
        </div>

        {/* Credits subtitle & Progress */}
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <span>{totalSct} SCT | {totalUsm} USM</span>
          <span>{Math.round(percent)}%</span>
        </div>
        <Progress
          value={percent}
          className="h-1 mt-1 bg-slate-200 dark:bg-slate-800"
          indicatorClassName={isComplete ? "bg-emerald-600" : "bg-[#D99B00]"}
        />
      </div>

      {/* Courses List */}
      <div className="flex flex-col space-y-2 flex-1">
        {courses.map((course) => {
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
            />
          );
        })}
      </div>
    </div>
  );
}
