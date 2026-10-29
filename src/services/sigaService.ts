import { ApprovedCourseRecord, EnrolledCourseConfig } from '@/types/academic';

export interface SigaAuthCredentials {
  rol?: string; // USM Rol (e.g., 202173500-1)
  email?: string;
  token?: string;
}

export interface SigaStudentRecord {
  studentName?: string;
  rol?: string;
  planCode: string;
  approvedCourses: ApprovedCourseRecord[];
  currentSemesterCourses: string[]; // Siglas of enrolled courses
  lastSyncTimestamp: string;
}

export interface SigaSyncResult {
  success: boolean;
  message: string;
  record?: SigaStudentRecord;
}

/**
 * SIGA USM Service Layer abstraction.
 * Prepared for future integration with SIGA portal API or browser extension scraper.
 */
class SigaService {
  /**
   * Fetches the academic history for the logged-in student.
   * Currently mocked to provide mock test data or parse imported SIGA transcripts.
   */
  async fetchStudentAcademicRecord(credentials?: SigaAuthCredentials): Promise<SigaStudentRecord> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    return {
      studentName: 'Sansano Estudiante',
      rol: credentials?.rol || '202173000-1',
      planCode: '7313',
      approvedCourses: [],
      currentSemesterCourses: [],
      lastSyncTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Synchronizes student data with SIGA system
   */
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
        message: error instanceof Error ? error.message : 'Error desconocido al conectar con SIGA USM.',
      };
    }
  }

  /**
   * Serializes current state to a portable JSON backup string
   */
  exportBackup(payload: {
    approvedCourses: Record<string, ApprovedCourseRecord>;
    inProgressCourses: Record<string, EnrolledCourseConfig>;
    milestones: any[];
  }): string {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      system: 'Sansano Academic Tracker - USM',
      data: payload,
    };
    return JSON.stringify(backupData, null, 2);
  }

  /**
   * Validates and parses an imported JSON backup string
   */
  importBackup(rawJson: string): {
    success: boolean;
    data?: {
      approvedCourses: Record<string, ApprovedCourseRecord>;
      inProgressCourses: Record<string, EnrolledCourseConfig>;
      milestones: any[];
    };
    error?: string;
  } {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Formato JSON inválido.' };
      }

      // Handle direct state object or wrapped backup format
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
