import * as React from "react";
import {
  Course,
  CourseFinalFormula,
  PiecewiseAlphaRule,
  SubFormulaBlock,
  SubFormulaType,
} from "@/shared/types/academic";
import {
  USM_FORMULA_PRESETS,
  buildFormulaExpression,
  inferCourseFormulaConfig,
} from "@/wolfram-solver/templates/formulaPresets";
import { sigaService } from "@/curricula/services/sigaService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/frontend/components/ui/dialog";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Plus,
  Trash2,
  RotateCcw,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
} from "lucide-react";

interface FormulaEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sigla: string;
  courseInfo: Course | null;
  currentFormula: CourseFinalFormula;
  sede?: string;
  onSaveFormula: (newFormula: CourseFinalFormula) => void;
}

/**
 * Ajusta el arreglo de evaluaciones de un bloque cuando cambia `count` o `prefix`,
 * preservando las notas que el estudiante ya haya ingresado.
 */
function resizeEvaluations(
  block: SubFormulaBlock,
  newCount: number,
  newPrefix?: string
): SubFormulaBlock["evaluations"] {
  const safeCount = Math.max(1, Math.min(12, Math.round(newCount || 1)));
  const prefix = (newPrefix ?? block.prefix ?? block.code ?? "E").trim();
  const existing = block.evaluations || [];

  return Array.from({ length: safeCount }, (_, idx) => {
    const prev = existing[idx];
    const defaultName = `${prefix}${idx + 1}`;
    return {
      id: prev?.id || `${block.id}_${idx + 1}`,
      name: prev?.name || defaultName,
      weight: prev?.weight && prev.weight > 0 ? prev.weight : 1,
      score: prev?.score !== undefined ? prev.score : null,
    };
  });
}

