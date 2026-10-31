# Meta55 — USM Malla, Horario SIGA & Grade Solver

> 🌐 **Sitio Web Oficial:** [https://jota216.github.io/Malla-USM/](https://jota216.github.io/Malla-USM/)

Aplicación web interactiva de código abierto diseñada para estudiantes de todas las sedes y carreras de la **Universidad Técnica Federico Santa María (USM)**. Permite gestionar el avance de la malla curricular, planificar semestres con un motor de ruta crítica para egresar a tiempo, optimizar el horario semanal con datos reales de SIGA y calcular de forma exacta las notas necesarias para alcanzar la **Meta 55**.

---

## Autores y Desarrolladores

Este proyecto es desarrollado y mantenido por:

* **Joaquín D. Barrios** — GitHub: [@Jota216](https://github.com/Jota216)
* **Jose Astudillo** — GitHub: [@jastudilloi](https://github.com/jastudilloi)

🔗 **Acceso a la plataforma:** [https://jota216.github.io/Malla-USM/](https://jota216.github.io/Malla-USM/)

---

## Características Principales

* **Catálogo Multi-Carrera y Multi-Sede USM:** Soporte para todas las carreras, menciones y planes de estudio de **Casa Central Valparaíso, Santiago San Joaquín, Santiago Vitacura, Viña del Mar y Concepción**.
* **Malla Curricular Interactiva & Modo "Mi Planificación" (DAG):**
  * Visualiza los ramos por semestre, marca asignaturas aprobadas y descubre qué ramos tienes desbloqueados.
  * **Modo Planificador:** Reordena asignaturas entre semestres futuros, añade semestres extra (12, 13, ...) con **bloqueo estricto de prerrequisitos** y opción de empujar dependientes en cascada.
  * **⚡ Algoritmo de Ruta Crítica (Auto-Planificador de Salida Rápida):** Calcula la longitud del camino crítico ($L_u$) y grado de desbloqueo ($D_u$), destacando asignaturas cuello de botella (`🔥 Crítico` / `⭐ Clave`) y programando la carrera para egresar en el menor tiempo posible respetando un límite de créditos SCT configurables.
* **Optimizador Multi-Criterio de Horario Semestral SIGA:**
  * Consulta paralelos reales, profesores asignados, salas y cupos actualizados.
  * **Motor de Optimización Inteligente:** Evalúa combinaciones de paralelos para:
    1. **Minimizar Topes** (cero colisiones de bloques).
    2. **Minimizar Ventanas** (compactación horaria sin tiempos muertos en campus).
    3. **Maximizar Tiempo Libre** (concentración de clases para dejar días completos o medios días libres).
  * Previsualización instantánea al pasar el cursor y exportación a calendario `.ics` (Google Calendar, Apple Calendar, Outlook).
  * Ficha psicopedagógica de **evaluaciones y reseñas docentes estudiantiles**.
* **Calculadora y Solver de Notas ("WolframAlpha USM"):**
  * Despeje algebraico analítico inverso para alcanzar la **Meta 55** ($NF \ge 55$).
  * Sub-fórmulas compuestas ($PCE$, $PC$, $PP$), operadores $\min$ para descarte de peores notas y regla de penalización oficial USM ($NF = \min(\dots)$ ante reprobación de bloque mínimo).
  * Diálogo de confirmación para evitar la pérdida accidental de notas al desinscribir asignaturas.
* **100% Privado y Sin Servidor:** Todo tu progreso se guarda localmente en tu navegador (`localStorage`), con opción de exportar e importar tu respaldo en formato `.json`.

---

## Arquitectura Híbrida de Datos SIGA

El sistema implementa una arquitectura de triple respaldo para asegurar disponibilidad continua sin exponer credenciales en el navegador:

1. **Espejo Local + GitHub Actions (`.github/workflows/sync-data.yml`):** Sincroniza periódicamente los datasets pre-compilados (`public/data/*.json`) mediante `npm run sync:data`.
2. **Fallback en Vivo por CDN (`sigaService.ts`):** Si un archivo local no está disponible, el cliente consulta automáticamente el espejo CDN de GitHub (`jsDelivr`).
3. **Scraper Autónomo SIGA en Python (`scripts/siga-scraper/`):** En caso de que la fuente upstream deje de existir o pase a privado, el repositorio incluye el scraper completo de SIGA (`generar.py`) y la documentación técnica de todos los endpoints JSP de `siga.usm.cl` en [`docs/SIGA_SCRAPER_ARCHITECTURE.md`](docs/SIGA_SCRAPER_ARCHITECTURE.md).

---

## Stack Tecnológico

* **Frontend:** React 18 + TypeScript + Vite + Zustand (con middleware `persist`)
* **Estilos y UI:** Tailwind CSS + shadcn/ui + Lucide Icons (Tema Oscuro `zinc-950` nativo)
* **Motores Matemáticos:** Funciones puras en TypeScript para resolución de grafos DAG, análisis de ruta crítica, álgebra de notas y optimización combinatoria de horarios
* **Automatización y Scraper:** Node.js (`scripts/sync-upstream-data.mjs`), Python 3 (`scripts/siga-scraper/`), GitHub Actions

---

## Créditos y Atribución Open-Source

* Los datasets de programación de asignaturas, planes de estudio, programas académicos y métricas docentes, así como la lógica base del scraper de SIGA, provienen del proyecto open-source [**horario-usm**](https://github.com/AlvinIsCrack/horario-usm) desarrollado por [**@AlvinIsCrack**](https://github.com/AlvinIsCrack) bajo licencia **GPLv3**.
