import * as React from "react";
import { CourseSolveResult, EnrolledCourseConfig } from "@/types/academic";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InteractiveSliders } from "./InteractiveSliders";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Sliders,
  Scale,
  ShieldAlert,
} from "lucide-react";

interface SolverOutputProps {
  solveResult: CourseSolveResult;
  courseConfig: EnrolledCourseConfig;
}

export function SolverOutput({ solveResult, courseConfig }: SolverOutputProps) {
  const [solverMode, setSolverMode] = React.useState<"uniform" | "sliders">(
    "uniform"
  );

  const {
    status,
    finalGrade,
    accumulatedPoints,
    remainingWeight,
    effectiveRequiredGrade,
    bindingConstraint,
    bindingGroupName,
    groups,
    unknownEvaluations,
    recoveryScenario,
    message,
  } = solveResult;

  // Percentage of 55 points achieved so far
  const progressTo55 = Math.min(100, (accumulatedPoints / 55) * 100);

  // Status visual attributes
  const isApproved = status === "APPROVED";
  const isInDanger = status === "IN_DANGER";
  const isFailed = status === "FAILED";
  const requiresRecovery = status === "REQUIRES_RECOVERY";
  const isOnTrack = status === "ON_TRACK";

  return (
    <div className="space-y-4">
      {/* Main KPI Card */}
      <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top Header with Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Diagnóstico Algebraico
            </span>
            <h3 className="text-lg font-black text-foreground flex items-center gap-2">
              <span>{courseConfig.sigla}</span>
              <Badge
                variant={
                  isApproved
                    ? "success"
                    : isOnTrack
                    ? "usm"
                    : isInDanger
                    ? "warning"
                    : "destructive"
                }
                className="text-xs"
              >
                {isApproved && "Aprobado"}
                {isOnTrack && "En Carrera"}
                {isInDanger && "En Peligro"}
                {requiresRecovery && "Requiere Recuperativo"}
                {isFailed && "Reprobado"}
              </Badge>
            </h3>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              Puntos Acumulados ($P_&#123;acum&#125;$)
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#002B49] dark:text-[#D99B00]">
              {accumulatedPoints.toFixed(1)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                / 55 pts
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar towards 55 */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">
              Progreso hacia el mínimo de aprobación (55)
            </span>
            <span className="font-bold text-foreground">
              {progressTo55.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={progressTo55}
            className="h-2.5 bg-slate-200 dark:bg-slate-800"
            indicatorClassName={
              isApproved
                ? "bg-emerald-600"
                : isInDanger
                ? "bg-amber-500"
                : isFailed
                ? "bg-destructive"
                : "bg-[#002B49] dark:bg-[#D99B00]"
            }
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0 pts</span>
            <span>Meta: 55 pts</span>
            <span>100 pts</span>
          </div>
        </div>

        {/* Realtime Diagnostic Alert Banner */}
        {isApproved && (
          <Alert variant="success" className="py-3">
            <CheckCircle2 className="h-5 w-5" />
            <AlertTitle className="text-sm font-bold">
              ¡Aprobación Asegurada!
            </AlertTitle>
            <AlertDescription className="text-xs">{message}</AlertDescription>
          </Alert>
        )}

        {isOnTrack && (
          <Alert variant="info" className="py-3">
            <TrendingUp className="h-5 w-5" />
            <AlertTitle className="text-sm font-bold">
              Despeje de Nota Requerida
            </AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              <div>{message}</div>
              {bindingConstraint === "GROUP_MIN" && (
                <div className="font-semibold text-amber-700 dark:text-amber-400 mt-1">
                  Nota: La restricción de promedio mínimo en &quot;{bindingGroupName}&quot; es más exigente que la meta global de 55.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isInDanger && (
          <Alert variant="warning" className="py-3">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-sm font-bold">
              ¡Exigencia Alta (Zona de Riesgo)!
            </AlertTitle>
            <AlertDescription className="text-xs">{message}</AlertDescription>
          </Alert>
        )}

        {(isFailed || requiresRecovery) && (
          <Alert variant="destructive" className="py-3">
            <XCircle className="h-5 w-5" />
            <AlertTitle className="text-sm font-bold">
              {requiresRecovery
                ? "Requiere Certamen Recuperativo"
                : "Ramo en Situación Crítica"}
            </AlertTitle>
            <AlertDescription className="text-xs">{message}</AlertDescription>
          </Alert>
        )}

        {/* Global Equations Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-2.5 rounded-lg border bg-muted/30">
            <div className="text-[10px] font-bold uppercase text-muted-foreground">
              Nota Requerida
            </div>
            <div className="text-base sm:text-lg font-black text-foreground">
              {effectiveRequiredGrade !== null ? (
                effectiveRequiredGrade > 100 ? (
                  <span className="text-destructive font-black">&gt; 100</span>
                ) : effectiveRequiredGrade <= 0 ? (
                  <span className="text-emerald-600">0 (Listo)</span>
                ) : (
                  effectiveRequiredGrade.toFixed(1)
                )
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
            <div className="text-[9px] text-muted-foreground">
              {bindingConstraint === "GROUP_MIN"
                ? `Limitado por ${bindingGroupName}`
                : "Promedio global"}
            </div>
          </div>

          <div className="p-2.5 rounded-lg border bg-muted/30">
            <div className="text-[10px] font-bold uppercase text-muted-foreground">
              Ponderación Libre
            </div>
            <div className="text-base sm:text-lg font-black text-foreground">
              {Math.round(remainingWeight * 100)}%
            </div>
            <div className="text-[9px] text-muted-foreground">
              {unknownEvaluations.length} notas pendientes
            </div>
          </div>

          <div className="p-2.5 rounded-lg border bg-muted/30">
            <div className="text-[10px] font-bold uppercase text-muted-foreground">
              Nota Actual Calculada
            </div>
            <div className="text-base sm:text-lg font-black text-foreground">
              {finalGrade.toFixed(1)}
            </div>
            <div className="text-[9px] text-muted-foreground">
              Con notas conocidas
            </div>
          </div>

          <div className="p-2.5 rounded-lg border bg-muted/30">
            <div className="text-[10px] font-bold uppercase text-muted-foreground">
              Condición Crítica
            </div>
            <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
              {bindingConstraint === "NONE" && "Ninguna"}
              {bindingConstraint === "GLOBAL" && "Puntos Globales"}
              {bindingConstraint === "GROUP_MIN" && "Mínimo de Grupo"}
            </div>
            <div className="text-[9px] text-muted-foreground">
              {bindingConstraint === "GROUP_MIN"
                ? bindingGroupName
                : "Meta NF $\\ge$ 55"}
            </div>
          </div>
        </div>

        {/* Group Details summary */}
        <div className="pt-2 border-t space-y-1.5">
          <div className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
            <span>Resumen por Bloque de Evaluación</span>
            <span className="text-[10px] font-normal">Requisitos mínimos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {groups.map((grp) => (
              <div
                key={grp.groupId}
                className={`p-2 rounded-md border flex items-center justify-between ${
                  !grp.meetsMinGrade
                    ? "border-destructive/40 bg-destructive/5"
                    : "bg-muted/20"
                }`}
              >
                <div>
                  <div className="font-semibold text-foreground">
                    {grp.groupName} ({Math.round(grp.groupWeight * 100)}%)
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Promedio actual:{" "}
                    <strong>
                      {grp.currentAverage !== null ? grp.currentAverage : "S/N"}
                    </strong>
                    {grp.minGradeRequired !== null && (
                      <span> • Mínimo: {grp.minGradeRequired}</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {grp.minGradeRequired !== null && (
                    <Badge
                      variant={grp.meetsMinGrade ? "success" : "destructive"}
                      className="text-[10px]"
                    >
                      {grp.meetsMinGrade ? "Cumple" : "En Riesgo"}
                    </Badge>
                  )}
                  {grp.recoveryApplied && (
                    <Badge variant="secondary" className="text-[9px] block mt-0.5">
                      Recuperativo aplicado
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recovery Exam Simulation Section */}
      {recoveryScenario && recoveryScenario.needed && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h4 className="font-bold text-sm text-foreground">
              Simulación de Certamen Recuperativo
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
            {recoveryScenario.description}
          </p>
          {recoveryScenario.minScoreNeeded !== null && (
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="warning" className="text-xs font-mono">
                Nota mínima en Recuperativo: {recoveryScenario.minScoreNeeded}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                (Reemplaza la peor evaluación registrada de {recoveryScenario.originalGrade})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Mode Switcher: Uniform Solve vs Interactive Sliders */}
      {unknownEvaluations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Modo de Exploración
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant={solverMode === "uniform" ? "usm" : "outline"}
                size="sm"
                onClick={() => setSolverMode("uniform")}
                className="h-7 text-xs gap-1"
              >
                <Scale className="h-3.5 w-3.5" />
                Despeje Uniforme
              </Button>
              <Button
                variant={solverMode === "sliders" ? "usm" : "outline"}
                size="sm"
                onClick={() => setSolverMode("sliders")}
                className="h-7 text-xs gap-1"
              >
                <Sliders className="h-3.5 w-3.5" />
                Sliders Interactivos
              </Button>
            </div>
          </div>

          {solverMode === "uniform" ? (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-secondary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Despeje Algebraico Equilibrado (Nota Uniforme)
                </h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Si obtienes la misma calificación en todas las evaluaciones restantes, esta es la nota exacta requerida:
              </p>

              <div className="space-y-2">
                {unknownEvaluations.map((u) => (
                  <div
                    key={u.evalId}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {u.evalName}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {u.groupName} • Peso global: {Math.round(u.globalWeight * 100)}%
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-foreground font-mono">
                        {u.requiredUniformGrade !== null
                          ? u.requiredUniformGrade > 100
                            ? "> 100 (Inalcanzable)"
                            : `${u.requiredUniformGrade} pts`
                          : "Listo"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <InteractiveSliders
              config={courseConfig}
              unknowns={unknownEvaluations}
              passingTarget={55}
            />
          )}
        </div>
      )}
    </div>
  );
}