export function FormulaEditorModal({
  open,
  onOpenChange,
  sigla,
  courseInfo,
  currentFormula,
  sede = "Casa Central Valparaíso",
  onSaveFormula,
}: FormulaEditorModalProps) {
  const [blocks, setBlocks] = React.useState<SubFormulaBlock[]>([]);
  const [passingGrade, setPassingGrade] = React.useState<number>(55);
  const [applyPenaltyRule, setApplyPenaltyRule] = React.useState<boolean>(true);
  const [piecewiseAlpha, setPiecewiseAlpha] = React.useState<
    PiecewiseAlphaRule | undefined
  >(undefined);
  const [finalGradeMultiplier, setFinalGradeMultiplier] =
    React.useState<number>(1);
  const [finalGradeBonusPoints, setFinalGradeBonusPoints] =
    React.useState<number>(0);
  const [source, setSource] = React.useState<CourseFinalFormula["source"]>("custom");
  const [sourceLabel, setSourceLabel] = React.useState<string>("");
  const [requirementsNote, setRequirementsNote] = React.useState<string>("");
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);

  // Sincronizar estado local cuando se abre el modal
  React.useEffect(() => {
    if (!open) return;
    const clonedBlocks: SubFormulaBlock[] = JSON.parse(
      JSON.stringify(currentFormula.subFormulas || [])
    );
    setBlocks(clonedBlocks);
    setPassingGrade(currentFormula.passingGrade ?? 55);
    setApplyPenaltyRule(currentFormula.applyPenaltyRule ?? true);
    setPiecewiseAlpha(
      currentFormula.piecewiseAlpha
        ? { ...currentFormula.piecewiseAlpha }
        : undefined
    );
    setFinalGradeMultiplier(currentFormula.finalGradeMultiplier ?? 1);
    setFinalGradeBonusPoints(currentFormula.finalGradeBonusPoints ?? 0);
    setSource(currentFormula.source || "custom");
    setSourceLabel(currentFormula.sourceLabel || "Fórmula configurada");
    setRequirementsNote(currentFormula.syllabusRequirementsNote || "");

    const initialPdf =
      currentFormula.syllabusPdfUrl || courseInfo?.programa_pdf || null;
    setPdfUrl(initialPdf);

    if (!initialPdf) {
      sigaService.getSyllabusPdfUrl(sigla, sede).then((url) => {
        if (url) setPdfUrl(url);
      });
    }
  }, [open, currentFormula, sigla, courseInfo, sede]);

  const totalPercentage = React.useMemo(() => {
    const sum = blocks.reduce((acc, b) => {
      const pct = b.weightInFinal <= 1 ? b.weightInFinal * 100 : b.weightInFinal;
      return acc + (pct > 0 ? pct : 0);
    }, 0);
    return Math.round(sum * 10) / 10;
  }, [blocks]);

  const isSumHundred = Math.abs(totalPercentage - 100) <= 0.5;

  const handleLoadCourseDefault = () => {
    const inferred = inferCourseFormulaConfig(sigla, courseInfo);
    // Preservar notas y bonificaciones existentes en bloques con el mismo código si existen
    const mergedBlocks = inferred.subFormulas.map((newB) => {
      const oldB = blocks.find(
        (b) => b.code.toUpperCase() === newB.code.toUpperCase() || b.id === newB.id
      );
      if (!oldB) return newB;
      return {
        ...newB,
        bonusPoints: oldB.bonusPoints,
        evalBonusPoints: oldB.evalBonusPoints,
        evaluations: newB.evaluations.map((ev, i) => ({
          ...ev,
          score:
            oldB.evaluations[i]?.score !== undefined
              ? oldB.evaluations[i].score
              : null,
        })),
      };
    });

    setBlocks(mergedBlocks);
    setPassingGrade(inferred.passingGrade ?? 55);
    setApplyPenaltyRule(!!inferred.applyPenaltyRule);
    setPiecewiseAlpha(
      inferred.piecewiseAlpha ? { ...inferred.piecewiseAlpha } : undefined
    );
    setSource(inferred.source || "siga_pdf");
    setSourceLabel(inferred.sourceLabel || "Programa Oficial SIGA");
    setRequirementsNote(inferred.syllabusRequirementsNote || "");
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = USM_FORMULA_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const built = preset.buildFormula(sigla, pdfUrl || undefined);

    const mergedBlocks = built.subFormulas.map((newB) => {
      const oldB = blocks.find(
        (b) => b.code.toUpperCase() === newB.code.toUpperCase() || b.id === newB.id
      );
      if (!oldB) return newB;
      return {
        ...newB,
        bonusPoints: oldB.bonusPoints,
        evalBonusPoints: oldB.evalBonusPoints,
        evaluations: newB.evaluations.map((ev, i) => ({
          ...ev,
          score:
            oldB.evaluations[i]?.score !== undefined
              ? oldB.evaluations[i].score
              : null,
        })),
      };
    });

    setBlocks(mergedBlocks);
    setPassingGrade(built.passingGrade ?? 55);
    setApplyPenaltyRule(!!built.applyPenaltyRule);
    setPiecewiseAlpha(
      built.piecewiseAlpha ? { ...built.piecewiseAlpha } : undefined
    );
    setSource("preset");
    setSourceLabel(preset.label);
    setRequirementsNote(built.syllabusRequirementsNote || preset.description);
  };

  const updateBlock = (index: number, updater: (b: SubFormulaBlock) => SubFormulaBlock) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? updater(b) : b)));
    setSource("custom");
    setSourceLabel("Fórmula Personalizada (Aula USM)");
  };

  const handleAddBlock = () => {
    const idx = blocks.length + 1;
    const defaultPresets = [
      { name: "Laboratorio", code: "PL", prefix: "L", count: 4 },
      { name: "Tareas / Entregas", code: "PT", prefix: "T", count: 3 },
      { name: "Controles", code: "PQ", prefix: "Q", count: 4 },
      { name: "Proyecto Semestral", code: "PP", prefix: "P", count: 2 },
    ];
    const candidate =
      defaultPresets.find(
        (p) => !blocks.some((b) => b.code.toUpperCase() === p.code)
      ) || {
        name: `Bloque ${idx}`,
        code: `B${idx}`,
        prefix: `E`,
        count: 3,
      };

    const newBlockId = `block_${Date.now()}_${idx}`;
    const newBlock: SubFormulaBlock = {
      id: newBlockId,
      name: candidate.name,
      code: candidate.code,
      type: "simple_average",
      prefix: candidate.prefix,
      count: candidate.count,
      dropWorstCount: 0,
      minGradeRequired: null,
      weightInFinal: 0.2,
      evaluations: Array.from({ length: candidate.count }, (_, i) => ({
        id: `${newBlockId}_${i + 1}`,
        name: `${candidate.prefix}${i + 1}`,
        weight: 1,
        score: null,
      })),
    };

    setBlocks((prev) => [...prev, newBlock]);
    setPiecewiseAlpha(undefined);
    setSource("custom");
    setSourceLabel("Fórmula Personalizada (Aula USM)");
  };

  const handleRemoveBlock = (index: number) => {
    if (blocks.length <= 1) return;
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    setPiecewiseAlpha(undefined);
    setSource("custom");
    setSourceLabel("Fórmula Personalizada (Aula USM)");
  };

  const handleNormalizeWeights = () => {
    if (blocks.length === 0) return;
    const sum = blocks.reduce((acc, b) => {
      const pct = b.weightInFinal <= 1 ? b.weightInFinal * 100 : b.weightInFinal;
      return acc + (pct > 0 ? pct : 0);
    }, 0);
    if (sum <= 0) {
      const eq = 1 / blocks.length;
      setBlocks((prev) => prev.map((b) => ({ ...b, weightInFinal: eq })));
      return;
    }
    setBlocks((prev) =>
      prev.map((b) => {
        const pct = b.weightInFinal <= 1 ? b.weightInFinal * 100 : b.weightInFinal;
        return {
          ...b,
          weightInFinal: Math.round(((pct > 0 ? pct : 0) / sum) * 1000) / 1000,
        };
      })
    );
  };

  const handleSave = () => {
    if (blocks.length === 0) return;
    const normalizedBlocks: SubFormulaBlock[] = blocks.map((b) => {
      const w = b.weightInFinal > 1 ? b.weightInFinal / 100 : b.weightInFinal;
      return {
        ...b,
        code: (b.code || "B").trim().toUpperCase(),
        prefix: (b.prefix || b.code || "E").trim().toUpperCase(),
        weightInFinal: Math.max(0.01, w),
      };
    });

    const newFormula: CourseFinalFormula = {
      expression: buildFormulaExpression(
        normalizedBlocks,
        piecewiseAlpha,
        finalGradeMultiplier,
        finalGradeBonusPoints
      ),
      passingGrade: Math.max(1, Math.min(100, passingGrade || 55)),
      applyPenaltyRule:
        applyPenaltyRule &&
        normalizedBlocks.some((b) => b.minGradeRequired !== null),
      piecewiseAlpha,
      finalGradeMultiplier:
        finalGradeMultiplier && finalGradeMultiplier > 0
          ? finalGradeMultiplier
          : 1,
      finalGradeBonusPoints: finalGradeBonusPoints || 0,
      subFormulas: normalizedBlocks,
      source: source || "custom",
      sourceLabel: sourceLabel || "Fórmula Personalizada",
      syllabusRequirementsNote: requirementsNote || undefined,
      syllabusPdfUrl: pdfUrl || undefined,
    };

    onSaveFormula(newFormula);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-zinc-100 p-4 sm:p-6">
        <DialogHeader className="space-y-1.5 border-b border-zinc-800 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-amber-400" />
              <span>
                Fórmula y Requisitos de Aprobación —{" "}
                <span className="font-mono text-amber-400">{sigla}</span>
              </span>
            </DialogTitle>

            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
                title="Abrir el Programa Oficial de Asignatura PDF directo desde SIGA USM"
              >
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                <span>Ver Programa Oficial SIGA (PDF)</span>
              </a>
            )}
          </div>

          <DialogDescription className="text-xs text-zinc-400">
            {courseInfo?.nombre || sigla} • Ajusta los porcentajes, cantidad de
            evaluaciones, eliminación de peor nota (<code className="text-amber-300">drop_worst</code>) o
            mínimos de bloque según el syllabus de tu paralelo en Aula USM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 1. Extracto Oficial del Programa SIGA + Selector de Plantillas */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Plantillas Oficiales SIGA / Departamentos USM</span>
                {sourceLabel && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-950/40 text-amber-300 text-[10px]"
                  >
                    Activa: {sourceLabel}
                  </Badge>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadCourseDefault}
                className="h-7 px-2.5 text-[11px] gap-1 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
              >
                <RotateCcw className="h-3 w-3 text-amber-400" />
                <span>Cargar Fórmula Oficial de {sigla}</span>
              </Button>
            </div>

            {requirementsNote && (
              <div className="rounded-lg bg-zinc-900/90 border border-zinc-800/90 px-3 py-2 text-[11px] text-zinc-300 leading-relaxed">
                <strong className="text-amber-400">
                  Requisitos en Programa USM:
                </strong>{" "}
                {requirementsNote}
              </div>
            )}

            {/* Botones rápidos de Plantillas Departamentales */}
            <div className="flex flex-wrap gap-1.5">
              {USM_FORMULA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 hover:border-amber-500/40 text-zinc-300 transition-colors flex items-center gap-1.5"
                  title={preset.description}
                >
                  <span className="font-mono font-bold text-[10px] text-amber-400">
                    [{preset.departmentTag}]
                  </span>
                  <span>{preset.label.split("(")[0].trim()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Constructor de Bloques de Evaluación */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Instrumentos / Bloques de Evaluación ({blocks.length})
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border ${
                    isSumHundred
                      ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/60"
                      : "bg-amber-950/60 text-amber-300 border-amber-700/60"
                  }`}
                >
                  {isSumHundred ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span>Suma pesos: {totalPercentage}%</span>
                </div>

                {!isSumHundred && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNormalizeWeights}
                    className="h-7 px-2 text-[11px] border-amber-600/50 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40"
                  >
                    Ajustar a 100%
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddBlock}
                  className="h-7 px-2.5 text-xs font-semibold gap-1 bg-[#002B49] hover:bg-[#003d69] text-amber-300 border border-amber-500/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar Bloque</span>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {blocks.map((block, idx) => {
                const pctValue = Math.round(
                  (block.weightInFinal <= 1
                    ? block.weightInFinal * 100
                    : block.weightInFinal) * 10
                ) / 10;

                return (
                  <div
                    key={block.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      {/* Nombre del bloque */}
                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-zinc-400">
                          Instrumento / Bloque
                        </label>
                        <input
                          type="text"
                          value={block.name}
                          onChange={(e) =>
                            updateBlock(idx, (b) => ({
                              ...b,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Ej. Certámenes"
                          className="w-full h-8 px-2.5 text-xs rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100 focus:border-amber-500 outline-none"
                        />
                      </div>

                      {/* Sigla / Código */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-zinc-400">
                          Sigla (NF)
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          value={block.code}
                          onChange={(e) =>
                            updateBlock(idx, (b) => ({
                              ...b,
                              code: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="PC"
                          className="w-full h-8 px-2 text-xs font-mono font-bold uppercase text-center rounded-md bg-zinc-900 border border-zinc-700 text-amber-400 focus:border-amber-500 outline-none"
                        />
                      </div>

                      {/* Peso (%) */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-zinc-400">
                          Peso (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            step={1}
                            value={pctValue}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              if (!isNaN(raw)) {
                                updateBlock(idx, (b) => ({
                                  ...b,
                                  weightInFinal: Math.max(0, Math.min(100, raw)) / 100,
                                }));
                              }
                            }}
                            className="w-full h-8 px-2 pr-5 text-xs font-mono font-bold text-center rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100 focus:border-amber-500 outline-none"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Cantidad N° de evaluaciones */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-zinc-400">
                          Cantidad (N°)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          step={1}
                          value={block.evaluations.length}
                          onChange={(e) => {
                            const nextCount = Math.max(
                              1,
                              Math.min(12, Number(e.target.value) || 1)
                            );
                            updateBlock(idx, (b) => ({
                              ...b,
                              count: nextCount,
                              dropWorstCount: Math.min(
                                b.dropWorstCount || 0,
                                Math.max(0, nextCount - 1)
                              ),
                              evaluations: resizeEvaluations(b, nextCount),
                            }));
                          }}
                          className="w-full h-8 px-2 text-xs font-mono font-bold text-center rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100 focus:border-amber-500 outline-none"
                        />
                      </div>

                      {/*Nota mínima requerida del bloque*/}
                      <div className="sm:col-span-2 flex items-center justify-between gap-1">
                        <div className="space-y-1 flex-1">
                          <label className="text-[10px] font-semibold uppercase text-zinc-400">
                            Mín. Bloque
                          </label>
                          <select
                            value={
                              block.minGradeRequired === null
                                ? "none"
                                : String(block.minGradeRequired)
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              updateBlock(idx, (b) => ({
                                ...b,
                                minGradeRequired:
                                  val === "none" ? null : Number(val),
                              }));
                            }}
                            className="w-full h-8 px-1.5 text-xs font-mono rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 focus:border-amber-500 outline-none"
                          >
                            <option value="none">Sin mín.</option>
                            <option value="45">≥ 45</option>
                            <option value="50">≥ 50</option>
                            <option value="55">≥ 55</option>
                          </select>
                        </div>

                        {blocks.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveBlock(idx)}
                            className="h-8 w-8 mt-4 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 shrink-0"
                            title="Eliminar bloque"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Fila secundaria: Regla interna del bloque (Promedio simple | Eliminar peores | Ponderado) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/70 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-zinc-400 font-medium">
                          Modo de cálculo:
                        </span>
                        {(
                          [
                            { id: "simple_average", label: "Promedio simple" },
                            {
                              id: "drop_worst",
                              label: "Eliminar peores notas",
                            },
                            {
                              id: "weighted",
                              label: "Ponderado individual (ej. C1/C2/C3)",
                            },
                          ] as Array<{ id: SubFormulaType; label: string }>
                        ).map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() =>
                              updateBlock(idx, (b) => ({
                                ...b,
                                type: mode.id,
                                dropWorstCount:
                                  mode.id === "drop_worst"
                                    ? Math.max(1, b.dropWorstCount || 1)
                                    : 0,
                              }))
                            }
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                              block.type === mode.id
                                ? "bg-amber-500/15 border-amber-500/50 text-amber-300 font-semibold"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>

                      {/* Si es drop_worst, elegir cuántas peores se eliminan */}
                      {block.type === "drop_worst" && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-zinc-400 text-[11px]">
                            Descartar:
                          </span>
                          <select
                            value={block.dropWorstCount || 1}
                            onChange={(e) =>
                              updateBlock(idx, (b) => ({
                                ...b,
                                dropWorstCount: Number(e.target.value) || 1,
                              }))
                            }
                            className="h-7 px-2 text-xs font-mono rounded bg-zinc-900 border border-zinc-700 text-amber-300"
                          >
                            {Array.from(
                              {
                                length: Math.max(
                                  1,
                                  block.evaluations.length - 1
                                ),
                              },
                              (_, k) => k + 1
                            ).map((num) => (
                              <option key={num} value={num}>
                                {num} {num === 1 ? "peor nota" : "peores notas"}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Si es weighted (ej. MAT-021 C1 20%, C2 25%, C3 30%), mostrar pesos por evaluación */}
                    {block.type === "weighted" && (
                      <div className="pt-2 border-t border-zinc-800/50 space-y-1.5">
                        <div className="text-[11px] text-zinc-400">
                          Peso relativo de cada evaluación dentro de{" "}
                          <strong className="text-zinc-200">{block.name}</strong>:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {block.evaluations.map((ev, evIdx) => (
                            <div
                              key={ev.id}
                              className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1"
                            >
                              <span className="text-[11px] font-mono text-zinc-300">
                                {block.prefix || block.code}
                                {evIdx + 1}:
                              </span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={ev.weight}
                                onChange={(e) => {
                                  const w = Math.max(
                                    1,
                                    Number(e.target.value) || 1
                                  );
                                  updateBlock(idx, (b) => ({
                                    ...b,
                                    evaluations: b.evaluations.map((item, j) =>
                                      j === evIdx ? { ...item, weight: w } : item
                                    ),
                                  }));
                                }}
                                className="w-12 h-6 text-center text-xs font-mono rounded bg-zinc-950 border border-zinc-700 text-amber-300"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Reglas Globales de Aprobación USM y Modificadores */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={applyPenaltyRule}
                  onChange={(e) => setApplyPenaltyRule(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                />
                <span>
                  Aplicar penalización USM por mínimo de bloque{" "}
                  <span className="text-zinc-500">
                    (si un bloque no cumple su mínimo, NF = promedio menor)
                  </span>
                </span>
              </label>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-zinc-400">Nota aprobación (NF ≥):</span>
                <input
                  type="number"
                  min={40}
                  max={100}
                  value={passingGrade}
                  onChange={(e) =>
                    setPassingGrade(
                      Math.max(40, Math.min(100, Number(e.target.value) || 55))
                    )
                  }
                  className="w-14 h-7 text-center font-mono font-bold rounded bg-zinc-900 border border-zinc-700 text-amber-400"
                />
              </div>
            </div>

            {/* Multiplicador y Puntos extra a NF */}
            <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Multiplicador global:</span>
                <input
                  type="number"
                  min={0.5}
                  max={2.0}
                  step={0.01}
                  value={finalGradeMultiplier}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      setFinalGradeMultiplier(val);
                      setSource("custom");
                    }
                  }}
                  className="w-16 h-7 text-center font-mono text-xs font-bold rounded bg-zinc-900 border border-zinc-700 text-amber-300"
                />
                <span className="text-[10px] text-zinc-500">(ej. 1.05 = +5%)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Puntos extra NF:</span>
                <input
                  type="number"
                  min={-20}
                  max={50}
                  step={0.5}
                  value={finalGradeBonusPoints}
                  onChange={(e) => {
                    setFinalGradeBonusPoints(Number(e.target.value) || 0);
                    setSource("custom");
                  }}
                  className="w-14 h-7 text-center font-mono text-xs font-bold rounded bg-zinc-900 border border-zinc-700 text-emerald-300"
                />
                <span className="text-[10px] text-zinc-500">pts (actividades externas)</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-zinc-800">
          <div className="text-xs font-mono text-zinc-400">
            Vista previa:{" "}
            <strong className="text-amber-400">
              NF ={" "}
              {buildFormulaExpression(
                blocks,
                piecewiseAlpha,
                finalGradeMultiplier,
                finalGradeBonusPoints
              )}
            </strong>{" "}
            (≥ {passingGrade})
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="text-xs font-bold bg-gradient-to-r from-[#002B49] to-[#003d69] hover:from-[#003459] hover:to-[#004d85] text-amber-300 border border-amber-500/40 px-4"
            >
              Guardar Fórmula y Recalcular
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
