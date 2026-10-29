import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Course, CourseStatusDetail } from "@/types/academic";
import { useAcademicStore } from "@/store/useAcademicStore";
import { getPrerequisiteChain, getUnlockedByCourse } from "@/engine/graphUnlock";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  Lock,
  PlayCircle,
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
  Calculator,
} from "lucide-react";

interface CourseDetailModalProps {
  course: Course | null;
  statusDetail?: CourseStatusDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToSolver?: (sigla: string) => void;
}

export function CourseDetailModal({
  course,
  statusDetail,
  open,
  onOpenChange,
  onNavigateToSolver,
}: CourseDetailModalProps) {
  const {
    curriculum,
    approvedCourses,
    toggleCourseApproval,
    setCourseGrade,
    enrollCourse,
    unenrollCourse,
  } = useAcademicStore();

  const [inputGrade, setInputGrade] = React.useState<string>("");

  React.useEffect(() => {
    if (course && statusDetail?.grade !== undefined) {
      setInputGrade(String(statusDetail.grade));
    } else {
      setInputGrade("");
    }
  }, [course, statusDetail]);

  if (!course) return null;

  const areaInfo = curriculum.areas[course.area] || {
    nombre: course.area,
    color: "#64748B",
  };

  const status = statusDetail?.status ?? "AVAILABLE";
  const unlockedFuture = getUnlockedByCourse(course.sigla, curriculum.ramos);
  const prereqChain = getPrerequisiteChain(course.sigla, curriculum.ramos);

  const handleToggleApprove = () => {
    if (status !== "APPROVED") {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
    const numGrade = inputGrade.trim() !== "" ? Number(inputGrade) : undefined;
    toggleCourseApproval(course.sigla, numGrade);
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(inputGrade);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      if (status !== "APPROVED") {
        toggleCourseApproval(course.sigla, num);
      } else {
        setCourseGrade(course.sigla, num);
      }
    }
  };

  const handleToggleEnroll = () => {
    if (status === "IN_PROGRESS") {
      unenrollCourse(course.sigla);
    } else {
      enrollCourse(course.sigla);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: areaInfo.color }}
            />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {areaInfo.nombre}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs font-medium text-muted-foreground">
              Semestre {course.semestre}
            </span>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center justify-between gap-2">
            <span>{course.nombre}</span>
            <Badge variant="outline" className="font-mono text-sm px-2.5 py-1">
              {course.sigla}
            </Badge>
          </DialogTitle>

          <DialogDescription className="flex items-center gap-3 pt-1 text-xs">
            <span className="font-semibold text-foreground">
              {course.creditos_usm} Créditos USM
            </span>
            <span>•</span>
            <span className="font-semibold text-foreground">
              {course.creditos_sct} Créditos SCT
            </span>
            <span>•</span>
            <span>ID #{course.id}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Current Status Banner */}
        <div className="mt-2 p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === "APPROVED" && (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <div className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                    Asignatura Aprobada
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {statusDetail?.grade !== undefined
                      ? `Nota registrada: ${statusDetail.grade}`
                      : "Aprobada sin nota específica registrada"}
                  </div>
                </div>
              </>
            )}

            {status === "IN_PROGRESS" && (
              <>
                <PlayCircle className="h-5 w-5 text-sky-600 animate-pulse" />
                <div>
                  <div className="font-semibold text-sm text-sky-700 dark:text-sky-400">
                    Cursando Actualmente
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Inscrita en el solucionador de notas semestral
                  </div>
                </div>
              </>
            )}

            {status === "AVAILABLE" && (
              <>
                <Sparkles className="h-5 w-5 text-[#D99B00]" />
                <div>
                  <div className="font-semibold text-sm text-amber-700 dark:text-amber-400">
                    Disponible para Cursar
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cumple todos los prerrequisitos académicos
                  </div>
                </div>
              </>
            )}

            {status === "LOCKED" && (
              <>
                <Lock className="h-5 w-5 text-destructive" />
                <div>
                  <div className="font-semibold text-sm text-destructive">
                    Bloqueada
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Faltan prerrequisitos pendientes
                  </div>
                </div>
              </>
            )}
          </div>

          <Badge
            variant={
              status === "APPROVED"
                ? "success"
                : status === "IN_PROGRESS"
                ? "secondary"
                : status === "AVAILABLE"
                ? "warning"
                : "destructive"
            }
          >
            {status}
          </Badge>
        </div>

        {/* Grade registration form if approved or approving */}
        <form onSubmit={handleSaveGrade} className="space-y-2 pt-2 border-t">
          <Label className="text-xs font-semibold">
            Nota de Aprobación (Escala 0 a 100, Mínimo 55):
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="Ej. 68"
              value={inputGrade}
              onChange={(e) => setInputGrade(e.target.value)}
              className="h-9 w-28 font-mono text-sm"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={!inputGrade}
              className="text-xs"
            >
              Guardar Nota
            </Button>
          </div>
        </form>

        {/* Prerequisites Section */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <Layers className="h-3.5 w-3.5" />
            <span>Prerrequisitos ({course.prerrequisitos.length})</span>
          </div>

          {course.prerrequisitos.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Esta asignatura no tiene prerrequisitos académicos previos.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {course.prerrequisitos.map((req) => {
                const isApproved = !!approvedCourses[req.toUpperCase()];
                const reqCourse = curriculum.ramos.find((r) => r.sigla === req);
                return (
                  <Badge
                    key={req}
                    variant={isApproved ? "success" : "destructive"}
                    className="gap-1 py-1 px-2 text-xs"
                  >
                    {isApproved ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Lock className="h-3 w-3" />
                    )}
                    <span>{req}</span>
                    {reqCourse && (
                      <span className="opacity-80 font-normal">
                        ({reqCourse.nombre})
                      </span>
                    )}
                  </Badge>
                );
              })}
            </div>
          )}

          {prereqChain.length > course.prerrequisitos.length && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              <span className="font-semibold">Cadena histórica completa: </span>
              {prereqChain.join(" → ")}
            </div>
          )}
        </div>

        {/* Future Courses Unlocked */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <ArrowRight className="h-3.5 w-3.5 text-secondary" />
            <span>Asignaturas que Desbloquea ({unlockedFuture.length})</span>
          </div>

          {unlockedFuture.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Esta asignatura es terminal o electiva final, no desbloquea directamente otros ramos en la malla.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unlockedFuture.map((f) => {
                const fApproved = !!approvedCourses[f.sigla.toUpperCase()];
                return (
                  <div
                    key={f.sigla}
                    className="p-2 rounded border bg-card/60 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="font-mono text-[11px]">{f.sigla}</span>
                        {fApproved && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                        {f.nombre}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Sem {f.semestre}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions Footer */}
        <div className="border-t pt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant={status === "APPROVED" ? "outline" : "usm"}
              size="sm"
              onClick={handleToggleApprove}
              className="gap-1.5 text-xs"
            >
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              {status === "APPROVED" ? "Desaprobar" : "Marcar Aprobado"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleEnroll}
              className="gap-1.5 text-xs"
            >
              <BookOpen className="h-4 w-4" />
              {status === "IN_PROGRESS" ? "Quitar de Cursando" : "Cursar este Semestre"}
            </Button>
          </div>

          {onNavigateToSolver && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                if (status !== "IN_PROGRESS") {
                  enrollCourse(course.sigla);
                }
                onNavigateToSolver(course.sigla);
                onOpenChange(false);
              }}
              className="gap-1.5 text-xs"
            >
              <Calculator className="h-4 w-4" />
              Abrir en Solver
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
