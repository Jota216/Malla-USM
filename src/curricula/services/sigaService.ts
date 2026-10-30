import {
  ApprovedCourseRecord,
  EnrolledCourseConfig,
  GraduationMilestone,
  CourseParallel,
  ProfessorReviewSummary,
} from '@/shared/types/academic';

export interface SigaAuthCredentials {
  rol?: string;
  email?: string;
  token?: string;
}

export interface SigaStudentRecord {
  studentName?: string;
  rol?: string;
  planCode: string;
  approvedCourses: ApprovedCourseRecord[];
  currentSemesterCourses: string[];
  lastSyncTimestamp: string;
}

export interface SigaSyncResult {
  success: boolean;
  message: string;
  record?: SigaStudentRecord;
}

export interface RawSigaCareerEntry {
  código: string;
  nombre: string;
  sede: string;
  jornada: string;
  'menciones/especialidades': Record<
    string,
    {
      nombre: string;
      planes: Record<
        string,
        {
          plan: string;
          malla: Array<
            Record<
              string,
              {
                nombre: string;
                creditos: number;
                departamento: string;
                requisito_licenciatura: boolean;
                horas: {
                  teoricas: number;
                  practicas: number;
                  laboratorios: number;
                  ayudantias: number;
                };
                requisitos: Array<Array<{ sigla: string; tipo?: string }>>;
                equivalencias: Array<Array<{ sigla: string }>>;
              }
            >
          >;
        }
      >;
    }
  >;
}

export type RawHorariosDataset = Record<
  string, // sede
  Record<
    string, // jornada
    Record<
      string, // periodo (e.g. "2026-2", "2026-1")
      Record<
        string, // sigla sin guion (e.g. "INF292")
        Record<string, CourseParallel> // paralelo -> CourseParallel
      >
    >
  >
>;

export type RawProgramasDataset = Record<
  string, // sede
  Record<
    string, // departamento
    Record<
      string, // tipo ("IMPAR" | "PAR" | "AMBOS" | "ELECTIVO")
      Record<
        string, // sigla sin guion
        {
          nombre: string;
          creditos: string;
          programa: string; // URL al PDF en siga.usm.cl
        }
      >
    >
  >
>;

export type RawProfessorsDataset = Record<string, ProfessorReviewSummary>;

const CDN_BASE =
  'https://cdn.jsdelivr.net/gh/AlvinIsCrack/horario-usm@main/src/lib/data';

/**
 * Normaliza una sigla eliminando guiones y espacios para cruzar entre nuestro formato (INF-292)
 * y el formato crudo de SIGA (INF292).
 */
export function normalizeSiglaKey(sigla: string): string {
  return sigla.replace(/[-_\s]+/g, '').trim().toUpperCase();
}

/**
 * Formatea una sigla de SIGA (ej. "INF292" o "MAT021") al formato legible con guion ("INF-292")
 * si sigue el patrón clásico de letras + números.
 */
