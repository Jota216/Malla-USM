import * as React from "react";
import { useAcademicStore } from "@/store/useAcademicStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataBackupModal } from "./DataBackupModal";
import {
  GraduationCap,
  Calculator,
  LayoutGrid,
  RotateCcw,
  Database,
  BarChart3,
  Award,
  Sparkles,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { getStatistics, resetAll, curriculum } = useAcademicStore();
  const stats = getStatistics();

  const [backupOpen, setBackupOpen] = React.useState(false);
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);

  const handleConfirmReset = () => {
    resetAll();
    setResetDialogOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
        {/* Top Bar: Brand, Info & Metrics */}
        <div className="container max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Degree */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-[#002B49] flex items-center justify-center text-secondary shadow-md ring-2 ring-[#D99B00]/40">
              <GraduationCap className="h-6 w-6 text-[#D99B00]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight text-[#002B49] dark:text-slate-100">
                  Sansano<span className="text-[#D99B00]">Tracker</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#002B49]/10 dark:bg-slate-800 text-[#002B49] dark:text-[#D99B00]">
                  USM
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                <span>{curriculum.carrera}</span>
                <span className="text-slate-400">•</span>
                <span className="text-[#D99B00] font-semibold">Plan {curriculum.plan}</span>
              </p>
            </div>
          </div>

          {/* KPI Interactive Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* SCT Credits Badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card/60 shadow-xs hover:border-[#002B49]/40 transition-colors"
              title="Créditos SCT aprobados vs totales requeridos (300 SCT)"
            >
              <Award className="h-4 w-4 text-[#D99B00]" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">
                  Créditos SCT
                </span>
                <span className="text-xs font-bold text-foreground">
                  {stats.sctCreditsApproved}{" "}
                  <span className="text-muted-foreground font-normal">
                    / {stats.sctCreditsTotal}
                  </span>
                </span>
              </div>
            </div>

            {/* Progress Percentage Badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card/60 shadow-xs hover:border-[#002B49]/40 transition-colors"
              title="Porcentaje total de avance en la carrera"
            >
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">
                  Avance
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.percentProgress}%
                </span>
              </div>
            </div>

            {/* GPA Badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card/60 shadow-xs hover:border-[#002B49]/40 transition-colors"
              title="Promedio ponderado acumulado (Escala 0 a 100)"
            >
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">
                  Promedio (GPA)
                </span>
                <span className="text-xs font-bold text-foreground">
                  {stats.gpa > 0 ? stats.gpa.toFixed(1) : "S/N"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 ml-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBackupOpen(true)}
                className="h-8 gap-1.5 text-xs font-medium"
                title="Respaldar o restaurar datos JSON"
              >
                <Database className="h-3.5 w-3.5 text-secondary" />
                <span className="hidden sm:inline">JSON</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setResetDialogOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Reiniciar progreso académico"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Tab Navigation */}
        <div className="border-t bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4 flex space-x-1 sm:space-x-2 overflow-x-auto py-1">
            <button
              onClick={() => onTabChange("curriculum")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                activeTab === "curriculum"
                  ? "bg-[#002B49] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Malla Curricular</span>
              <Badge
                variant="secondary"
                className={`ml-1 text-[10px] px-1.5 py-0 ${
                  activeTab === "curriculum"
                    ? "bg-[#D99B00] text-slate-900 font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {stats.approvedCoursesCount} / {stats.totalCoursesCount}
              </Badge>
            </button>

            <button
              onClick={() => onTabChange("solver")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                activeTab === "solver"
                  ? "bg-[#002B49] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Calculator className="h-4 w-4" />
              <span>Wolfram USM Solver</span>
              {stats.inProgressCoursesCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#D99B00] text-slate-900">
                  {stats.inProgressCoursesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange("analytics")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                activeTab === "analytics"
                  ? "bg-[#002B49] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Titulación &amp; Estadísticas</span>
            </button>
          </div>
        </div>
      </header>

      {/* Backup Modal */}
      <DataBackupModal open={backupOpen} onOpenChange={setBackupOpen} />

      {/* Confirmation Dialog for Reset */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              ¿Reiniciar todo el avance académico?
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminará todas las asignaturas aprobadas, notas ingresadas, configuraciones de ramos en curso e hitos de titulación. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReset}
            >
              Sí, reiniciar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
