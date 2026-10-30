import { GraduationCap, ShieldCheck, ExternalLink } from "lucide-react";
import { useAcademicStore } from "@/shared/store/useAcademicStore";

export function Footer() {
  const { curriculum } = useAcademicStore();

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
            <span>{curriculum.carrera}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#D99B00]" />
            <span>
              Escala USM Oficial: <strong>0 – 100</strong> (Aprobación:{" "}
              <strong>55</strong>)
            </span>
          </div>
          <span className="hidden md:inline text-slate-300 dark:text-slate-700">
            •
          </span>
          <span>
            Plan {curriculum.plan} • {curriculum.creditos_totales_sct} SCT
          </span>
          <span className="hidden md:inline text-slate-300 dark:text-slate-700">
            •
          </span>
          <a
            href="https://github.com/AlvinIsCrack/horario-usm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            title="Datos SIGA e inspiración de horario-usm (@AlvinIsCrack)"
          >
            <span>Datos SIGA vía horario-usm</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </footer>
  );
}
