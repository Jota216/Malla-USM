import {
  EnrolledCourseConfig,
  EvaluationGroup,
  Evaluation,
} from "@/types/academic";
import { useAcademicStore } from "@/store/useAcademicStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  RotateCcw,
  SlidersHorizontal,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";

interface FormulaBuilderProps {
  courseConfig: EnrolledCourseConfig;
}

export function FormulaBuilder({ courseConfig}: FormulaBuilderProps) {
  const {
    updateCourseFormula,
    resetToTemplate,
    setEvaluationScore,
    setRecoveryScore,
  } = useAcademicStore();

  const groups = courseConfig.groups || [];

  // Group modifications
  const handleAddGroup = () => {
    updateCourseFormula(courseConfig.sigla, (prev) => {
      const newGroupId = `group-${Date.now()}`;
      const newGroup: EvaluationGroup = {
        id: newGroupId,
        name: "Nuevo Bloque",
        weight: 20,
        minGrade: null,
        hasRecoveryExam: false,
        recoveryGrade: null,
        evaluations: [
          { id: `eval-${Date.now()}-1`, name: "Evaluación 1", weight: 50, score: null },
          { id: `eval-${Date.now()}-2`, name: "Evaluación 2", weight: 50, score: null },
        ],
      };
      return {
        ...prev,
        groups: [...prev.groups, newGroup],
      };
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    updateCourseFormula(courseConfig.sigla, (prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g.id !== groupId),
    }));
  };

  const handleUpdateGroupName = (groupId: string, name: string) => {
    updateCourseFormula(courseConfig.sigla, (prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
    }));
  };

  const handleUpdateGroupWeight = (groupId: string, weight: number) => {
    updateCourseFormula(courseConfig.sigla, (prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === groupId ? { ...g, weight } : g)),
    }));
  };

  const handleToggleGroupMinGrade = (groupId: string, enabled: boolean) => {
    updateCourseFormula(courseConfig.sigla, (prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId ? { ...g, minGrade: enabled ? 50 : null } : g
      ),
    }));
  };

  const handleUpdateGroupMinGrade = (groupId: string, minGrade: number) => {
    updateCourseFormula(courseConfig.sigla, (prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId ? { ...g, minGrade } : g
      ),
    }));
  };

  const handleToggleRecoveryExam = (groupId: string, enabled: boolean) => {
    updateCourseFormula(courseConfig.sigla, (prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId
          ? { ...g, hasRecoveryExam: enabled, recoveryGrade: enabled ? g.recoveryGrade : null }
          : g
      ),
    }));
  };

  // Evaluation modifications within group
  const handleAddEvaluation = (groupId: string) => {
    updateCourseFormula(courseConfig.sigla, (prev) => ({
      ...prev,
      groups: prev.groups.map((g) => {
        if (g.id !== groupId) return g;
        const count = g.evaluations.length + 1;
        const newEval: Evaluation = {
          id: `eval-${Date.now()}`,
          name: `Evaluación ${count}`,
          weight: 100 / count,
          score: null,
        };
        return {
          ...g,
          evaluations: [...g.evaluations, newEval],
        };
      }),
    }));
  };

  const handleDeleteEvaluation = (groupId: string, evalId: string) => {
    updateCourseFormula(courseConfig.sigla, (prev) => ({
      ...prev,
      groups: prev.groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          evaluations: g.evaluations.filter((e) => e.id !== evalId),
        };
      }),
    }));
  };

  const handleUpdateEvalName = (groupId: string, evalId: string, name: string) => {
    updateCourseFormula(courseConfig.sigla, (prev) => ({
      ...prev,
      groups: prev.groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          evaluations: g.evaluations.map((e) =>
            e.id === evalId ? { ...e, name } : e
          ),
        };
      }),
    }));
  };

  const handleUpdateEvalWeight = (groupId: string, evalId: string, weight: number) => {
    updateCourseFormula(courseConfig.sigla, (prev) => ({
      ...prev,
      groups: prev.groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          evaluations: g.evaluations.map((e) =>
            e.id === evalId ? { ...e, weight } : e
          ),
        };
      }),
    }));
  };

  const handleScoreChange = (
    groupId: string,
    evalId: string,
    valStr: string
  ) => {
    if (valStr.trim() === "") {
      setEvaluationScore(courseConfig.sigla, groupId, evalId, null);
    } else {
      const num = parseFloat(valStr);
      if (!isNaN(num)) {
        setEvaluationScore(courseConfig.sigla, groupId, evalId, Math.max(0, Math.min(100, num)));
      }
    }
  };

  const handleRecoveryScoreChange = (groupId: string, valStr: string) => {
    if (valStr.trim() === "") {
      setRecoveryScore(courseConfig.sigla, groupId, null);
    } else {
      const num = parseFloat(valStr);
      if (!isNaN(num)) {
        setRecoveryScore(courseConfig.sigla, groupId, Math.max(0, Math.min(100, num)));
      }
    }
  };

  const totalGroupsWeight = groups.reduce((acc, g) => acc + (g.weight || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header with Template Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-secondary" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              Configurador de Ponderaciones y Evaluaciones
            </h3>
            <p className="text-xs text-muted-foreground">
              Ajusta las evaluaciones, requisitos mínimos y notas del ramo
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => resetToTemplate(courseConfig.sigla)}
          className="h-8 text-xs gap-1.5"
          title="Restablecer ponderaciones estándar de la USM (70% Certámenes, 30% Tareas)"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Plantilla USM Estándar
        </Button>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {groups.map((group) => {
          const evalWeightSum = group.evaluations.reduce(
            (sum, e) => sum + (e.weight || 0),
            0
          );

          return (
            <div
              key={group.id}
              className="rounded-xl border bg-card/80 p-3 sm:p-4 shadow-2xs space-y-3"
            >
              {/* Group Main Row: Name, Weight, Delete */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Input
                    type="text"
                    value={group.name}
                    onChange={(e) =>
                      handleUpdateGroupName(group.id, e.target.value)
                    }
                    className="h-8 font-bold text-xs sm:text-sm max-w-[220px]"
                    placeholder="Nombre del bloque..."
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={group.weight}
                      onChange={(e) =>
                        handleUpdateGroupWeight(
                          group.id,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-8 w-18 text-xs text-center font-mono"
                    />
                    <span className="text-xs font-semibold text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {groups.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Eliminar este grupo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Group Rule Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-lg bg-muted/30 text-xs">
                {/* Sudden-death Minimum Requirement Switch */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#D99B00]" />
                    <Label
                      htmlFor={`min-req-${group.id}`}
                      className="text-xs cursor-pointer"
                    >
                      Exigir promedio mínimo en este bloque
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`min-req-${group.id}`}
                      checked={group.minGrade !== null && group.minGrade !== undefined}
                      onCheckedChange={(checked) =>
                        handleToggleGroupMinGrade(group.id, checked)
                      }
                    />
                    {group.minGrade !== null && group.minGrade !== undefined && (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={group.minGrade}
                        onChange={(e) =>
                          handleUpdateGroupMinGrade(
                            group.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-7 w-14 text-center font-mono text-xs"
                      />
                    )}
                  </div>
                </div>

                {/* Recovery Exam Switch */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <LifeBuoy className="h-4 w-4 text-sky-500" />
                    <Label
                      htmlFor={`rec-exam-${group.id}`}
                      className="text-xs cursor-pointer"
                    >
                      Habilitar Certamen Recuperativo
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`rec-exam-${group.id}`}
                      checked={!!group.hasRecoveryExam}
                      onCheckedChange={(checked) =>
                        handleToggleRecoveryExam(group.id, checked)
                      }
                    />
                    {group.hasRecoveryExam && (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Nota R"
                        value={
                          group.recoveryGrade !== null && group.recoveryGrade !== undefined
                            ? group.recoveryGrade
                            : ""
                        }
                        onChange={(e) =>
                          handleRecoveryScoreChange(group.id, e.target.value)
                        }
                        className="h-7 w-16 text-center font-mono text-xs"
                        title="Nota obtenida en el Recuperativo (reemplaza la peor nota)"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Evaluations Table / List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase px-1">
                  <span>Evaluación</span>
                  <div className="flex items-center gap-8 mr-6">
                    <span>Peso</span>
                    <span>Nota (0-100)</span>
                  </div>
                </div>

                {group.evaluations.map((evalItem) => (
                  <div
                    key={evalItem.id}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-md border bg-background text-xs"
                  >
                    <Input
                      type="text"
                      value={evalItem.name}
                      onChange={(e) =>
                        handleUpdateEvalName(group.id, evalItem.id, e.target.value)
                      }
                      className="h-7 text-xs flex-1 max-w-[200px]"
                      placeholder="Nombre evaluación..."
                    />

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={evalItem.weight}
                          onChange={(e) =>
                            handleUpdateEvalWeight(
                              group.id,
                              evalItem.id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-7 w-16 text-center font-mono text-xs"
                        />
                        <span className="text-[10px] text-muted-foreground">%</span>
                      </div>

                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        placeholder="x (incógnita)"
                        value={
                          evalItem.score !== null && evalItem.score !== undefined
                            ? evalItem.score
                            : ""
                        }
                        onChange={(e) =>
                          handleScoreChange(group.id, evalItem.id, e.target.value)
                        }
                        className="h-7 w-24 text-center font-mono text-xs placeholder:text-muted-foreground/60"
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleDeleteEvaluation(group.id, evalItem.id)
                        }
                        disabled={group.evaluations.length <= 1}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddEvaluation(group.id)}
                    className="h-7 text-xs gap-1 text-primary hover:text-primary"
                  >
                    <Plus className="h-3 w-3" />
                    Agregar Evaluación
                  </Button>

                  <span className="text-[10px] text-muted-foreground">
                    Suma ponderaciones internas:{" "}
                    <strong
                      className={
                        Math.abs(evalWeightSum - 100) > 1
                          ? "text-amber-600"
                          : "text-foreground"
                      }
                    >
                      {evalWeightSum.toFixed(1)}%
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Group and Weight Check */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddGroup}
          className="text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Agregar Nuevo Bloque de Evaluación
        </Button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Ponderación Total de Bloques:</span>
          <Badge
            variant={
              Math.abs(totalGroupsWeight - 100) < 0.1 ? "success" : "warning"
            }
            className="font-mono text-xs"
          >
            {totalGroupsWeight.toFixed(1)}%
          </Badge>
        </div>
      </div>
    </div>
  );
}
