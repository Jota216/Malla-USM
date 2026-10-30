import * as React from "react";
import { useAcademicStore } from "@/shared/store/useAcademicStore";
import { ensureFormulaConfig } from "@/wolfram-solver/templates/defaultTemplates";
import { CourseSolverCard } from "./CourseSolverCard";
import { Button } from "@/frontend/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/frontend/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/frontend/components/ui/command";
import {
  Plus,
  Sparkles,
  Calculator,
  BookOpen,
  Layers,
} from "lucide-react";

export function SemesterSolver() {
  const {
    curriculum,
    inProgressCourses,
    enrollCourse,
    unenrollCourse,
    loadInf292Example,
    setSubFormulaEvaluationScore,
    toggleCourseApproval,
    getSubFormulaSolveResult,
  } = useAcademicStore();

  const [openCombobox, setOpenCombobox] = React.useState(false);

  const enrolledSiglas = Object.keys(inProgressCourses);

  // Available courses from the curriculum not currently enrolled
  const availableToEnroll = React.useMemo(() => {
    return curriculum.ramos.filter(
      (r) => !inProgressCourses[r.sigla.toUpperCase()]
    );
  }, [curriculum.ramos, inProgressCourses]);

  // Aggregate semester metrics
  const semesterMetrics = React.useMemo(() => {
    let sct = 0;
    let usm = 0;
    for (const sigla of enrolledSiglas) {
      const course = curriculum.ramos.find(
        (r) => r.sigla.toUpperCase() === sigla.toUpperCase()
      );
      if (course) {
        sct += course.creditos_sct || 0;
        usm += course.creditos_usm || 0;
      }
    }
    return { sct, usm };
  }, [curriculum.ramos, enrolledSiglas]);

  const handleEnroll = (sigla: string) => {
    enrollCourse(sigla);
    setOpenCombobox(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Selector + Cargar Ejemplo INF-292 + Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/90 shadow-md">
        {/* Left: Enrollment Selector + Example Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Course Enrollment Combobox */}
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-semibold gap-1.5 border-zinc-700 bg-zinc-950/80 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                aria-label="Inscribir asignatura al semestre"
              >
                <Plus className="h-4 w-4 text-amber-400" />
                <span>Inscribir Asignatura</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 sm:w-96 p-0 border-zinc-800 bg-zinc-900 shadow-2xl"
              align="start"
            >
              <Command className="bg-transparent text-zinc-100">
                <CommandInput
                  placeholder="Buscar por código o nombre (ej. INF-292, MAT-022)..."
                  className="text-xs"
                />
                <CommandList className="max-h-64 overflow-y-auto">
                  <CommandEmpty className="py-4 text-center text-xs text-zinc-400">
                    No se encontraron asignaturas disponibles.
                  </CommandEmpty>
                  <CommandGroup heading="Asignaturas Disponibles de la Malla">
                    {availableToEnroll.map((course) => (
                      <CommandItem
                        key={course.sigla}
                        value={`${course.sigla} ${course.nombre}`}
                        onSelect={() => handleEnroll(course.sigla)}
                        className="flex items-center justify-between p-2.5 text-xs text-zinc-200 hover:bg-zinc-800/80 cursor-pointer rounded-md transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-zinc-100">
                            {course.sigla} •{" "}
                            <span className="font-sans font-medium text-zinc-300">
                              {course.nombre}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            Semestre {course.semestre} • {course.creditos_usm} USM | {course.creditos_sct} SCT
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-950/40"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnroll(course.sigla);
                          }}
                        >
                          + Inscribir
                        </Button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Quick Action Button: Cargar Ejemplo INF-292 */}
          <Button
            size="sm"
            onClick={loadInf292Example}
            className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-gradient-to-r from-[#002B49] to-[#003d69] hover:from-[#003459] hover:to-[#004d85] text-amber-400 border border-amber-500/30 shadow-sm transition-all hover:border-amber-400/50"
            title="Cargar escenario algebraico con sub-fórmulas para INF-292 (Optimización)"
          >
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Cargar Ejemplo INF-292</span>
          </Button>
        </div>

        {/* Right: Inline Semester Metrics */}
        <div className="flex items-center gap-3 text-xs text-zinc-300 font-medium">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-950/70 border border-zinc-800">
            <BookOpen className="h-3.5 w-3.5 text-amber-400" />
            <span>
              <strong className="text-zinc-100 font-mono">
                {enrolledSiglas.length}
              </strong>{" "}
              {enrolledSiglas.length === 1 ? "ramo inscrito" : "ramos inscritos"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-950/70 border border-zinc-800">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>
              Créditos:{" "}
              <strong className="text-zinc-100 font-mono">
                {semesterMetrics.sct}
              </strong>{" "}
              SCT{" "}
              <span className="text-zinc-500 font-normal">
                ({semesterMetrics.usm} USM)
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Course Cards Stack or Empty State */}
      {enrolledSiglas.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 sm:p-14 text-center max-w-2xl mx-auto space-y-6 shadow-xl backdrop-blur">
          <div className="h-16 w-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto shadow-inner">
            <Calculator className="h-8 w-8 text-amber-400" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg sm:text-xl font-black text-zinc-100 tracking-tight">
              Sin asignaturas inscritas este semestre
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Inscribe ramos de la malla para calcular automáticamente qué notas necesitas para aprobar o carga el modelo completo de <strong>INF-292 (Optimización)</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="default"
              onClick={loadInf292Example}
              className="w-full sm:w-auto h-10 px-5 text-xs font-bold gap-2 bg-gradient-to-r from-[#002B49] to-[#003d69] hover:from-[#003459] hover:to-[#004d85] text-amber-400 border border-amber-500/40 shadow-md"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              Cargar Ejemplo INF-292 (Optimización)
            </Button>

            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  size="default"
                  variant="outline"
                  className="w-full sm:w-auto h-10 px-5 text-xs font-semibold gap-2 border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100"
                >
                  <Plus className="h-4 w-4" />
                  Inscribir Ramo de la Malla
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 sm:w-96 p-0 border-zinc-800 bg-zinc-900 shadow-2xl"
                align="center"
              >
                <Command className="bg-transparent text-zinc-100">
                  <CommandInput
                    placeholder="Buscar por código o nombre..."
                    className="text-xs"
                  />
                  <CommandList className="max-h-64 overflow-y-auto">
                    <CommandEmpty className="py-4 text-center text-xs text-zinc-400">
                      No se encontraron asignaturas disponibles.
                    </CommandEmpty>
                    <CommandGroup heading="Asignaturas Disponibles">
                      {availableToEnroll.map((course) => (
                        <CommandItem
                          key={course.sigla}
                          value={`${course.sigla} ${course.nombre}`}
                          onSelect={() => handleEnroll(course.sigla)}
                          className="flex items-center justify-between p-2.5 text-xs text-zinc-200 hover:bg-zinc-800/80 cursor-pointer rounded-md"
                        >
                          <div>
                            <span className="font-mono font-bold text-zinc-100">
                              {course.sigla}
                            </span>{" "}
                            • {course.nombre}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {course.creditos_sct} SCT
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 max-w-sm mx-auto flex items-center justify-center gap-1.5">
            <span>El modelo algebraico incluye:</span>
            <span className="text-zinc-400 font-mono">drop_worst</span>
            <span>•</span>
            <span className="text-zinc-400 font-mono">mínimos ≥ 50</span>
            <span>•</span>
            <span className="text-zinc-400 font-mono">NF ≥ 55</span>
          </div>
        </div>
      ) : (
        /* Enrolled Course Cards Stack */
        <div className="space-y-5">
          {enrolledSiglas.map((sigla) => {
            const courseConfig = inProgressCourses[sigla];
            if (!courseConfig) return null;

            const formula = ensureFormulaConfig(courseConfig);
            const solveResult = getSubFormulaSolveResult(sigla);
            if (!solveResult) return null;

            const courseInfo =
              curriculum.ramos.find(
                (r) => r.sigla.toUpperCase() === sigla.toUpperCase()
              ) || null;

            const areaInfo = courseInfo?.area
              ? curriculum.areas[courseInfo.area] || null
              : null;

            return (
              <CourseSolverCard
                key={sigla}
                sigla={sigla}
                formula={formula}
                courseInfo={courseInfo}
                areaInfo={areaInfo}
                solveResult={solveResult}
                onUnenroll={unenrollCourse}
                onScoreChange={(s, bId, eId, score) =>
                  setSubFormulaEvaluationScore(s, bId, eId, score)
                }
                onQuickApprove={(s, grade) => toggleCourseApproval(s, grade)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
