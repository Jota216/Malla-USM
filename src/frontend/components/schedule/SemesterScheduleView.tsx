import * as React from "react";
import { useAcademicStore } from "@/shared/store/useAcademicStore";
import {
  getCourseParallels,
  getSchedulePeriods,
  groupScheduleBlocks,
  USM_BAR_DAYS,
  USM_BLOCK_PAIRS,
} from "@/curricula/services/sigaService";
import { CourseParallel } from "@/shared/types/academic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/frontend/components/ui/card";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  MapPin,
  Plus,
  Trash2,
  Wand2,
  Loader2,
  BookOpen,
} from "lucide-react";

interface ScheduledCellEntry {
  sigla: string;
  nombre: string;
  paralelo: string;
  tipo: string;
  sala: string;
  profesor: string;
  color: string;
}

const SEDES_USM = [
  "Casa Central Valparaíso",
  "Santiago San Joaquín",
  "Santiago Vitacura",
  "Viña del Mar",
  "Concepción",
];

export function SemesterScheduleView() {
  const {
    curriculum,
    inProgressCourses,
    enrollCourse,
    unenrollCourse,
    setSelectedParallel,
  } = useAcademicStore();

  const [selectedSede, setSelectedSede] = React.useState<string>(
    curriculum.sede || "Casa Central Valparaíso"
  );
  const [selectedJornada, setSelectedJornada] = React.useState<string>(
    curriculum.jornada || "Diurna"
  );
  const [periods, setPeriods] = React.useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>("");
  const [parallelsByCourse, setParallelsByCourse] = React.useState<
    Record<string, CourseParallel[]>
  >({});
  const [loading, setLoading] = React.useState<boolean>(false);
  const [quickAddSearch, setQuickAddSearch] = React.useState<string>("");

  // Sync default sede/jornada when curriculum changes
  React.useEffect(() => {
    if (curriculum.sede) setSelectedSede(curriculum.sede);
    if (curriculum.jornada) setSelectedJornada(curriculum.jornada);
  }, [curriculum.sede, curriculum.jornada]);

  // Load available periods for the selected sede & jornada
  React.useEffect(() => {
    let cancelled = false;
    getSchedulePeriods(selectedSede, selectedJornada).then((pList) => {
      if (cancelled) return;
      setPeriods(pList);
      if (pList.length > 0 && (!selectedPeriod || !pList.includes(selectedPeriod))) {
        setSelectedPeriod(pList[0]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSede, selectedJornada]);

  const enrolledSiglas = React.useMemo(
    () => Object.keys(inProgressCourses),
    [inProgressCourses]
  );

  // Load parallels for all enrolled courses
  React.useEffect(() => {
    let cancelled = false;
    if (enrolledSiglas.length === 0) {
      setParallelsByCourse({});
      return;
    }

    async function fetchAllParallels() {
      setLoading(true);
      try {
        const nextMap: Record<string, CourseParallel[]> = {};
        await Promise.all(
          enrolledSiglas.map(async (sigla) => {
            const list = await getCourseParallels(
              sigla,
              selectedSede,
              selectedJornada,
              selectedPeriod || undefined
            );
            nextMap[sigla] = list;
          })
        );
        if (!cancelled) {
          setParallelsByCourse(nextMap);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAllParallels();
    return () => {
      cancelled = true;
    };
  }, [enrolledSiglas, selectedSede, selectedJornada, selectedPeriod]);

  // Quick search suggestions from current curriculum
  const searchSuggestions = React.useMemo(() => {
    const q = quickAddSearch.trim().toLowerCase();
    if (!q) return [];
    return curriculum.ramos
      .filter(
        (r) =>
          !inProgressCourses[r.sigla] &&
          (r.sigla.toLowerCase().includes(q) ||
            r.nombre.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [quickAddSearch, curriculum.ramos, inProgressCourses]);

  // Build grid cells: key = `${dia}-${pair}` (e.g. "0-1-2")
  const { gridMap, conflicts, hasSaturday } = React.useMemo(() => {
    const map: Record<string, ScheduledCellEntry[]> = {};
    let saturdayUsed = false;

    for (const sigla of enrolledSiglas) {
      const config = inProgressCourses[sigla];
      const parId = config?.selectedParallel;
      if (!parId) continue;

      const parList = parallelsByCourse[sigla] || [];
      const chosenPar = parList.find((p) => p.paralelo === parId);
      if (!chosenPar || !chosenPar.horario) continue;

      const courseObj = curriculum.ramos.find((r) => r.sigla === sigla);
      const areaColor =
        (courseObj && curriculum.areas[courseObj.area]?.color) || "#002B49";
      const courseName = courseObj?.nombre || chosenPar.nombre || sigla;

      for (const pairObj of USM_BLOCK_PAIRS) {
        for (let dia = 0; dia < 6; dia++) {
          const matchingBlock = chosenPar.horario.find(
            (b) => b.dia === dia && pairObj.blocks.includes(b.bloque)
          );
          if (matchingBlock) {
            if (dia === 5) saturdayUsed = true;
            const cellKey = `${dia}-${pairObj.pair}`;
            if (!map[cellKey]) map[cellKey] = [];
            // Avoid duplicate entry for the same course in the same pair
            if (!map[cellKey].some((e) => e.sigla === sigla)) {
              map[cellKey].push({
                sigla,
                nombre: courseName,
                paralelo: parId,
                tipo: matchingBlock.tipo,
                sala: matchingBlock.sala,
                profesor:
                  chosenPar.profesor?.join(", ") || matchingBlock.profesor,
                color: areaColor,
              });
            }
          }
        }
      }
    }

    const conflictList: Array<{
      dia: number;
      pair: string;
      entries: ScheduledCellEntry[];
    }> = [];

    for (const [key, entries] of Object.entries(map)) {
      if (entries.length > 1) {
        const [diaStr, ...pairParts] = key.split("-");
        conflictList.push({
          dia: Number(diaStr),
          pair: pairParts.join("-"),
          entries,
        });
      }
    }

    return {
      gridMap: map,
      conflicts: conflictList,
      hasSaturday: saturdayUsed,
    };
  }, [enrolledSiglas, inProgressCourses, parallelsByCourse, curriculum]);

  // Auto-select conflict-free parallels for enrolled courses
  const handleAutoAssignParallels = () => {
    const occupied = new Set<string>();

    for (const sigla of enrolledSiglas) {
      const parList = parallelsByCourse[sigla] || [];
      if (parList.length === 0) continue;

      // Try to find a parallel whose (dia, bloque) blocks don't collide with occupied
      let bestPar = parList[0];
      for (const candidate of parList) {
        const hasCollision = (candidate.horario || []).some((b) =>
          occupied.has(`${b.dia}-${b.bloque}`)
        );
        if (!hasCollision) {
          bestPar = candidate;
          break;
        }
      }

      setSelectedParallel(sigla, bestPar.paralelo);
      for (const b of bestPar.horario || []) {
        occupied.add(`${b.dia}-${b.bloque}`);
      }
    }
  };

  const visibleDays = hasSaturday ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4];

  return (
    <div className="space-y-5">
      {/* Header & Controls Card */}
      <Card className="border-t-4 border-t-[#002B49]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#D99B00]" />
                <span>Planificador de Horario Semestral SIGA</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Selecciona tus paralelos para simular tu horario semanal, verificar salas, profesores y detectar topes de bloques.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Sede Selector */}
              <select
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                aria-label="Seleccionar Sede USM"
                className="h-8 rounded-md border bg-background px-2.5 text-xs font-medium"
              >
                {SEDES_USM.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Jornada Selector */}
              <select
                value={selectedJornada}
                onChange={(e) => setSelectedJornada(e.target.value)}
                aria-label="Seleccionar Jornada"
                className="h-8 rounded-md border bg-background px-2.5 text-xs font-medium"
              >
                <option value="Diurna">Diurna</option>
                <option value="Vespertina">Vespertina</option>
              </select>

              {/* Periodo Selector */}
              {periods.length > 0 && (
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  aria-label="Seleccionar Periodo Académico"
                  className="h-8 rounded-md border bg-background px-2.5 text-xs font-semibold text-[#002B49] dark:text-[#D99B00]"
                >
                  {periods.map((p) => (
                    <option key={p} value={p}>
                      Semestre {p}
                    </option>
                  ))}
                </select>
              )}

              {enrolledSiglas.length > 0 && (
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={handleAutoAssignParallels}
                  className="h-8 gap-1.5 text-xs"
                  title="Buscar combinación de paralelos sin topes de horario"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>Auto-asignar sin Topes</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Quick Add Course Input */}
          <div className="relative max-w-md">
            <Input
              placeholder="Agregar asignatura al semestre (ej. INF-253, MAT-022, Física)..."
              value={quickAddSearch}
              onChange={(e) => setQuickAddSearch(e.target.value)}
              className="h-8 text-xs"
            />
            {searchSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md p-1 space-y-0.5">
                {searchSuggestions.map((course) => (
                  <button
                    key={course.sigla}
                    type="button"
                    onClick={() => {
                      enrollCourse(course.sigla);
                      setQuickAddSearch("");
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-muted flex items-center justify-between"
                  >
                    <span>
                      <strong className="font-mono">{course.sigla}</strong> —{" "}
                      {course.nombre}
                    </span>
                    <Plus className="h-3.5 w-3.5 text-[#D99B00]" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conflict Detection Status Banner */}
          {enrolledSiglas.length > 0 && (
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                conflicts.length > 0
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {conflicts.length > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      ¡Se detectaron {conflicts.length} tope(s) de horario!
                    </div>
                    <ul className="mt-1 space-y-0.5 list-disc list-inside">
                      {conflicts.map((c, idx) => (
                        <li key={idx}>
                          <strong>
                            {USM_BAR_DAYS[c.dia]} Bloque {c.pair}:
                          </strong>{" "}
                          {c.entries
                            .map((e) => `${e.sigla} (Par. ${e.paralelo})`)
                            .join(" choca con ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">
                      Horario limpio sin topes de bloques.
                    </span>{" "}
                    Todos los paralelos seleccionados son compatibles entre sí.
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Layout: Course Parallel Picker + Weekly Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Enrolled Courses & Parallel Selector */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-[#002B49] dark:text-[#D99B00]" />
              <span>Ramos Inscritos ({enrolledSiglas.length})</span>
            </h3>
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {enrolledSiglas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center space-y-2">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  No tienes asignaturas marcadas como <strong>Cursando</strong>.
                  Agrégalas desde la Malla Curricular o usando el buscador superior.
                </p>
              </CardContent>
            </Card>
          ) : (
            enrolledSiglas.map((sigla) => {
              const courseObj = curriculum.ramos.find((r) => r.sigla === sigla);
              const areaColor =
                (courseObj && curriculum.areas[courseObj.area]?.color) ||
                "#002B49";
              const parList = parallelsByCourse[sigla] || [];
              const selectedParId = inProgressCourses[sigla]?.selectedParallel;

              return (
                <Card key={sigla} className="overflow-hidden">
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: areaColor }}
                  />
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="font-mono text-[11px]"
                          >
                            {sigla}
                          </Badge>
                          {selectedParId && (
                            <Badge variant="default" className="text-[10px]">
                              Par. {selectedParId}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xs sm:text-sm font-bold mt-1">
                          {courseObj?.nombre || sigla}
                        </CardTitle>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => unenrollCourse(sigla)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        title="Quitar asignatura del semestre"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-3 pt-0 space-y-2">
                    {parList.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">
                        Sin paralelos publicados en {selectedSede} ({selectedJornada}).
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {parList.map((par) => {
                          const isSelected = selectedParId === par.paralelo;
                          const groupedBlocks = groupScheduleBlocks(
                            par.horario || []
                          );
                          return (
                            <button
                              key={par.paralelo}
                              type="button"
                              onClick={() =>
                                setSelectedParallel(
                                  sigla,
                                  isSelected ? undefined : par.paralelo
                                )
                              }
                              className={`w-full text-left p-2 rounded-md border text-[11px] transition-all ${
                                isSelected
                                  ? "border-[#002B49] bg-[#002B49]/10 dark:border-[#D99B00] dark:bg-[#D99B00]/15"
                                  : "hover:border-muted-foreground/40 bg-card/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 font-semibold">
                                <span className="flex items-center gap-1.5">
                                  <Users className="h-3 w-3 text-[#D99B00]" />
                                  <span>Paralelo {par.paralelo}</span>
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  Cupos: {par.cupo}
                                </span>
                              </div>
                              <div className="text-muted-foreground truncate mt-0.5">
                                {par.profesor?.length
                                  ? par.profesor.join(" / ")
                                  : "Profesor por definir"}
                              </div>
                              {groupedBlocks.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {groupedBlocks.map((gb, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.2 rounded bg-muted text-[10px] font-mono"
                                    >
                                      {USM_BAR_DAYS[gb.dia]?.slice(0, 2)} B
                                      {gb.bloqueRange} ({gb.tipo})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Right Column: Weekly Schedule Grid */}
        <div className="lg:col-span-8">
          <Card className="overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full border-collapse text-xs min-w-[640px]">
                <thead>
                  <tr className="bg-[#002B49] text-white">
                    <th className="p-2.5 text-left font-semibold w-28 border-r border-white/15">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#D99B00]" />
                        <span>Bloque USM</span>
                      </div>
                    </th>
                    {visibleDays.map((diaIdx) => (
                      <th
                        key={diaIdx}
                        className="p-2.5 text-center font-semibold border-r border-white/15 last:border-r-0"
                      >
                        {USM_BAR_DAYS[diaIdx]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {USM_BLOCK_PAIRS.map((pairObj) => (
                    <tr key={pairObj.pair} className="hover:bg-muted/20">
                      {/* Block Time Column */}
                      <td className="p-2 border-r bg-muted/30 align-middle">
                        <div className="font-bold text-foreground font-mono">
                          Bloque {pairObj.pair}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {pairObj.time}
                        </div>
                      </td>

                      {/* Day Cells */}
                      {visibleDays.map((diaIdx) => {
                        const cellKey = `${diaIdx}-${pairObj.pair}`;
                        const entries = gridMap[cellKey] || [];
                        const isConflict = entries.length > 1;

                        return (
                          <td
                            key={cellKey}
                            className={`p-1.5 border-r last:border-r-0 align-top h-20 w-[18%] ${
                              isConflict ? "bg-destructive/10" : ""
                            }`}
                          >
                            <div className="space-y-1">
                              {entries.map((entry) => (
                                <div
                                  key={`${entry.sigla}-${entry.paralelo}`}
                                  className={`p-1.5 rounded border text-[11px] leading-tight shadow-2xs ${
                                    isConflict
                                      ? "border-destructive bg-destructive/15"
                                      : "bg-card"
                                  }`}
                                  style={{
                                    borderLeftWidth: "4px",
                                    borderLeftColor: isConflict
                                      ? "#EF4444"
                                      : entry.color,
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-1 font-bold">
                                    <span className="font-mono">
                                      {entry.sigla}
                                    </span>
                                    <span className="text-[10px] px-1 rounded bg-muted font-normal">
                                      {entry.tipo} • P{entry.paralelo}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                    {entry.nombre}
                                  </div>
                                  {entry.sala && (
                                    <div className="text-[10px] font-semibold text-foreground flex items-center gap-0.5 mt-0.5">
                                      <MapPin className="h-2.5 w-2.5 text-[#D99B00]" />
                                      <span>{entry.sala}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
