import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAcademicStore } from "@/store/useAcademicStore";
import { Copy, Download, Upload, Check, AlertTriangle, FileCode } from "lucide-react";

interface DataBackupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataBackupModal({ open, onOpenChange }: DataBackupModalProps) {
  const { exportJSON, importJSON } = useAcademicStore();
  const [activeTab, setActiveTab] = React.useState<"export" | "import">("export");
  const [exportData, setExportData] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);
  const [importInput, setImportInput] = React.useState("");
  const [importStatus, setImportStatus] = React.useState<{
    type: "idle" | "success" | "error";
    message?: string;
  }>({ type: "idle" });

  React.useEffect(() => {
    if (open) {
      setExportData(exportJSON());
      setCopied(false);
      setImportStatus({ type: "idle" });
      setImportInput("");
    }
  }, [open, exportJSON]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `sansano-backup-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportInput(content);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    if (!importInput.trim()) {
      setImportStatus({
        type: "error",
        message: "Por favor pega el contenido JSON o sube un archivo.",
      });
      return;
    }

    try {
      const success = importJSON(importInput);
      if (success) {
        setImportStatus({
          type: "success",
          message: "¡Datos restaurados con éxito!",
        });
        setTimeout(() => {
          onOpenChange(false);
        }, 1200);
      } else {
        setImportStatus({
          type: "error",
          message: "El formato del JSON es inválido o no compatible con USM Tracker.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar el archivo";
      setImportStatus({
        type: "error",
        message: msg,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-usm-navy dark:text-usm-gold">
            <FileCode className="h-5 w-5 text-secondary" />
            Copia de Seguridad y Restauración
          </DialogTitle>
          <DialogDescription>
            Exporta tu progreso académico e historial de notas en formato JSON, o restaura un respaldo previo.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "export" | "import")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Exportar Datos</TabsTrigger>
            <TabsTrigger value="import">Importar Respaldo</TabsTrigger>
          </TabsList>

          {/* EXPORT TAB */}
          <TabsContent value="export" className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Puedes copiar el texto JSON para guardarlo o descargar un archivo directamente a tu computadora.
            </p>
            <textarea
              readOnly
              value={exportData}
              rows={8}
              className="w-full font-mono text-xs p-3 rounded-md border bg-muted/40 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    Copiado al portapapeles
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar JSON
                  </>
                )}
              </Button>
              <Button
                variant="usm"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4 text-secondary" />
                Descargar Archivo (.json)
              </Button>
            </div>
          </TabsContent>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Pega el contenido JSON de una copia de seguridad o sube el archivo descargado previamente.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="file"
                id="file-upload-input"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer">
                <Button variant="outline" size="sm" type="button" className="gap-2 pointer-events-none">
                  <Upload className="h-4 w-4" />
                  Cargar Archivo .json
                </Button>
              </label>
              <span className="text-xs text-muted-foreground">o pega el texto abajo:</span>
            </div>

            <textarea
              value={importInput}
              onChange={(e) => {
                setImportInput(e.target.value);
                setImportStatus({ type: "idle" });
              }}
              placeholder='{ "version": "1.0", "approvedCourses": { ... } }'
              rows={7}
              className="w-full font-mono text-xs p-3 rounded-md border bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {importStatus.type === "error" && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">{importStatus.message}</AlertDescription>
              </Alert>
            )}

            {importStatus.type === "success" && (
              <Alert variant="success" className="py-2">
                <Check className="h-4 w-4" />
                <AlertDescription className="text-xs">{importStatus.message}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="usm"
                size="sm"
                onClick={handleImportSubmit}
                disabled={!importInput.trim()}
                className="gap-2"
              >
                <Upload className="h-4 w-4 text-secondary" />
                Restaurar Datos
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
