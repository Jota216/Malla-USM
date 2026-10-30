import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/frontend/components/ui/dialog";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import {
  Course,
  CourseParallel,
  CourseStatusDetail,
  ProfessorReviewSummary,
} from "@/shared/types/academic";
import { useAcademicStore } from "@/shared/store/useAcademicStore";
import {
  getPrerequisiteChain,
  getUnlockedByCourse,
} from "@/curricula/prerequisites/graphUnlock";
import {
  getCourseParallels,
  getProfessorReview,
  getSyllabusPdfUrl,
  USM_BAR_DAYS,
} from "@/curricula/services/sigaService";
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
  FileText,
  Users,
  Clock,
  MapPin,
  Star,
  MessageSquare,
  ExternalLink,
  Loader2,
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
    inProgressCourses,
    toggleCourseApproval,
    setCourseGrade,
    enrollCourse,
    unenrollCourse,
    setSelectedParallel,
  } = useAcademicStore();

  const [inputGrade, setInputGrade] = React.useState<string>("");
  const [parallels, setParallels] = React.useState<CourseParallel[]>([]);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [profReviews, setProfReviews] = React.useState<
    Record<string, ProfessorReviewSummary>
  >({});
  const [loadingSiga, setLoadingSiga] = React.useState<boolean>(false);
  const [expandedProf, setExpandedProf] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (course && statusDetail?.grade !== undefined) {
      setInputGrade(String(statusDetail.grade));
    } else {
      setInputGrade("");
    }
  }, [course, statusDetail]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open || !course) {
      return;
    }

    async function loadSigaDetails(targetCourse: Course) {
      setLoadingSiga(true);
      setExpandedProf(null);
      try {
        const [fetchedParallels, fetchedPdf] = await Promise.all([
          getCourseParallels(
            targetCourse.sigla,
            curriculum.sede,
            curriculum.jornada
          ),
          getSyllabusPdfUrl(targetCourse.sigla, curriculum.sede),
        ]);

        if (cancelled) return;
        setParallels(fetchedParallels);
        setPdfUrl(fetchedPdf || targetCourse.programa_pdf || null);

        // Fetch professor reviews for all unique professors in these parallels
        const uniqueProfs = Array.from(
          new Set(fetchedParallels.flatMap((p) => p.profesor || []))
        ).filter((name) => name && !name.includes("DEFINIR"));

        const reviewsMap: Record<string, ProfessorReviewSummary> = {};
        await Promise.all(
          uniqueProfs.map(async (profName) => {
            const rev = await getProfessorReview(profName);
            if (rev) {
              reviewsMap[profName] = rev;
            }
          })
        );

        if (!cancelled) {
          setProfReviews(reviewsMap);
        }
      } catch {
        if (!cancelled) {
          setParallels([]);
          setPdfUrl(targetCourse.programa_pdf || null);
        }
      } finally {
        if (!cancelled) {
          setLoadingSiga(false);
        }
      }
    }

    loadSigaDetails(course);
    return () => {
      cancelled = true;
    };
  }, [open, course, curriculum.sede, curriculum.jornada]);

  if (!course) return null;

  const areaInfo = curriculum.areas[course.area] || {
    nombre: course.area,
    color: "#64748B",
  };

  const status = statusDetail?.status ?? "AVAILABLE";
  const unlockedFuture = getUnlockedByCourse(course.sigla, curriculum.ramos);
  const prereqChain = getPrerequisiteChain(course.sigla, curriculum.ramos);
  const enrolledConfig = inProgressCourses[course.sigla];
  const selectedParallel = enrolledConfig?.selectedParallel;

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

  const handleSelectParallel = (paraleloId: string) => {
    if (status !== "IN_PROGRESS") {
      enrollCourse(course.sigla);
    }
    if (selectedParallel === paraleloId) {
      setSelectedParallel(course.sigla, undefined);
    } else {
      setSelectedParallel(course.sigla, paraleloId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-2">
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

            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#002B49]/10 text-[#002B49] dark:bg-slate-800 dark:text-[#D99B00] hover:bg-[#002B49]/20 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Programa Oficial (PDF)</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            )}
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center justify-between gap-2">
            <span>{course.nombre}</span>
            <Badge variant="outline" className="font-mono text-sm px-2.5 py-1">
              {course.sigla}
            </Badge>
          </DialogTitle>

          <DialogDescription className="flex items-center gap-3 pt-1 text-xs flex-wrap">
            <span className="font-semibold text-foreground">
              {course.creditos_usm} Créditos USM
            </span>
            <span>•</span>
            <span className="font-semibold text-foreground">
              {course.creditos_sct} Créditos SCT
            </span>
            {course.departamento && (
              <>
                <span>•</span>
                <span>{course.departamento}</span>
              </>
            )}
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
                    {selectedParallel && ` • Paralelo ${selectedParallel}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Inscrita en el solucionador de notas y horario semestral
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

        {/* SIGA Parallels, Professors & Horarios Section */}
        <div className="space-y-2.5 border-t pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
              <Users className="h-3.5 w-3.5 text-[#002B49] dark:text-[#D99B00]" />
              <span>
                Paralelos, Profesores y Horario SIGA ({parallels.length})
              </span>
            </div>
            {curriculum.sede && (
              <span className="text-[11px] text-muted-foreground">
                Sede: <strong className="text-foreground">{curriculum.sede}</strong>
              </span>
            )}
          </div>

          {loadingSiga ? (
            <div className="flex items-center gap-2 py-4 justify-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Consultando programación de paralelos SIGA...</span>
            </div>
          ) : parallels.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No se encontraron paralelos programados para {course.sigla} en el periodo actual para esta sede.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {parallels.map((par) => {
                const isSelected = selectedParallel === par.paralelo;
                return (
                  <div
                    key={par.paralelo}
                    className={`p-2.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? "border-[#002B49] bg-[#002B49]/5 dark:border-[#D99B00] dark:bg-[#D99B00]/10"
                        : "bg-card/60 hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isSelected ? "default" : "outline"}
                          className="font-mono text-xs"
                        >
                          Par. {par.paralelo}
                        </Badge>
                        <span className="font-semibold text-foreground">
                          {par.profesor?.length
                            ? par.profesor.join(" / ")
                            : "Profesor por definir"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={par.cupo > 0 ? "success" : "secondary"}
                          className="text-[10px]"
                        >
                          Cupos: {par.cupo}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? "usm" : "outline"}
                          onClick={() => handleSelectParallel(par.paralelo)}
                          className="h-6 px-2 text-[11px]"
                        >
                          {isSelected ? "Paralelo Inscrito" : "Elegir Paralelo"}
                        </Button>
                      </div>
                    </div>

                    {/* Schedule Blocks */}
                    {par.horario && par.horario.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {par.horario.map((b, idx) => (
                          <span
                            key={`${par.paralelo}-${idx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-[11px] text-muted-foreground"
                          >
                            <Clock className="h-3 w-3 text-[#D99B00]" />
                            <strong className="text-foreground">
                              {USM_BAR_DAYS[b.dia]?.slice(0, 2) || `D${b.dia}`} B
                              {b.bloque}-{b.bloque + 1}
                            </strong>
                            <span>({b.tipo})</span>
                            {b.sala && (
                              <span className="inline-flex items-center gap-0.5 text-foreground font-medium">
                                <MapPin className="h-2.5 w-2.5" />
                                {b.sala}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Professor Reviews if available */}
                    {par.profesor?.map((profName) => {
                      const rev = profReviews[profName];
                      if (!rev) return null;
                      const isExpanded =
                        expandedProf === `${par.paralelo}-${profName}`;
                      return (
                        <div
                          key={profName}
                          className="mt-2 pt-2 border-t border-dashed flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                <Star className="h-3 w-3 fill-current" />
                                Claridad:{" "}
                                {rev.stats.claridad_expositiva?.mean.toFixed(1)}/5
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                • Dificultad:{" "}
                                <strong>
                                  {rev.stats.dificultad_percibida?.mean.toFixed(1)}/5
                                </strong>
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                • Accesibilidad:{" "}
                                <strong>
                                  {rev.stats.accesibilidad?.mean.toFixed(1)}/5
                                </strong>
                              </span>
                            </div>

                            {rev.comments && rev.comments.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedProf(
                                    isExpanded
                                      ? null
                                      : `${par.paralelo}-${profName}`
                                  )
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span>
                                  {isExpanded
                                    ? "Ocultar reseñas"
                                    : `Ver reseñas (${rev.comments.length})`}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Tags */}
                          {rev.tags && rev.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {rev.tags.slice(0, 4).map(([tag, count]) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]"
                                >
                                  {tag} ({count})
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Expanded Student Comments */}
                          {isExpanded && rev.comments && (
                            <div className="mt-1 space-y-1.5 bg-muted/50 p-2 rounded max-h-36 overflow-y-auto">
                              {rev.comments.map((comment, cIdx) => (
                                <p
                                  key={cIdx}
                                  className="text-[11px] text-muted-foreground italic border-l-2 border-[#D99B00] pl-2"
                                >
                                  &ldquo;{comment}&rdquo;
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
              {status === "IN_PROGRESS"
                ? "Quitar de Cursando"
                : "Cursar este Semestre"}
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
