import { CurriculumPlan, Course } from '@/shared/types/academic';
import ici2014Data from '@/curricula/careers/ici-2014.json';

/**
 * Service layer abstraction for curriculum data.
 * Fully decoupled using async/await promises to support future remote backends or scrapers.
 */
class CurriculumService {
  private cache: Map<string, CurriculumPlan> = new Map();

  constructor() {
    // Seed in-memory cache with standard ICI-2014 curriculum
    this.cache.set('7313-2014', ici2014Data as CurriculumPlan);
  }

  /**
   * Retrieves the curriculum plan by code/id. Defaults to ICI-2014.
   */
  async getCurriculum(planId: string = '7313-2014'): Promise<CurriculumPlan> {
    // Simulate slight asynchronous resolution for realistic data flow
    await Promise.resolve();

    const plan = this.cache.get(planId) || (ici2014Data as CurriculumPlan);
    return JSON.parse(JSON.stringify(plan));
  }

  /**
   * Lists available curricula plans
   */
  async getAvailablePlans(): Promise<Array<{ id: string; name: string; plan: string; university: string }>> {
    await Promise.resolve();
    return [
      {
        id: '7313-2014',
        name: 'Ingeniería Civil Informática',
        plan: '2014',
        university: 'Universidad Técnica Federico Santa María',
      },
    ];
  }

  /**
   * Retrieves a single course by its sigla from the active plan
   */
  async getCourseBySigla(sigla: string, planId: string = '7313-2014'): Promise<Course | null> {
    const plan = await this.getCurriculum(planId);
    const normalized = sigla.trim().toUpperCase();
    return plan.ramos.find((c) => c.sigla.toUpperCase() === normalized) || null;
  }

  /**
   * Retrieves total SCT credits for a plan
   */
  async getTotalSctCredits(planId: string = '7313-2014'): Promise<number> {
    const plan = await this.getCurriculum(planId);
    return plan.ramos.reduce((sum, c) => sum + (c.creditos_sct || 0), 0);
  }

  /**
   * Retrieves total USM credits for a plan
   */
  async getTotalUsmCredits(planId: string = '7313-2014'): Promise<number> {
    const plan = await this.getCurriculum(planId);
    return plan.ramos.reduce((sum, c) => sum + (c.creditos_usm || 0), 0);
  }
}

export const curriculumService = new CurriculumService();
