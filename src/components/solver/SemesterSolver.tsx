import * as React from "react";
import { useAcademicStore } from "@/store/useAcademicStore";
import { FormulaBuilder } from "./FormulaBuilder";
import { SolverOutput } from "./SolverOutput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  BookOpen,
  Calculator,
  Trash2,
  Sparkles,
  Search,
  Sliders,
  Scale,
  Award,
} from "lucide-react";

export function SemesterSolver() {
  const {
    curriculum,
    inProgressCourses,
    selectedCourseSigla,
    setSelectedCourse,
    enrollCourse,
    unenrollCourse,
    toggleCourseApproval,
    getCourseSolveResult,
    getCoursesStatus,
  } = useAcademicStore();

  const [enrollModalOpen, setEnrollModalOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"solver" | "formula">("solver");

  const enrolledSiglas = Object.keys(inProgressCourses);
  const coursesStatus = getCoursesStatus();

  // If no course is selected but there are enrolled courses, pick the first one
  React.useEffect(() => {
    if (
      (!selectedCourseSigla || !inProgressCourses[selectedCourseSigla]) &&
      enrolledSiglas.length > 0
    ) {
      setSelectedCourse(enrolledSiglas[0]);
    }
  }, [enrolledSiglas, selectedCourseSigla, setSelectedCourse, inProgressCourses]);

  const currentCourseConfig = selectedCourseSigla
    ? inProgressCourses[selectedCourseSigla]
    : null;

  const currentCourseInfo = React.useMemo(() => {
    if (!selectedCourseSigla) return null;
    return (
      curriculum.ramos.find(
        (r) => r.sigla.toUpperCase() === selectedCourseSigla.toUpperCase()
      ) || null
    );
  }, [curriculum.ramos, selectedCourseSigla]);

  const solveResult = currentCourseConfig
    ? getCourseSolveResult(currentCourseConfig.sigla)
    : null;

  // Unenrolled courses available in the curriculum
  const availableToEnroll = React.useMemo(() => {
    return curriculum.ramos.filter(
      (r) => !inProgressCourses[r.sigla.toUpperCase()]
    );
  }, [curriculum.ramos, inProgressCourses]);

  const handleEnrollCourse = (sigla: string) => {
    enrollCourse(sigla);
    setSelectedCourse(sigla);
    setEnrollModalOpen(false);
  };

  const handleEnrollRecommended = () => {
    // Enroll the first 4 available courses
    const candidates = curriculum.ramos
      .filter((r) => {
        const s = coursesStatus[r.sigla]?.status;
        return s === "AVAILABLE" && !inProgressCourses[r.sigla.toUpperCase()];
      })
      .slice(0, 4);

    if (candidates.length > 0) {
      candidates.forEach((c) => enrollCourse(c.sigla));
      setSelectedCourse(candidates[0].sigla);
    } else {
      // Fallback: enroll Semester 1 courses
      const sem1 = curriculum.ramos.filter((r) => r.semestre === 1).slice(0, 4);
      sem1.forEach((c) => enrollCourse(c.sigla));
      setSelectedCourse(sem1[0].sigla);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Grid: Sidebar List + Solver Central */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Enrolled Courses List */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-secondary" />
              <span>Ramos Semestre Actual</span>
            </h3>
            <Badge variant="outline" className="text-xs">
              {enrolledSiglas.length} inscritos
            </Badge>
          </div>

          {/* Enroll Course Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnrollModalOpen(true)}
            className="w-full text-xs font-semibold gap-1.5 h-9 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 text-primary" />
            + Inscribir Asignatura
          </Button>

          {/* Empty State */}
          {enrolledSiglas.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center space-y-3 bg-muted/20">
              <Calculator className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  Sin asignaturas en curso
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Inscribe asignaturas para calcular tus notas requeridas con precisión USM.
                </p>
              </div>
              <Button
                variant="usm"
                size="sm"
                onClick={handleEnrollRecommended}
                className="text-xs gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                Inscribir Ramos Recomendados
              </Button>
            </div>
          ) : (
            /* Courses List */
            <div className="space-y-2 max-h-[650px] overflow-y-auto pr-0.5">
              {enrolledSiglas.map((sigla) => {
                const res = getCourseSolveResult(sigla);
                const info = curriculum.ramos.find(
                  (r) => r.sigla.toUpperCase() === sigla.toUpperCase()
                );
                const isSelected = selectedCourseSigla?.toUpperCase() === sigla.toUpperCase();

                let statusBadge = (
                  <Badge variant="outline" className="text-[10px]">
                    En curso
                  </Badge>
                );
                if (res) {
                  if (res.status === "APPROVED") {
                    statusBadge = (
                      <Badge variant="success" className="text-[10px]">
                        Aprobado
                      </Badge>
                    );
                  } else if (res.status === "IN_DANGER") {
                    statusBadge = (
                      <Badge variant="warning" className="text-[10px]">
                        En Peligro
                      </Badge>
                    );
                  } else if (res.status === "REQUIRES_RECOVERY") {
                    statusBadge = (
                      <Badge variant="destructive" className="text-[10px]">
                        Recuperativo
                      </Badge>
                    );
                  } else if (res.status === "FAILED") {
                    statusBadge = (
                      <Badge variant="destructive" className="text-[10px]">
                        Reprobado
                      </Badge>
                    );
                  } else if (res.effectiveRequiredGrade !== null) {
                    statusBadge = (
                      <Badge variant="secondary" className="text-[10px] bg-sky-500/20 text-sky-800 dark:text-sky-300 font-bold">
                        Req {Math.round(res.effectiveRequiredGrade)}
                      </Badge>
                    );
                  }
                }

                return (
                  <div
                    key={sigla}
                    onClick={() => setSelectedCourse(sigla)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                      isSelected
                        ? "border-[#002B49] bg-[#002B49]/10 dark:border-[#D99B00] dark:bg-[#D99B00]/10 shadow-xs font-semibold ring-1 ring-[#002B49]/30"
                        : "bg-card hover:bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono font-bold tracking-tight text-foreground">
                        {sigla}
                      </span>
                      {statusBadge}
                    </div>

                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                      {info?.nombre || sigla}
                    </div>

                    {res && (
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-1 border-t border-border/50">
                        <span>Puntos: {res.accumulatedPoints.toFixed(1)} / 55</span>
                        <span>{Math.round(res.remainingWeight * 100)}% libre</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right / Center Column: Course Solver Details */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {currentCourseConfig && solveResult ? (
            <>
              {/* Selected Course Header Banner */}
              <div className="rounded-xl border bg-card/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted">
                      {currentCourseConfig.sigla}
                    </span>
                    {currentCourseInfo && (
                      <span className="text-xs text-muted-foreground font-medium">
                        Semestre {currentCourseInfo.semestre} •{" "}
                        {currentCourseInfo.creditos_usm} USM |{" "}
                        {currentCourseInfo.creditos_sct} SCT
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-foreground mt-1">
                    {currentCourseInfo?.nombre || currentCourseConfig.sigla}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toggleCourseApproval(currentCourseConfig.sigla, solveResult.finalGrade);
                    }}
                    className="text-xs gap-1.5"
                    title="Aprobar y transferir nota final a la malla"
                  >
                    <Award className="h-4 w-4 text-emerald-600" />
                    Aprobar Ramo ({solveResult.finalGrade})
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unenrollCourse(currentCourseConfig.sigla)}
                    className="text-xs gap-1 text-muted-foreground hover:text-destructive"
                    title="Desinscribir del semestre actual"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Desinscribir
                  </Button>
                </div>
              </div>

              {/* View Switcher Tabs: Solver Output vs Formula Builder */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "solver" | "formula")}
                className="w-full"
              >
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-2">
                  <TabsTrigger value="solver" className="gap-1.5 text-xs">
                    <Scale className="h-3.5 w-3.5" />
                    Diagnóstico &amp; Despeje
                  </TabsTrigger>
                  <TabsTrigger value="formula" className="gap-1.5 text-xs">
                    <Sliders className="h-3.5 w-3.5" />
                    Editar Ponderaciones
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="solver">
                  <SolverOutput
                    solveResult={solveResult}
                    courseConfig={currentCourseConfig}
                  />
                </TabsContent>

                <TabsContent value="formula">
                  <FormulaBuilder courseConfig={currentCourseConfig} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="font-bold text-base text-foreground">
                Selecciona una asignatura de la lista
              </h3>
              <p className="text-xs max-w-sm mx-auto mt-1">
                Haz clic en una de tus asignaturas inscritas a la izquierda o inscribe un nuevo ramo para comenzar los cálculos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enroll Course Dialog with Command Search */}
      <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Search className="h-4 w-4 text-secondary" />
              Inscribir Asignatura al Semestre
            </DialogTitle>
            <DialogDescription className="text-xs">
              Busca por código o nombre para agregar una asignatura a tu solucionador de notas.
            </DialogDescription>
          </DialogHeader>

          <Command className="border-t">
            <CommandInput placeholder="Buscar por código o nombre (ej. MAT-022, FIS-110)..." />
            <CommandList className="max-h-72">
              <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">
                No se encontraron asignaturas disponibles.
              </CommandEmpty>
              <CommandGroup heading="Asignaturas Disponibles de la Malla">
                {availableToEnroll.map((course) => (
                  <CommandItem
                    key={course.sigla}
                    onSelect={() => handleEnrollCourse(course.sigla)}
                    className="flex items-center justify-between p-2 text-xs cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-foreground">
                        {course.sigla} • {course.nombre}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Semestre {course.semestre} • {course.creditos_usm} USM | {course.creditos_sct} SCT
                      </div>
                    </div>
                    <Button
                      variant="usm"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => handleEnrollCourse(course.sigla)}
                    >
                      Inscribir
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
