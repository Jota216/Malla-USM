import * as React from "react";
import {
  EnrolledCourseConfig,
  UnknownEvaluationDetail,
  SliderRebalanceResult,
} from "@/types/academic";
import { rebalanceSliders } from "@/engine/gradeSolver";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sliders, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";

interface InteractiveSlidersProps {
  config: EnrolledCourseConfig;
  unknowns: UnknownEvaluationDetail[];
  passingTarget?: number;
}

export function InteractiveSliders({
  config,
  unknowns,
  passingTarget = 55,
}: InteractiveSlidersProps) {
  // evalId -> hypothetical score
  const [fixedValues, setFixedValues] = React.useState<Record<string, number>>({});

  // Reset when course config or unknowns list changes
  React.useEffect(() => {
    setFixedValues({});
  }, [config.sigla, unknowns.length]);

  const rebalanceResult: SliderRebalanceResult = React.useMemo(() => {
    return rebalanceSliders(config, fixedValues, passingTarget);
  }, [config, fixedValues, passingTarget]);

  const handleSliderChange = (evalId: string, val: number[]) => {
    const score = val[0];
    setFixedValues((prev) => ({
      ...prev,
      [evalId]: score,
    }));
  };

  const handleResetSliders = () => {
    setFixedValues({});
  };

  if (unknowns.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        No hay evaluaciones pendientes (incógnitas) para simular con sliders.
      </div>
    );
  }

  const {
    simulatedFinalGrade,
    otherUnknownsRequiredGrade,
    values,
    isFeasible,
    bindingConstraintDescription,
  } = rebalanceResult;

  return (
    <div className="space-y-4 rounded-xl border bg-card/60 p-4">
      {/* Header and Reset */}
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-secondary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Simulador Dinámico de Despeje
          </h4>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetSliders}
          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          title="Restablecer simulación"
        >
          <RotateCcw className="h-3 w-3" />
          Restablecer
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Mueve el control de una evaluación hipotética para ver en tiempo real qué nota necesitas en las demás evaluaciones para alcanzar exactamente la nota 55.
      </p>

      {/* Sliders List */}
      <div className="space-y-4 pt-1">
        {unknowns.map((u) => {
          const isFixedByUser = fixedValues[u.evalId] !== undefined;
          const currentScore =
            values[u.evalId] !== undefined
              ? Math.round(values[u.evalId])
              : Math.round(u.requiredUniformGrade ?? 55);

          return (
            <div key={u.evalId} className="space-y-1.5 p-2.5 rounded-lg border bg-background/50">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-foreground">
                    {u.evalName}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-1.5">
                    ({u.groupName} • {Math.round(u.globalWeight * 100)}% global)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isFixedByUser ? (
                    <Badge variant="secondary" className="text-[10px] bg-secondary/20 text-slate-900 font-bold dark:text-slate-100">
                      Fijado: {currentScore}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Requerido: {currentScore}
                    </Badge>
                  )}
                </div>
              </div>

              <Slider
                value={[currentScore]}
                min={0}
                max={100}
                step={1}
                onValueChange={(val) => handleSliderChange(u.evalId, val)}
                className="py-1 cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      {/* Realtime Simulation Summary Banner */}
      <div className="p-3 rounded-lg border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase font-bold text-muted-foreground">
            Nota Final Simulada Resultante
          </div>
          <div className="text-lg font-black flex items-center gap-2">
            <span
              className={
                simulatedFinalGrade >= 55 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              }
            >
              {simulatedFinalGrade.toFixed(1)}
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              (Objetivo: $\ge$ 55)
            </span>
          </div>
        </div>

        {otherUnknownsRequiredGrade !== null && (
          <div className="sm:text-right">
            <div className="text-[11px] uppercase font-bold text-muted-foreground">
              Exigencia en restantes libres
            </div>
            <div className="text-sm font-bold text-foreground">
              {otherUnknownsRequiredGrade > 100 ? (
                <span className="text-destructive font-bold">
                  {otherUnknownsRequiredGrade.toFixed(1)} (Inalcanzable)
                </span>
              ) : otherUnknownsRequiredGrade < 0 ? (
                <span className="text-emerald-600 font-bold">0 pts (Sobra puntaje)</span>
              ) : (
                <span>{otherUnknownsRequiredGrade.toFixed(1)} pts</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Constraints Warning / Success Feedback */}
      {!isFeasible && (
        <Alert variant="destructive" className="py-2 text-xs">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {bindingConstraintDescription ||
              "Con estos puntajes hipotéticos, las notas restantes superan el máximo de 100 puntos posibles."}
          </AlertDescription>
        </Alert>
      )}

      {isFeasible && simulatedFinalGrade >= 55 && (
        <Alert variant="success" className="py-2 text-xs">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            ¡Combinación viable! Cumples la meta global de aprobación y todas las restricciones mínimas de grupo.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
