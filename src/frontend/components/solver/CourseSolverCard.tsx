import * as React from "react";
import {
  SubFormulaCourseSolveResult,
  SubFormulaEvaluation,
  Course,
  AreaInfo,
  CourseFinalFormula,
} from "@/shared/types/academic";
import { Card, CardHeader, CardContent } from "@/frontend/components/ui/card";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Trash2,
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
} from "lucide-react";

interface CourseSolverCardProps {
  sigla: string;
  formula: CourseFinalFormula;
  courseInfo: Course | null;
  areaInfo: AreaInfo | null;
  solveResult: SubFormulaCourseSolveResult;
  onUnenroll: (sigla: string) => void;
  onScoreChange: (
    sigla: string,
    blockId: string,
    evalId: string,
    score: number | null
  ) => void;
  onQuickApprove?: (sigla: string, grade: number) => void;
}

/**
 * Identifies which evaluations were discarded under the drop_worst rule.
 */
function getDroppedEvalIds(
  evaluations: SubFormulaEvaluation[],
  droppedScores?: number[]
): Set<string> {
  const set = new Set<string>();
  if (!droppedScores || droppedScores.length === 0) return set;

  const remainingDrops = [...droppedScores];
  const sorted = evaluations
    .filter((e) => e.score !== null && e.score !== undefined && !isNaN(e.score))
    .sort((a, b) => Number(a.score) - Number(b.score));

  for (const ev of sorted) {
    const idx = remainingDrops.findIndex(
      (d) => Math.abs(d - Number(ev.score)) < 0.001
    );
    if (idx !== -1) {
      set.add(ev.id);
      remainingDrops.splice(idx, 1);
    }
  }
  return set;
}

