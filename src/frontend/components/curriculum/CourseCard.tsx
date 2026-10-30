import * as React from "react";
import { Course, CourseStatusDetail } from "@/shared/types/academic";
import { useAcademicStore } from "@/shared/store/useAcademicStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/frontend/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/frontend/components/ui/dropdown-menu";
import { getUnlockedByCourse } from "@/curricula/prerequisites/graphUnlock";
import {
  CheckCircle2,
  Lock,
  MoreVertical,
  PlayCircle,
  Sparkles,
  Info,
  BookOpen,
  Award,
} from "lucide-react";

interface CourseCardProps {
  course: Course;
  statusDetail: CourseStatusDetail;
  areaColor: string;
  onOpenDetail: (course: Course) => void;
  onNavigateToSolver?: (sigla: string) => void;
}

export function CourseCard({
  course,
  statusDetail,
  areaColor,
  onOpenDetail,
  onNavigateToSolver,
}: CourseCardProps) {
  const {
    curriculum,
    toggleCourseApproval,
    enrollCourse,
    unenrollCourse,
  } = useAcademicStore();

  const status = statusDetail.status;
  const grade = statusDetail.grade;
  const missingPrereqs = statusDetail.missingPrerequisites;

  // Courses directly unlocked by this one
  const unlocked = React.useMemo(() => {
    return getUnlockedByCourse(course.sigla, curriculum.ramos);
  }, [course.sigla, curriculum.ramos]);

  const handleCardClick = (e: React.MouseEvent) => {
    // If click originates from the dropdown trigger or inside dropdown, don't trigger card action
    if ((e.target as HTMLElement).closest("[data-no-card-click]")) {
      return;
    }

    if (status === "LOCKED") {
      onOpenDetail(course);
      return;
    }

    if (status === "AVAILABLE" || status === "IN_PROGRESS" || status === "APPROVED") {
      toggleCourseApproval(course.sigla);
    }
  };

  const handleQuickApproveGrade = (customGrade?: number) => {
    toggleCourseApproval(course.sigla, customGrade);
  };

  const handleToggleEnroll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === "IN_PROGRESS") {
      unenrollCourse(course.sigla);
    } else {
      enrollCourse(course.sigla);
    }
  };

  // Border & background based on status and area color
  let statusCardStyle = "border-slate-200 bg-card hover:border-slate-400 dark:border-slate-800";
  if (status === "APPROVED") {
    statusCardStyle =
      "border-emerald-500/80 bg-emerald-500/10 dark:bg-emerald-950/20 text-foreground shadow-xs";
  } else if (status === "IN_PROGRESS") {
    statusCardStyle =
      "border-sky-500 bg-sky-500/10 dark:bg-sky-950/20 shadow-xs ring-1 ring-sky-500/40";
  } else if (status === "AVAILABLE") {
    statusCardStyle =
      "border-slate-300 dark:border-slate-700 bg-card hover:border-[#002B49] dark:hover:border-[#D99B00] hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5";
  } else if (status === "LOCKED") {
    statusCardStyle =
      "opacity-45 bg-muted/40 border-dashed border-slate-300 dark:border-slate-800 cursor-not-allowed select-none";
  }

  return (
    <TooltipProvider delayDuration={350}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={handleCardClick}
            className={`group relative flex flex-col justify-between rounded-lg p-2.5 transition-all text-xs border border-l-4 select-none min-h-[92px] ${statusCardStyle}`}
            style={{ borderLeftColor: areaColor }}
          >
            {/* Top Row: Sigla & ID circle & Options dropdown */}
            <div className="flex items-center justify-between gap-1 w-full">
              <div className="flex items-center gap-1.5 font-mono font-bold tracking-tight text-[11px] sm:text-xs">
                <span>{course.sigla}</span>
                {status === "APPROVED" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline" />
                )}
                {status === "LOCKED" && (
                  <Lock className="h-3 w-3 text-muted-foreground inline" />
                )}
              </div>

              <div className="flex items-center gap-1" data-no-card-click="true">
                {/* Correlative ID */}
                <span
                  className="inline-flex items-center justify-center h-4.5 min-w-4.5 px-1 rounded-full text-[9px] font-bold text-white shadow-xs"
                  style={{ backgroundColor: areaColor }}
                  title={`ID #${course.id}`}
                >
                  {course.id}
                </span>

                {/* Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-5 w-5 rounded flex items-center justify-center opacity-40 group-hover:opacity-100 hover:bg-muted transition-opacity"
                      aria-label="Opciones del curso"
                    >
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 text-xs">
                    <DropdownMenuItem onClick={() => onOpenDetail(course)}>
                      <Info className="mr-2 h-3.5 w-3.5" />
                      Ver detalles
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleToggleEnroll}>
                      <BookOpen className="mr-2 h-3.5 w-3.5" />
                      {status === "IN_PROGRESS"
                        ? "Quitar de Cursando"
                        : "Cursar este semestre"}
                    </DropdownMenuItem>

                    {status !== "APPROVED" ? (
                      <>
                        <DropdownMenuItem onClick={() => handleQuickApproveGrade(55)}>
                          <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                          Aprobar rápido (55)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpenDetail(course)}>
                          <Award className="mr-2 h-3.5 w-3.5 text-[#D99B00]" />
                          Aprobar con nota...
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={() => toggleCourseApproval(course.sigla)}>
                        <Lock className="mr-2 h-3.5 w-3.5 text-destructive" />
                        Desaprobar ramo
                      </DropdownMenuItem>
                    )}

                    {onNavigateToSolver && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            if (status !== "IN_PROGRESS") {
                              enrollCourse(course.sigla);
                            }
                            onNavigateToSolver(course.sigla);
                          }}
                        >
                          <PlayCircle className="mr-2 h-3.5 w-3.5 text-secondary" />
                          Calcular en Solver
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Course Title */}
            <div className="font-semibold text-foreground text-[11px] leading-tight line-clamp-2 my-1">
              {course.nombre}
            </div>

            {/* Bottom Row: Credits & Status Badges */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
              <span className="font-medium">
                {course.creditos_usm}U | {course.creditos_sct}SCT
              </span>

              {status === "APPROVED" && (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {grade !== undefined ? `Nota: ${grade}` : "Aprobado"}
                </span>
              )}

              {status === "IN_PROGRESS" && (
                <span className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-ping" />
                  Cursando
                </span>
              )}

              {status === "AVAILABLE" && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Disponible
                </span>
              )}

              {status === "LOCKED" && (
                <span className="text-muted-foreground italic">
                  Req ({course.prerrequisitos.length})
                </span>
              )}
            </div>
          </div>
        </TooltipTrigger>

        {/* Dynamic Tooltip content */}
        <TooltipContent side="top" className="max-w-xs space-y-1 text-xs p-2.5">
          <div className="font-bold flex items-center justify-between gap-2">
            <span>{course.nombre}</span>
            <span className="font-mono text-[10px] text-slate-300 dark:text-slate-600">
              {course.sigla}
            </span>
          </div>

          {status === "LOCKED" && (
            <div className="text-destructive font-medium">
              Faltan prerrequisitos:{" "}
              <span className="font-semibold underline">
                {missingPrereqs.join(", ")}
              </span>
            </div>
          )}

          {status === "AVAILABLE" && (
            <div className="text-emerald-400 dark:text-emerald-600 font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3 inline" />
              Listo para cursar o aprobar (clic para aprobar)
            </div>
          )}

          {status === "IN_PROGRESS" && (
            <div className="text-sky-400 dark:text-sky-600 font-medium">
              Actualmente cursando. Configurado en el Wolfram Solver.
            </div>
          )}

          {status === "APPROVED" && (
            <div className="text-emerald-400 font-medium">
              Aprobado. Clic para desaprobar o menú para editar nota.
            </div>
          )}

          {unlocked.length > 0 && (
            <div className="pt-1 text-[11px] text-slate-300 dark:text-slate-600 border-t border-slate-700/50">
              <span className="font-semibold">Desbloquea: </span>
              {unlocked.map((u) => u.sigla).join(", ")}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
