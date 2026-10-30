import * as React from "react";
import { Navbar } from "@/frontend/components/layout/Navbar";
import { Footer } from "@/frontend/components/layout/Footer";
import { CurriculumGrid } from "@/frontend/components/curriculum/CurriculumGrid";
import { SemesterSolver } from "@/frontend/components/solver/SemesterSolver";
import { SemesterScheduleView } from "@/frontend/components/schedule/SemesterScheduleView";
import { AnalyticsDashboard } from "@/frontend/components/analytics/AnalyticsDashboard";
import { useAcademicStore } from "@/shared/store/useAcademicStore";

export default function App() {
  const [activeTab, setActiveTab] = React.useState<string>("curriculum");
  const { setSelectedCourse } = useAcademicStore();

  const handleNavigateToSolver = (sigla: string) => {
    setSelectedCourse(sigla);
    setActiveTab("solver");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#002B49] selection:text-[#D99B00]">
      {/* Institutional USM Header Navigation */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main View Container */}
      <main className="flex-1 container max-w-7xl mx-auto px-3 sm:px-4 py-5">
        {activeTab === "curriculum" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <CurriculumGrid onNavigateToSolver={handleNavigateToSolver} />
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <SemesterScheduleView />
          </div>
        )}

        {activeTab === "solver" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <SemesterSolver />
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <AnalyticsDashboard />
          </div>
        )}
      </main>

      {/* Modern Institutional Footer */}
      <Footer />
    </div>
  );
}