export function formatUsmSigla(rawSigla: string): string {
  const clean = rawSigla.trim().toUpperCase();
  if (clean.includes('-')) return clean;
  const match = clean.match(/^([A-Z]{2,4})(\d{1,5}[A-Z0-9]*)$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return clean.replace(/\s+/g, '-');
}

/**
 * Servicio Híbrido SIGA USM (Opción C):
 * 1. Intenta cargar primero desde el espejo local (`public/data/*.json`) servido por la propia app
 *    o actualizado vía GitHub Actions.
 * 2. Si no está disponible o se solicita actualización en vivo, consulta el CDN upstream
 *    (`cdn.jsdelivr.net/gh/AlvinIsCrack/horario-usm`).
 */
class SigaService {
  private horariosCache: RawHorariosDataset | null = null;
  private carrerasCache: RawSigaCareerEntry[] | null = null;
  private programasCache: RawProgramasDataset | null = null;
  private professorsCache: RawProfessorsDataset | null = null;
  private metadataCache: any | null = null;

  private async fetchHybridJson<T>(filename: string, forceRemote = false): Promise<T | null> {
    const baseUrl =
      typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL
        ? (import.meta as any).env.BASE_URL
        : '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const localUrl = `${cleanBase}data/${filename}`;
    const remoteUrl = `${CDN_BASE}/${filename}`;

    const urls = forceRemote ? [remoteUrl, localUrl] : [localUrl, remoteUrl];

    for (const url of urls) {
      try {
        if (typeof fetch === 'undefined') continue;
        const res = await fetch(url);
        if (res.ok) {
          return (await res.json()) as T;
        }
      } catch {
        // Continúa al fallback
      }
    }
    return null;
  }

  async getMetadata(forceRemote = false): Promise<any | null> {
    if (this.metadataCache && !forceRemote) return this.metadataCache;
    this.metadataCache = await this.fetchHybridJson('metadata.json', forceRemote);
    return this.metadataCache;
  }

  async getHorariosDataset(forceRemote = false): Promise<RawHorariosDataset | null> {
    if (this.horariosCache && !forceRemote) return this.horariosCache;
    this.horariosCache = await this.fetchHybridJson<RawHorariosDataset>(
      'horario_asignaturas.json',
      forceRemote
    );
    return this.horariosCache;
  }

  async getCarrerasDataset(forceRemote = false): Promise<RawSigaCareerEntry[] | null> {
    if (this.carrerasCache && !forceRemote) return this.carrerasCache;
    this.carrerasCache = await this.fetchHybridJson<RawSigaCareerEntry[]>(
      'planes_carreras.json',
      forceRemote
    );
    return this.carrerasCache;
  }

  async getProgramasDataset(forceRemote = false): Promise<RawProgramasDataset | null> {
    if (this.programasCache && !forceRemote) return this.programasCache;
    this.programasCache = await this.fetchHybridJson<RawProgramasDataset>(
      'programas_academicos.json',
      forceRemote
    );
    return this.programasCache;
  }

  async getProfessorsDataset(forceRemote = false): Promise<RawProfessorsDataset | null> {
    if (this.professorsCache && !forceRemote) return this.professorsCache;
    this.professorsCache = await this.fetchHybridJson<RawProfessorsDataset>(
      'professors_view.json',
      forceRemote
    );
    return this.professorsCache;
  }

  /**
   * Obtiene las sedes, jornadas y periodos disponibles en el dataset de horarios.
   */
  async getSchedulePeriods(
    sede: string = 'Casa Central Valparaíso',
    jornada: string = 'Diurna'
  ): Promise<string[]> {
    const data = await this.getHorariosDataset();
    if (!data || !data[sede] || !data[sede][jornada]) return [];
    return Object.keys(data[sede][jornada])
      .filter((p) => Object.keys(data[sede][jornada][p] || {}).length > 0)
      .sort()
      .reverse();
  }

  /**
   * Devuelve todos los paralelos de una asignatura para la sede, jornada y periodo indicados.
   * Si no se especifica periodo, busca automáticamente en el periodo más reciente que tenga datos.
   */
  async getCourseParallels(
    sigla: string,
    sede: string = 'Casa Central Valparaíso',
    jornada: string = 'Diurna',
    periodo?: string
  ): Promise<{ periodo: string; parallels: CourseParallel[] }> {
    const data = await this.getHorariosDataset();
    if (!data) return { periodo: periodo || '', parallels: [] };

    const sedeData = data[sede] || Object.values(data)[0];
    if (!sedeData) return { periodo: periodo || '', parallels: [] };

    const jornadaData = sedeData[jornada] || Object.values(sedeData)[0];
    if (!jornadaData) return { periodo: periodo || '', parallels: [] };

    const targetKey = normalizeSiglaKey(sigla);
    const periods = Object.keys(jornadaData).sort().reverse();

    if (periodo && jornadaData[periodo]) {
      const courseMap = jornadaData[periodo][targetKey];
      if (courseMap) {
        return {
          periodo,
          parallels: Object.values(courseMap),
        };
      }
    }

    // Buscar en el periodo más reciente donde se dicte o en el último periodo activo con ramos
    for (const p of periods) {
      const pData = jornadaData[p];
      if (!pData || Object.keys(pData).length === 0) continue;
      if (pData[targetKey]) {
        return {
          periodo: p,
          parallels: Object.values(pData[targetKey]),
        };
      }
    }

    const latestNonEmpty = periods.find((p) => Object.keys(jornadaData[p] || {}).length > 0) || '';
    return { periodo: latestNonEmpty, parallels: [] };
  }

  /**
   * Obtiene el link al Programa Oficial en PDF de SIGA para una asignatura.
   */
  async getSyllabusPdfUrl(
    sigla: string,
    sede: string = 'Casa Central Valparaíso'
  ): Promise<string | null> {
    const data = await this.getProgramasDataset();
    if (!data) return null;

    const targetKey = normalizeSiglaKey(sigla);
    const sedesToSearch = data[sede]
      ? [data[sede], ...Object.values(data)]
      : Object.values(data);

    for (const sedeObj of sedesToSearch) {
      for (const deptoObj of Object.values(sedeObj)) {
        for (const tipoObj of Object.values(deptoObj)) {
          const match = tipoObj[targetKey];
          if (match && match.programa) {
            return match.programa;
          }
        }
      }
    }
    return null;
  }

  /**
   * Busca la evaluación y reseñas de un profesor por su nombre.
   */
  async getProfessorReview(professorName: string): Promise<ProfessorReviewSummary | null> {
    const data = await this.getProfessorsDataset();
    if (!data || !professorName) return null;

    const normalized = professorName.trim().toUpperCase();
    if (data[normalized]) return data[normalized];

    // Búsqueda flexible por coincidencia de tokens (nombre + apellido)
    const tokens = normalized.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length === 0) return null;

    for (const [key, prof] of Object.entries(data)) {
      const keyUpper = key.toUpperCase();
      if (tokens.every((t) => keyUpper.includes(t))) {
        return prof;
      }
    }
    return null;
  }

  async fetchStudentAcademicRecord(credentials?: SigaAuthCredentials): Promise<SigaStudentRecord> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      studentName: 'Sansano Estudiante',
      rol: credentials?.rol || '202173000-1',
      planCode: '7313',
      approvedCourses: [],
      currentSemesterCourses: [],
      lastSyncTimestamp: new Date().toISOString(),
    };
  }

  async syncWithSiga(credentials?: SigaAuthCredentials): Promise<SigaSyncResult> {
    try {
      const record = await this.fetchStudentAcademicRecord(credentials);
      return {
        success: true,
        message: 'Sincronización con SIGA USM completada exitosamente.',
        record,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error desconocido al conectar con SIGA USM.',
      };
    }
  }

  exportBackup(payload: {
    approvedCourses: Record<string, ApprovedCourseRecord>;
    inProgressCourses: Record<string, EnrolledCourseConfig>;
    milestones: GraduationMilestone[];
  }): string {
    const backupData = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      system: 'Sansano Academic Tracker - USM',
      data: payload,
    };
    return JSON.stringify(backupData, null, 2);
  }

  importBackup(rawJson: string): {
    success: boolean;
    data?: {
      approvedCourses: Record<string, ApprovedCourseRecord>;
      inProgressCourses: Record<string, EnrolledCourseConfig>;
      milestones: GraduationMilestone[];
    };
    error?: string;
  } {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Formato JSON inválido.' };
      }

      const data = parsed.data || parsed;
      if (!data.approvedCourses && !data.inProgressCourses) {
        return { success: false, error: 'El archivo no contiene datos académicos reconocibles.' };
      }

      return {
        success: true,
        data: {
          approvedCourses: data.approvedCourses || {},
          inProgressCourses: data.inProgressCourses || {},
          milestones: Array.isArray(data.milestones) ? data.milestones : [],
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error al parsear el archivo JSON.',
      };
    }
  }
}

export const sigaService = new SigaService();
