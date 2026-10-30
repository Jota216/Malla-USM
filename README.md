# SansanoTracker — USM Malla, Horario SIGA & Grade Solver

Aplicación web interactiva de código abierto diseñada para estudiantes de todas las sedes y carreras de la **Universidad Técnica Federico Santa María (USM)**. Permite gestionar el avance de la malla curricular, planificar el horario semestral con datos reales de SIGA y calcular de forma exacta las notas necesarias para aprobar cada asignatura.

## Características Principales

* **Catálogo Multi-Carrera y Multi-Sede USM:** Soporte para todas las carreras, menciones y planes de estudio de **Casa Central Valparaíso, Santiago San Joaquín, Santiago Vitacura, Viña del Mar y Concepción**.
* **Malla Curricular Interactiva (DAG):** Visualiza los ramos por semestre, marca tus asignaturas aprobadas y descubre automáticamente qué ramos tienes desbloqueados según su grafo de prerrequisitos.
* **Planificador de Horario Semestral SIGA:**
  * Consulta paralelos reales, profesores asignados, salas y cupos disponibles por semestre.
  * **Detección automática de topes de horario** y botón de **Auto-asignación sin topes**.
  * Descarga directa del **Programa Oficial de Asignatura en PDF** desde SIGA (`oai_academia.jsp`) y visualización de **evaluaciones y reseñas docentes estudiantiles**.
* **Solver de Notas (Estilo WolframAlpha):** Configura las ponderaciones de tus ramos en curso, ingresa tus notas parciales y despeja automáticamente cuánto necesitas en los certámenes, controles o laboratorios restantes para llegar al **55**.
* **100% Privado y Sin Servidor:** Todo tu progreso se guarda localmente en tu navegador (`localStorage`), con opción de exportar e importar tu respaldo en formato `.json`.

## Arquitectura Híbrida de Datos SIGA

El sistema implementa una arquitectura de triple respaldo para asegurar disponibilidad continua sin exponer credenciales en el navegador:

1. **Espejo Local + GitHub Actions (`.github/workflows/sync-data.yml`):** Sincroniza periódicamente los datasets pre-compilados (`public/data/*.json`) mediante `npm run sync:data`.
2. **Fallback en Vivo por CDN (`sigaService.ts`):** Si un archivo local no está disponible, el cliente consulta automáticamente el espejo CDN de GitHub (`jsDelivr`).
3. **Scraper Autónomo SIGA en Python (`scripts/siga-scraper/`):** En caso de que la fuente upstream deje de existir o pase a privado, el repositorio incluye el scraper completo de SIGA (`generar.py`) y la documentación técnica de todos los endpoints JSP de `siga.usm.cl` en [`docs/SIGA_SCRAPER_ARCHITECTURE.md`](docs/SIGA_SCRAPER_ARCHITECTURE.md).

## Stack Tecnológico

* **Frontend:** React + TypeScript + Vite + Zustand
* **Estilos y UI:** Tailwind CSS + shadcn/ui + Lucide Icons
* **Automatización y Scraper:** Node.js (`scripts/sync-upstream-data.mjs`), Python 3 (`scripts/siga-scraper/`), GitHub Actions

## Créditos y Atribución Open-Source

* Los datasets de programación de asignaturas, planes de estudio, programas académicos y métricas docentes, así como la lógica base del scraper de SIGA, provienen del proyecto open-source [**horario-usm**](https://github.com/AlvinIsCrack/horario-usm) desarrollado por [**@AlvinIsCrack**](https://github.com/AlvinIsCrack) bajo licencia **GPLv3**.