export function CourseSolverCard({
  sigla,
  formula,
  courseInfo,
  areaInfo,
  solveResult,
  onUnenroll,
  onScoreChange,
  onQuickApprove,
}: CourseSolverCardProps) {
  const blocks = formula.subFormulas || [];

  // Calculate total unknowns (Z) and guaranteed points with 0 in remaining (X)
  const totalUnknowns = blocks.reduce(
    (acc, b) =>
      acc +
      b.evaluations.filter(
        (e) => e.score === null || e.score === undefined || isNaN(e.score)
      ).length,
    0
  );

  const normalizedWeights = React.useMemo(() => {
    const sum = blocks.reduce((acc, b) => acc + (b.weightInFinal > 0 ? b.weightInFinal : 0), 0);
    if (sum <= 0) return blocks.map(() => 1 / blocks.length);
    return blocks.map((b) => (b.weightInFinal > 0 ? b.weightInFinal / sum : 0));
  }, [blocks]);

  const accumulatedPointsWithZero = React.useMemo(() => {
    return solveResult.blocks.reduce(
      (acc, b, idx) => acc + normalizedWeights[idx] * (b.projectedAverageWithZero ?? 0),
      0
    );
  }, [solveResult.blocks, normalizedWeights]);

  const X = accumulatedPointsWithZero;
  const Y = solveResult.requiredUniformGrade;
  const Z = totalUnknowns;

  const isApproved =
    solveResult.status === "APPROVED" ||
    (X >= formula.passingGrade &&
      solveResult.blocks.every((b) => b.minGradeRequired === null || (b.requiredForBlockMin ?? 0) <= 0));

  const isFailed = solveResult.status === "FAILED" && Z === 0;

  const isCriticalMin =
    solveResult.bindingCondition === "BLOCK_MIN" &&
    Y !== null &&
    Y <= 80 &&
    !isApproved &&
    !isFailed;

  const isInDanger =
    (solveResult.status === "IN_DANGER" ||
      solveResult.status === "REQUIRES_PERFECT" ||
      (Y !== null && Y > 80)) &&
    !isApproved &&
    !isFailed;

  const isOnTrack = !isApproved && !isFailed && !isInDanger && !isCriticalMin;

  // Build the stylized monospace formula string
  const formulaEquation = React.useMemo(() => {
    const parts = blocks.map((b, idx) => {
      const w = normalizedWeights[idx];
      return `${w.toFixed(2)} * ${b.code}`;
    });
    return `NF = ${parts.join(" + ")} (Meta: ≥ ${formula.passingGrade})`;
  }, [blocks, normalizedWeights, formula.passingGrade]);

  const conditionString = React.useMemo(() => {
    const mins = blocks.filter((b) => b.minGradeRequired !== null);
    if (mins.length === 0) return null;
    const conds = mins.map((b) => `${b.code} ≥ ${b.minGradeRequired}`).join(" ∧ ");
    return `Condición: ${conds} (sino NF = min)`;
  }, [blocks]);

  return (
    <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg rounded-xl overflow-hidden transition-all hover:border-zinc-700/80">
      {/* 1. Header */}
      <CardHeader className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/90 flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: areaInfo?.color || "#0B72D4" }}
              title={areaInfo?.nombre || "Área"}
            />
            <span className="font-mono font-black text-base sm:text-lg tracking-tight text-zinc-100">
              {sigla}
            </span>
          </div>

          <h3 className="font-semibold text-sm sm:text-base text-zinc-200">
            {courseInfo?.nombre || sigla}
          </h3>

          {courseInfo && (
            <Badge
              variant="outline"
              className="border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[11px] font-normal"
            >
              Sem. {courseInfo.semestre} • {courseInfo.creditos_usm} USM / {courseInfo.creditos_sct} SCT
            </Badge>
          )}

          {isApproved && (
            <Badge className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-xs gap-1 font-bold">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Aprobado ({solveResult.currentFinalGrade.toFixed(1)})
            </Badge>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onQuickApprove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onQuickApprove(sigla, Math.round(solveResult.currentFinalGrade || 55))}
              className="h-8 px-2.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 gap-1.5"
              title="Aprobar ramo y transferir nota final a tu malla curricular"
            >
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Aprobar Ramo</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onUnenroll(sigla)}
            className="h-8 w-8 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
            title="Desinscribir ramo del semestre"
            aria-label="Desinscribir asignatura"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* 2. Sub-formulas Section */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Cálculos Complementarios (Sub-fórmulas)</span>
            <span className="font-mono text-zinc-500 font-normal">
              {blocks.length} {blocks.length === 1 ? "bloque" : "bloques"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {blocks.map((block) => {
              const bResult = solveResult.blocks.find((b) => b.blockId === block.id);
              const avg = bResult?.currentAverage;
              const minReq = block.minGradeRequired;
              const hasMin = minReq !== null;
              const meetsMin = bResult?.meetsMinGrade ?? false;

              let typeDesc = "Promedio simple";
              if (block.type === "drop_worst") {
                typeDesc = `${block.count} Controles, descarta ${block.dropWorstCount || 1} peor`;
              } else if (block.type === "simple_average") {
                typeDesc = `${block.count} ${block.name}`;
              } else if (block.type === "weighted") {
                typeDesc = `Ponderado interno`;
              }

              return (
                <div
                  key={block.id}
                  className="rounded-lg border border-zinc-800/90 bg-zinc-950/50 p-2.5 flex flex-col justify-between gap-1.5 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-amber-400 dark:text-amber-300">
                      {block.code}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400">
                      {Math.round(block.weightInFinal * (block.weightInFinal <= 1 ? 100 : 1))}%
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 line-clamp-1" title={block.name}>
                    {typeDesc}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50 text-[11px]">
                    <span className="text-zinc-400">
                      Promedio:{" "}
                      <strong className="text-zinc-100 font-mono">
                        {avg !== null && avg !== undefined ? avg.toFixed(1) : "—"}
                      </strong>
                    </span>

                    {hasMin ? (
                      (() => {
                        const reqMin = bResult?.requiredForBlockMin;
                        const isReachable = reqMin !== null && reqMin !== undefined && reqMin <= 100;
                        return (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              meetsMin
                                ? "bg-emerald-950/70 text-emerald-400 border-emerald-800/60"
                                : isReachable
                                ? "bg-amber-950/70 text-amber-400 border-amber-800/60"
                                : "bg-rose-950/70 text-rose-400 border-rose-800/60"
                            }`}
                            title={
                              meetsMin
                                ? "Cumple el requisito mínimo de bloque"
                                : reqMin !== null && reqMin !== undefined
                                ? `Requiere promediar ${reqMin.toFixed(1)} en lo restante`
                                : "No cumple mínimo"
                            }
                          >
                            Mín: ≥ {minReq}
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-[10px] text-zinc-500">Sin mín.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Final Formula & Condition Line */}
        <div className="rounded-lg bg-zinc-950/80 border border-zinc-800/80 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-xs font-mono">
          <div className="text-zinc-200 font-medium tracking-tight">
            <span className="text-amber-400 font-bold">{formulaEquation}</span>
          </div>

          {conditionString && (
            <div className="text-[11px] text-zinc-400 flex items-center gap-1">
              <span className="text-zinc-500">•</span>
              <span>{conditionString}</span>
            </div>
          )}
        </div>

        {/* 4. Grade Grid (Numeric Inputs) */}
        <div className="space-y-3 pt-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Grilla de Evaluaciones</span>
            <span className="text-zinc-500 text-[10px] font-normal">
              Escala 0 – 100 • Deja vacío (—) para incógnita
            </span>
          </div>

          <div className="space-y-3">
            {blocks.map((block) => {
              const bResult = solveResult.blocks.find((b) => b.blockId === block.id);
              const droppedIds = getDroppedEvalIds(
                block.evaluations,
                bResult?.droppedScores
              );

              return (
                <div
                  key={block.id}
                  className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-2.5 sm:p-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-200">
                        {block.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        ({block.code} • {Math.round(block.weightInFinal * (block.weightInFinal <= 1 ? 100 : 1))}%)
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 font-mono">
                      {block.evaluations.filter((e) => e.score !== null).length} / {block.evaluations.length} ingresadas
                    </div>
                  </div>

                  {/* Inputs row */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {block.evaluations.map((ev, idx) => {
                      const isDropped = droppedIds.has(ev.id);
                      const isUnknown = ev.score === null || ev.score === undefined || isNaN(ev.score);
                      const displayLabel = ev.name || `${block.prefix || block.code}${idx + 1}`;

                      return (
                        <div
                          key={ev.id}
                          className="flex flex-col items-center gap-1 relative group"
                        >
                          <span
                            className={`text-[10px] font-mono uppercase tracking-wider ${
                              isDropped
                                ? "text-zinc-500 line-through"
                                : isUnknown
                                ? "text-amber-400/80"
                                : "text-zinc-300 font-semibold"
                            }`}
                            title={ev.name}
                          >
                            {block.prefix ? `${block.prefix}${idx + 1}` : displayLabel}
                          </span>

                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={ev.score !== null && ev.score !== undefined ? ev.score : ""}
                              placeholder="—"
                              onChange={(e) => {
                                const raw = e.target.value.trim();
                                if (raw === "") {
                                  onScoreChange(sigla, block.id, ev.id, null);
                                } else {
                                  const num = Number(raw);
                                  if (!isNaN(num)) {
                                    onScoreChange(
                                      sigla,
                                      block.id,
                                      ev.id,
                                      Math.min(100, Math.max(0, num))
                                    );
                                  }
                                }
                              }}
                              className={`w-14 sm:w-16 h-8 text-center text-xs sm:text-sm font-mono font-medium rounded-md transition-all outline-none focus:ring-1 ${
                                isDropped
                                  ? "line-through opacity-55 text-zinc-400 bg-zinc-900 border border-zinc-800"
                                  : isUnknown
                                  ? "bg-zinc-950 border border-zinc-800/90 text-zinc-400 focus:border-amber-500 focus:ring-amber-500/40 placeholder:text-zinc-600"
                                  : "bg-zinc-950 border border-zinc-700 text-zinc-100 font-semibold focus:border-[#002B49] focus:ring-[#D99B00]"
                              }`}
                              title={
                                isDropped
                                  ? "Esta nota es la más baja y ha sido descartada por la regla del ramo"
                                  : isUnknown
                                  ? "Incógnita (x_i). Ingresa nota tentativa (0 a 100)"
                                  : `Nota registrada: ${ev.score}`
                              }
                            />
                            {isDropped && (
                              <span
                                className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-zinc-400 bg-zinc-800/90 px-1 rounded whitespace-nowrap pointer-events-none"
                                title="Nota descartada"
                              >
                                Descartada
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Único Banner de Diagnóstico Limpio por Ramo */}
        <div className="pt-2">
          {/* APROBADO */}
          {isApproved && (
            <div className="rounded-xl border border-emerald-700/70 bg-emerald-950/40 p-3.5 sm:p-4 text-emerald-200 flex items-start gap-3 shadow-md">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs sm:text-sm">
                <div className="font-bold text-emerald-300">
                  ¡Aprobado! Puntos asegurados: {X.toFixed(1)} pts.
                </div>
                <div className="text-emerald-200/90">
                  Aún sacando 0 en lo restante apruebas el ramo (NF proyectada: ≥ 55).
                </div>
              </div>
            </div>
          )}

          {/* REPROBADO (Todo evaluado y no aprobó) */}
          {isFailed && (
            <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-3.5 sm:p-4 text-rose-200 flex items-start gap-3 shadow-md">
              <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs sm:text-sm">
                <div className="font-bold text-rose-300">
                  Reprobado: Nota final obtenida: {solveResult.currentFinalGrade.toFixed(1)}.
                </div>
                <div className="text-rose-200/90">
                  No alcanza el mínimo de aprobación (55) o no cumplió con el requisito de bloque.
                </div>
              </div>
            </div>
          )}

          {/* EN PELIGRO / REFIERE RECUPERATIVO / REQ > 80 O > 100 */}
          {isInDanger && (
            <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-3.5 sm:p-4 text-rose-200 flex items-start gap-3 shadow-md">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs sm:text-sm">
                <div className="font-bold text-rose-300">
                  En Peligro: La nota requerida supera 80 ({Y !== null ? Y.toFixed(1) : ">100"}).
                </div>
                <div className="text-rose-200/90">
                  {Y !== null && Y > 100
                    ? `Matemáticamente inviable con escala normal (exige ${Y.toFixed(1)}). Requiere examen recuperativo o convalidación extraordinaria.`
                    : `Necesitas promediar ${Y?.toFixed(1) ?? "—"} en las ${Z} evaluaciones restantes. Requiere rendimiento extraordinario o examen recuperativo.`}
                </div>
              </div>
            </div>
          )}

          {/* ATENCIÓN: BLOQUE MÍNIMO ES LA CONDICIÓN VINCULANTE */}
          {isCriticalMin && (
            <div className="rounded-xl border border-amber-800/80 bg-amber-950/40 p-3.5 sm:p-4 text-amber-200 flex items-start gap-3 shadow-md">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs sm:text-sm">
                <div className="font-bold text-amber-300">
                  Atención: El bloque [{solveResult.bindingBlockCode || "Mínimo"}] exige promediar {Y?.toFixed(1) ?? "—"}
                </div>
                <div className="text-amber-200/90">
                  En los certámenes/evaluaciones restantes para alcanzar el mínimo de 50 (restricción más exigente que la meta global de NF ≥ 55).
                </div>
              </div>
            </div>
          )}

          {/* EN CARRERA (NORMAL) */}
          {isOnTrack && (
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/80 p-3.5 sm:p-4 text-zinc-200 flex items-start gap-3 shadow-md">
              <TrendingUp className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs sm:text-sm">
                <div className="font-bold text-zinc-100">
                  Puntos acumulados: <span className="text-amber-400">{X.toFixed(1)} pts</span>.
                </div>
                <div className="text-zinc-300">
                  Necesitas promediar{" "}
                  <strong className="text-blue-300 font-mono text-sm">
                    {Y !== null ? Y.toFixed(1) : "—"}
                  </strong>{" "}
                  en las {Z} {Z === 1 ? "evaluación restante" : "evaluaciones restantes"} para cumplir los mínimos de bloque (≥ 50) y aprobar con NF ≥ 55.
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
