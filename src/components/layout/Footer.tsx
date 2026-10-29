import { GraduationCap, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/20 text-muted-foreground mt-auto py-6">
      <div className="container max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded bg-[#002B49] text-secondary flex items-center justify-center font-bold text-xs">
            <GraduationCap className="h-4 w-4 text-[#D99B00]" />
          </div>
          <div>
            <span className="font-semibold text-foreground">
              Universidad Técnica Federico Santa María
            </span>
            <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
            <span>Departamento de Informática</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#D99B00]" />
            <span>Escala USM Oficial: <strong>0 – 100</strong> (Aprobación: <strong>55</strong>)</span>
          </div>
          <span className="hidden md:inline text-slate-300 dark:text-slate-700">•</span>
          <span>Plan 2014 • Malla Curricular 11 Semestres • 300 SCT</span>
        </div>
      </div>
    </footer>
  );
}
