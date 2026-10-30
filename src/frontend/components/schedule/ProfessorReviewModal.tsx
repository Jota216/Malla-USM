import { ProfessorReviewSummary, ProfessorMetricDetail } from "@/shared/types/academic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/frontend/components/ui/dialog";
import { Badge } from "@/frontend/components/ui/badge";
import { Progress } from "@/frontend/components/ui/progress";
import { Star, MessageSquare, Tag, Users, AlertCircle } from "lucide-react";

interface ProfessorReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professorName: string;
  review: ProfessorReviewSummary | null;
}

const METRIC_LABELS: Array<{
  key: keyof ProfessorReviewSummary["stats"];
  label: string;
  desc: string;
}> = [
  {
    key: "claridad_expositiva",
    label: "Claridad Expositiva",
    desc: "Capacidad pedagógica para explicar los conceptos",
  },
  {
    key: "coherencia_evaluativa",
    label: "Coherencia Evaluativa",
    desc: "Alineación entre clases, ayudantías y certámenes",
  },
  {
    key: "accesibilidad",
    label: "Accesibilidad y Disposición",
    desc: "Disponibilidad para responder dudas y apoyar",
  },
  {
    key: "gestion_tiempo",
    label: "Gestión del Tiempo",
    desc: "Puntualidad en clases y entrega de calificaciones",
  },
  {
    key: "estabilidad_emocional",
    label: "Trato y Clima en Aula",
    desc: "Respeto y ambiente de aprendizaje en sala",
  },
  {
    key: "dificultad_percibida",
    label: "Facilidad / Exigencia Razonable",
    desc: "Nivel de exigencia percibido en las evaluaciones",
  },
  {
    key: "rigor_calificatorio",
    label: "Flexibilidad al Calificar",
    desc: "Criterio de corrección en certámenes y controles",
  },
];

export function ProfessorReviewModal({
  open,
  onOpenChange,
  professorName,
  review,
}: ProfessorReviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2">
                <Users className="h-5 w-5 text-[#D99B00]" />
                <span>{review?.name || professorName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Evaluación estudiantil y reseñas históricas recopiladas en la comunidad USM
              </DialogDescription>
            </div>

            {review && (
              <Badge variant="usm" className="text-xs px-2.5 py-1 gap-1 shrink-0">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>
                  {review.stats.claridad_expositiva?.avg.toFixed(1) || "—"} / 5.0
                </span>
              </Badge>
            )}
          </div>
        </DialogHeader>

        {!review ? (
          <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
            <AlertCircle className="h-7 w-7 mx-auto text-muted-foreground/60" />
            <p>
              No se encontraron reseñas detalladas registradas para{" "}
              <strong>{professorName}</strong> en el dataset actual.
            </p>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Meta summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border">
              <span>
                Reseñas registradas:{" "}
                <strong className="text-foreground font-mono">
                  {review.meta.reviewCount}
                </strong>{" "}
                ({review.meta.effectiveCount} ponderadas)
              </span>
              {review.meta.lastUpdated && (
                <span>
                  Última actualización:{" "}
                  <strong className="text-foreground">
                    {review.meta.lastUpdated.slice(0, 10)}
                  </strong>
                </span>
              )}
            </div>

            {/* 7 Metrics Grid */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Desglose de Métricas Docentes (Escala 1.0 a 5.0)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {METRIC_LABELS.map(({ key, label, desc }) => {
                  const metric: ProfessorMetricDetail | null = review.stats[key];
                  if (!metric) return null;
                  const pct = Math.min(100, Math.max(0, (metric.avg / 5) * 100));

                  return (
                    <div
                      key={key}
                      className="p-2.5 rounded-lg border bg-card/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground" title={desc}>
                          {label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {metric.is_bimodal && (
                            <span
                              className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold"
                              title="Opiniones divididas (distribución bimodal)"
                            >
                              Polarizado
                            </span>
                          )}
                          <span className="font-mono font-bold text-foreground">
                            {metric.avg.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={pct}
                        className="h-1.5"
                        indicatorClassName={
                          metric.avg >= 4.0
                            ? "bg-emerald-500"
                            : metric.avg >= 3.0
                            ? "bg-[#D99B00]"
                            : "bg-rose-500"
                        }
                      />
                      <div className="text-[10px] text-muted-foreground flex justify-between">
                        <span className="truncate">{desc}</span>
                        <span className="font-mono shrink-0 ml-1">
                          ±{metric.stdev.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Tags */}
            {review.tags && review.tags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#D99B00]" />
                  <span>Etiquetas más mencionadas</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {review.tags.map(([tag, count]) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[11px] font-medium gap-1"
                    >
                      <span>{tag}</span>
                      <span className="text-[10px] opacity-70 font-mono">
                        ({count})
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Student Comments */}
            {review.comments && review.comments.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-[#D99B00]" />
                  <span>Comentarios de Estudiantes ({review.comments.length})</span>
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {review.comments.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border bg-muted/20 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <div className="flex flex-wrap gap-1">
                          {(c.tags || []).map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded bg-background border font-medium text-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <span className="font-mono shrink-0">{c.date}</span>
                      </div>
                      <p className="text-foreground leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
