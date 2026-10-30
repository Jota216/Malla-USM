import * as React from "react";
import { useAcademicStore } from "@/shared/store/useAcademicStore";
import { getCatalogPlans } from "@/curricula/services/curriculumService";
import { CareerPlanCatalogItem, Course } from "@/shared/types/academic";
import { SemesterColumn } from "./SemesterColumn";
import { CourseDetailModal } from "./CourseDetailModal";
import { Input } from "@/frontend/components/ui/input";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Search,
  Filter,
  X,
  Layers,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Lock,
  GraduationCap,
  MapPin,
} from "lucide-react";

interface CurriculumGridProps {
  onNavigateToSolver?: (sigla: string) => void;
}

export function CurriculumGrid({ onNavigateToSolver }: CurriculumGridProps) {
  const {
    curriculum,
    activePlanId,
    selectCurriculumPlan,
    toggleSemesterApproval,
    getCoursesStatus,
  } = useAcademicStore();
  const coursesStatus = getCoursesStatus();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedArea, setSelectedArea] = React.useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null);
  const [activeCourseDetail, setActiveCourseDetail] = React.useState<Course | null>(
    null
  );
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);

  // Catalog state for quick inline career/plan switching
  const [catalogPlans, setCatalogPlans] = React.useState<CareerPlanCatalogItem[]>([]);
  const [filterSede, setFilterSede] = React.useState<string>(
    curriculum.sede || "Casa Central Valparaíso"
  );

  React.useEffect(() => {
    let cancelled = false;
    getCatalogPlans().then((list) => {
      if (!cancelled) {
        setCatalogPlans(list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (curriculum.sede) {
      setFilterSede(curriculum.sede);
    }
  }, [curriculum.sede]);

  const ramos = curriculum.ramos || [];
  const areas = curriculum.areas || {};

  // Dynamic semester count based on the active curriculum
  const totalSemesters = React.useMemo(() => {
    const maxFromRamos = ramos.reduce(
      (max, r) => (r.semestre > max ? r.semestre : max),
      0
    );
    return Math.max(curriculum.semestres_totales || 0, maxFromRamos, 1);
  }, [curriculum.semestres_totales, ramos]);

  const semesterNumbers = React.useMemo(
    () => Array.from({ length: totalSemesters }, (_, i) => i + 1),
    [totalSemesters]
  );

  const availableSedes = React.useMemo(() => {
    return Array.from(new Set(catalogPlans.map((p) => p.sede)));
  }, [catalogPlans]);

  const plansInSelectedSede = React.useMemo(() => {
    return catalogPlans.filter((p) => p.sede === filterSede);
  }, [catalogPlans, filterSede]);

  // Filter courses
  const filterCourse = (c: Course): boolean => {
    // 1. Text search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchSigla = c.sigla.toLowerCase().includes(term);
      const matchName = c.nombre.toLowerCase().includes(term);
      if (!matchSigla && !matchName) return false;
    }

    // 2. Area filter
    if (selectedArea && c.area !== selectedArea) {
      return false;
    }

    // 3. Status filter
    if (selectedStatus) {
      const status = coursesStatus[c.sigla]?.status;
      if (status !== selectedStatus) return false;
    }

    return true;
  };

  const handleOpenDetail = (course: Course) => {
    setActiveCourseDetail(course);
    setDetailModalOpen(true);
  };

  const hasActiveFilters = Boolean(searchTerm || selectedArea || selectedStatus);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedArea(null);
    setSelectedStatus(null);
  };

  // Area stats (count per area)
  const areaCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of ramos) {
      counts[r.area] = (counts[r.area] || 0) + 1;
    }
    return counts;
  }, [ramos]);

  return (
    <div className="flex flex-col space-y-4">
      {/* Control & Filter Toolbar */}
      <div className="rounded-xl border bg-card/70 p-3 sm:p-4 shadow-xs space-y-3">
        {/* Top Row: Quick Career & Malla Selector Bar */}
        {catalogPlans.length > 1 && (
          <div className="pb-3 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <GraduationCap className="h-4 w-4 text-[#D99B00] shrink-0" />
              <span className="text-xs font-bold text-foreground">
                {curriculum.carrera}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Plan {curriculum.plan}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                • {totalSemesters} semestres • {ramos.length} asignaturas
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-[#D99B00]" />
                <select
                  aria-label="Seleccionar Sede USM"
                  value={filterSede}
                  onChange={(e) => {
                    const nextSede = e.target.value;
                    setFilterSede(nextSede);
                    const firstPlan = catalogPlans.find(
                      (p) => p.sede === nextSede
                    );
                    if (firstPlan) {
                      selectCurriculumPlan(firstPlan.id);
                    }
                  }}
                  className="h-8 rounded-md border bg-background px-2 text-xs font-medium text-foreground"
                >
                  {availableSedes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <select
                aria-label="Seleccionar Carrera y Plan USM"
                value={activePlanId}
                onChange={(e) => selectCurriculumPlan(e.target.value)}
                className="h-8 rounded-md border bg-background px-2.5 text-xs font-semibold text-foreground max-w-[280px] sm:max-w-[380px] truncate"
              >
                {plansInSelectedSede.map((p) => {
                  const menLabel =
                    p.mentionName &&
                    p.mentionName.toLowerCase() !== "sin mención"
                      ? ` (${p.mentionName})`
                      : "";
                  return (
                    <option key={p.id} value={p.id}>
                      {p.careerName}
                      {menLabel} — Plan {p.planCode} ({p.jornada})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por ramo o sigla (ej. MAT-021, Algoritmos, IWI)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm bg-background"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Quick Filters */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-muted-foreground text-xs font-semibold mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Estado:
            </span>

            <Button
              variant={selectedStatus === null ? "usm" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus(null)}
              className="h-7 text-xs px-2.5"
            >
              Todos
            </Button>

            <Button
              variant={selectedStatus === "AVAILABLE" ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                setSelectedStatus(selectedStatus === "AVAILABLE" ? null : "AVAILABLE")
              }
              className="h-7 text-xs px-2.5 gap-1"
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              Disponibles
            </Button>

            <Button
              variant={selectedStatus === "IN_PROGRESS" ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                setSelectedStatus(
                  selectedStatus === "IN_PROGRESS" ? null : "IN_PROGRESS"
                )
              }
              className="h-7 text-xs px-2.5 gap-1"
            >
              <BookOpen className="h-3 w-3 text-sky-500" />
              Cursando
            </Button>

            <Button
              variant={selectedStatus === "APPROVED" ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                setSelectedStatus(
                  selectedStatus === "APPROVED" ? null : "APPROVED"
                )
              }
              className="h-7 text-xs px-2.5 gap-1"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Aprobados
            </Button>

            <Button
              variant={selectedStatus === "LOCKED" ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                setSelectedStatus(selectedStatus === "LOCKED" ? null : "LOCKED")
              }
              className="h-7 text-xs px-2.5 gap-1"
            >
              <Lock className="h-3 w-3 text-slate-400" />
              Bloqueados
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10 ml-auto sm:ml-1"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Interactive Areas Legend Bar */}
        <div className="pt-2 border-t flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1 mr-1">
            <Layers className="h-3 w-3" /> Áreas:
          </span>

          {Object.entries(areas)
            .filter(([code]) => (areaCounts[code] || 0) > 0)
            .map(([code, info]) => {
              const isSelected = selectedArea === code;
              const count = areaCounts[code] || 0;
              return (
                <button
                  key={code}
                  onClick={() => setSelectedArea(isSelected ? null : code)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
                    isSelected
                      ? "ring-2 ring-primary border-primary bg-primary/10 shadow-2xs font-bold"
                      : "bg-background/80 hover:bg-muted/60 border-border"
                  }`}
                  title={`${info.nombre} (${count} asignaturas)`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: info.color }}
                  />
                  <span className="font-semibold">{code}</span>
                  <span className="text-muted-foreground text-[10px]">
                    ({count})
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Dynamic Semesters Horizontal Scroll Container */}
      <div className="relative w-full overflow-x-auto pb-4 scroll-smooth">
        <div className="inline-flex space-x-3.5 min-w-full pb-2">
          {semesterNumbers.map((num) => {
            const semesterAll = ramos.filter((r) => r.semestre === num);
            const semesterFiltered = semesterAll.filter(filterCourse);

            return (
              <SemesterColumn
                key={num}
                semesterNumber={num}
                courses={semesterFiltered}
                coursesStatus={coursesStatus}
                areas={areas}
                onOpenDetail={handleOpenDetail}
                onNavigateToSolver={onNavigateToSolver}
                onToggleSemesterApproval={toggleSemesterApproval}
              />
            );
          })}
        </div>
      </div>

      {/* Course Detail Modal */}
      <CourseDetailModal
        course={activeCourseDetail}
        statusDetail={
          activeCourseDetail ? coursesStatus[activeCourseDetail.sigla] : undefined
        }
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onNavigateToSolver={onNavigateToSolver}
      />
    </div>
  );
}
