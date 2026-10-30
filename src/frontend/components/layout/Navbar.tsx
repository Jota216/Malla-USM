import * as React from "react";
import { useAcademicStore } from "@/shared/store/useAcademicStore";
import { getCatalogPlans } from "@/curricula/services/curriculumService";
import { CareerPlanCatalogItem } from "@/shared/types/academic";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/frontend/components/ui/dialog";
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
  ChevronDown,
  Search,
  MapPin,
  Check,
  Loader2,
  Calendar,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const {
    getStatistics,
    resetAll,
    curriculum,
    activePlanId,
    selectCurriculumPlan,
  } = useAcademicStore();
  const stats = getStatistics();

  const [backupOpen, setBackupOpen] = React.useState(false);
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
  const [careerDialogOpen, setCareerDialogOpen] = React.useState(false);

  const [catalogPlans, setCatalogPlans] = React.useState<
    CareerPlanCatalogItem[]
  >([]);
  const [loadingCatalog, setLoadingCatalog] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSede, setSelectedSede] = React.useState<string>("TODAS");
  const [selectedJornada, setSelectedJornada] = React.useState<string>("TODAS");

  React.useEffect(() => {
    if (!careerDialogOpen || catalogPlans.length > 0) return;
    let cancelled = false;
    setLoadingCatalog(true);
    getCatalogPlans()
      .then((plans) => {
        if (!cancelled) {
          setCatalogPlans(plans);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCatalog(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [careerDialogOpen, catalogPlans.length]);

  const sedes = React.useMemo(() => {
    const unique = Array.from(new Set(catalogPlans.map((p) => p.sede)));
    return ["TODAS", ...unique];
  }, [catalogPlans]);

  const jornadas = React.useMemo(() => {
    const unique = Array.from(new Set(catalogPlans.map((p) => p.jornada)));
    return ["TODAS", ...unique];
  }, [catalogPlans]);

  const filteredPlans = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogPlans.filter((p) => {
      if (selectedSede !== "TODAS" && p.sede !== selectedSede) {
        return false;
      }
      if (selectedJornada !== "TODAS" && p.jornada !== selectedJornada) {
        return false;
      }
      if (!q) return true;
      return (
        p.careerName.toLowerCase().includes(q) ||
        p.careerCode.toLowerCase().includes(q) ||
        p.sede.toLowerCase().includes(q) ||
        p.planCode.toLowerCase().includes(q) ||
        p.mentionName.toLowerCase().includes(q)
      );
    });
  }, [catalogPlans, selectedSede, selectedJornada, searchQuery]);

  const handleConfirmReset = () => {
    resetAll();
    setResetDialogOpen(false);
  };

  const handleSelectPlan = async (planId: string) => {
    await selectCurriculumPlan(planId);
    setCareerDialogOpen(false);
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
              <button
                type="button"
                onClick={() => setCareerDialogOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium group transition-colors text-left"
                title="Cambiar carrera, sede o plan de estudios USM"
              >
                <span className="truncate max-w-[200px] sm:max-w-[320px] group-hover:underline">
                  {curriculum.carrera}
                </span>
                {curriculum.sede && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="hidden md:inline text-[11px] text-muted-foreground">
                      {curriculum.sede}
                    </span>
                  </>
                )}
                <span className="text-slate-400">•</span>
                <span className="text-[#D99B00] font-semibold">
                  Plan {curriculum.plan}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#D99B00] group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* KPI Interactive Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* SCT Credits Badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card/60 shadow-xs hover:border-[#002B49]/40 transition-colors"
              title="Créditos SCT aprobados vs totales requeridos"
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
                onClick={() => setCareerDialogOpen(true)}
                className="h-8 gap-1.5 text-xs font-medium"
                title="Cambiar carrera, sede o malla USM"
              >
                <GraduationCap className="h-3.5 w-3.5 text-[#D99B00]" />
                <span className="hidden sm:inline">Carreras ({catalogPlans.length || "USM"})</span>
              </Button>

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
              onClick={() => onTabChange("schedule")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                activeTab === "schedule"
                  ? "bg-[#002B49] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Horario SIGA</span>
              {stats.inProgressCoursesCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#D99B00] text-slate-900">
                  {stats.inProgressCoursesCount}
                </span>
              )}
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
              <span>Ramos en Curso</span>
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

      {/* Career / Sede / Plan Selector Dialog */}
      <Dialog open={careerDialogOpen} onOpenChange={setCareerDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#D99B00]" />
              <span>Seleccionar Carrera, Sede y Plan USM</span>
            </DialogTitle>
            <DialogDescription>
              Catálogo oficial sincronizado con SIGA USM ({filteredPlans.length} mallas disponibles). Tus ramos aprobados compatibles por sigla se conservarán al cambiar de plan.
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="space-y-2.5 py-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar carrera (ej. Informática, Comercial, Mecánica, Electrónica, Construcción)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {sedes.map((sede) => (
                  <button
                    key={sede}
                    type="button"
                    onClick={() => setSelectedSede(sede)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      selectedSede === sede
                        ? "bg-[#002B49] text-white dark:bg-[#D99B00] dark:text-slate-900"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sede === "TODAS" ? "Todas las Sedes" : sede}
                  </button>
                ))}
              </div>

              {jornadas.length > 2 && (
                <div className="flex items-center gap-1">
                  {jornadas.map((j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => setSelectedJornada(j)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        selectedJornada === j
                          ? "bg-secondary text-secondary-foreground font-bold"
                          : "bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {j === "TODAS" ? "Ambas Jornadas" : j}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Plans List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[260px] max-h-[420px]">
            {loadingCatalog ? (
              <div className="flex items-center justify-center py-12 gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Cargando planes de estudio de todas las sedes USM...</span>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No se encontraron planes que coincidan con tu búsqueda.
              </div>
            ) : (
              filteredPlans.map((item) => {
                const isCurrent = activePlanId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPlan(item.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                      isCurrent
                        ? "border-[#002B49] bg-[#002B49]/5 dark:border-[#D99B00] dark:bg-[#D99B00]/10"
                        : "hover:border-muted-foreground/40 bg-card/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-2 flex-wrap">
                        <span>{item.careerName}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Plan {item.planCode}
                        </Badge>
                        {item.mentionName &&
                          item.mentionName.toLowerCase() !== "sin mención" && (
                            <Badge variant="secondary" className="text-[10px]">
                              {item.mentionName}
                            </Badge>
                          )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#D99B00]" />
                          {item.sede}
                        </span>
                        <span>•</span>
                        <span>Jornada {item.jornada}</span>
                        <span>•</span>
                        <span>{item.semestersCount} semestres</span>
                        <span>•</span>
                        <span>{item.coursesCount} asignaturas</span>
                      </div>
                    </div>

                    {isCurrent && (
                      <Badge variant="success" className="shrink-0 gap-1 text-[10px]">
                        <Check className="h-3 w-3" />
                        Activo
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

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
