# Project Specification: USM Malla & Grade Solver (Sansano Academic Tracker)

## 1. Rol y Objetivo para el Agente de IA
Actúa como un **Senior Frontend Architect & Product Designer**. Tu objetivo es construir una aplicación web 100% Client-Side (SPA) moderna, rápida y responsiva para los estudiantes de la **Universidad Técnica Federico Santa María (USM)**. 

La aplicación tiene dos propósitos principales:
1. **Malla Curricular Interactiva:** Visualizar el avance académico, marcar ramos aprobados/en curso, desbloquear prerrequisitos automáticamente (Grafo Acíclico Dirigido) y calcular estadísticas de avance (Créditos USM, Créditos SCT, porcentaje de carrera).
2. **Calculadora y Solucionador de Notas ("WolframAlpha USM"):** Permitir al alumno armar su semestre actual, configurar las reglas de aprobación de cada ramo (ponderaciones, promedios mínimos de certámenes, laboratorios, certamen global recuperativo) e ingresar sus notas parciales para que el sistema **despeje matemáticamente qué notas necesita en las evaluaciones restantes para aprobar (Nota $\ge 55$)**.

---

## 2. Tech Stack & Librerías Requeridas
- **Framework:** React 18+ con TypeScript y Vite (`npm create vite@latest`).
- **Estilos y UI:** Tailwind CSS + **shadcn/ui** (Radix UI primitives) + `lucide-react` para íconos.
- **Gestión de Estado y Persistencia:** `zustand` (con middleware `persist` conectado a `localStorage`) o Context API + Custom Hook `useLocalStorage`.
- **Motor Matemático:** Funciones puras en TypeScript para despeje algebraico lineal y evaluación de restricciones (inecuaciones).
- **Arquitectura de Datos (Preparada para SIGA):** Implementar un patrón *Data Provider / Service Layer* (`src/services/curriculumService.ts`). Inicialmente leerá el JSON local de Ingeniería Civil Informática (`ici-2014.json`), pero debe estar desacoplado mediante promesas (`async/await`) para conectarse futuramente a un endpoint o scraper del SIGA USM.
- **Hosting:** GitHub Pages (mediante GitHub Actions).

---

## 3. Reglas de Negocio de la USM (Contexto Crítico)
1. **Escala de Notas:** De `0` a `100`. La nota mínima de aprobación es **`55`**.
2. **Estructura de Evaluaciones Típica:**
   - Un ramo se divide en bloques o categorías (ej. *Certámenes*, *Controles/Quices*, *Laboratorio/Tareas*).
   - **Aprobación Estándar:** $NF = \sum (Peso_i \times Nota_i) \ge 55$.
   - **Requisitos de "Muerte Súbita" (Constraints):** Muchos ramos exigen condiciones adicionales por bloque. Ejemplo clásico: *"Promedio de Certámenes $\ge 50$ y Promedio de Laboratorio $\ge 55$"*. Si el alumno tiene promedio final 60 pero su laboratorio promedia 52, reprueba. El solver debe alertar cuál es la restricción activa más exigente.
   - **Certamen Global / Recuperativo:** Opción configurable por ramo donde una evaluación final reemplaza la peor nota del grupo "Certámenes".

---

## 4. Diseño de Vistas y Componentes (shadcn/ui)

La aplicación debe tener un `Layout` principal con una barra superior (`Navbar`) que incluya:
- Selector de Carrera (por ahora "Ingeniería Civil Informática - Plan 2014").
- Indicadores rápidos (Badges de shadcn): `Créditos SCT Aprobados`, `% Avance`, `Promedio General Acumulado`.
- Botones de **Importar / Exportar JSON** (Dialog de shadcn) para respaldar el `localStorage`.
- Navegación principal mediante `Tabs` de shadcn/ui con 3 vistas principales:

### Vista 1: Malla Interactiva (`<CurriculumGrid />`)
- **Distribución:** Grilla horizontal de 11 columnas (Semestre I al Semestre XI) con scroll horizontal suave en pantallas pequeñas.
- **Tarjeta de Ramo (`<CourseCard />`):**
  - Muestra: `sigla` (ej. INF-253), `id` correlativo en un círculo, `nombre`, `creditos_usm` | `creditos_sct`, y los `prerrequisitos`.
  - Borde superior o lateral coloreado según el `area` del ramo.
  - **Estados visuales e interactivos:**
    1. `APPROVED` (Verde/Esmeralda): Ramo aprobado.
    2. `IN_PROGRESS` (Azul/Ámbar con animación sutil): Ramo inscrito en el semestre actual.
    3. `AVAILABLE` (Fondo normal, borde brillante): No aprobado, pero **todos** sus prerrequisitos están en `APPROVED`.
    4. `LOCKED` (Opacidad 40%, cursor-not-allowed): Faltan prerrequisitos por aprobar. Al hacer hover (`Tooltip` de shadcn), muestra exactamente qué siglas le faltan para desbloquearlo.
  - **Interacción:** Clic izquierdo alterna entre `AVAILABLE` $\rightarrow$ `APPROVED`. Botón secundario o menú contextual (`DropdownMenu`) permite enviarlo directo a "Cursando este semestre" (`IN_PROGRESS`).

### Vista 2: Planificador de Semestre y Solver de Notas (`<SemesterSolver />`)
Esta es la vista estilo "WolframAlpha".
- **Panel Izquierdo:** Lista de ramos actualmente en estado `IN_PROGRESS` (o botón `+ Agregar Ramo al Semestre` usando un `Command` / `Combobox` de shadcn).
- **Panel Central/Derecho (Detalle del Ramo Seleccionado):**
  1. **Configurador de Fórmula (`<FormulaBuilder />`):**
     - Permite crear grupos de evaluación (ej. "Certámenes - 70%", "Tareas - 30%").
     - Dentro de cada grupo, permite añadir evaluaciones individuales (ej. `C1 (30%)`, `C2 (35%)`, `C3 (35%)`).
     - Sección de **Requisitos Extra:** Switches para activar *"Exigir promedio mínimo en este grupo"* (input numérico, ej. `50`) o *"Habilitar Certamen Recuperativo (reemplaza peor nota)"*.
  2. **Tabla de Notas e Incógnitas:**
     - Inputs numéricos (`0-100`) para cada evaluación. Si un input está vacío (`null`), el motor matemático lo trata como una **incógnita ($x_i$)**.
  3. **Diagnóstico Matemático en Tiempo Real (`<SolverOutput />`):**
     - Card destacada con `Progress` bar de puntos acumulados vs meta (`55`).
     - **Modo 1 (Despeje Automático Equilibrado):** Calcula la nota uniforme $X$ que el alumno debe obtener en todas las evaluaciones vacías para llegar a 55 y cumplir todas las restricciones de grupo.
       - *Ejemplo de output:* `"Tienes 34.5 pts asegurados. Necesitas promediar un 68 en [C3, Tarea 4] para aprobar el ramo."`
     - **Modo 2 (Simulador con Sliders):** Por cada evaluación vacía, muestra un `Slider` de shadcn (`0` a `100`). Si el usuario mueve manualmente el slider de una evaluación (fijando un supuesto), los demás sliders se recalculan automáticamente en vivo para mantener la ecuación en $NF = 55$.
     - **Alertas de Estado (`Alert` de shadcn):**
       - *Matemáticamente Aprobado:* Si aún sacando `0` en lo que falta ya supera el 55 y los requisitos.
       - *En Peligro / Requiere Recuperativo:* Si la nota necesaria en alguna evaluación supera `100`.

### Vista 3: Estadísticas y Requisitos de Titulación (`<AnalyticsDashboard />`)
- Progreso de Hitos (Checklists usando `Checkbox` y `Card` de shadcn):
  - Diagnóstico Bachiller (Semestre 4) y Diagnóstico Licenciatura (Semestre 8).
  - Dominio del Inglés (TOEIC $\ge 550$ pts) y registro de cursos HCW convalidables.
  - Práctica Industrial y Práctica Profesional.

---

## 5. Especificación del Motor Matemático (`src/engine/gradeSolver.ts`)

Implementar una función pura `solveCourseStatus(courseConfig)` que reciba las evaluaciones y devuelva el diagnóstico:

$$\text{Nota Final} = \sum_{g \in \text{Grupos}} W_g \cdot \left( \sum_{e \in g} w_{g,e} \cdot N_{g,e} \right)$$

Donde:
- $W_g$ es el peso del grupo en la nota final ($\sum W_g = 1$).
- $w_{g,e}$ es el peso de la evaluación $e$ dentro del grupo $g$ ($\sum_e w_{g,e} = 1$).
- El peso global absoluto de una evaluación es $\alpha_{g,e} = W_g \cdot w_{g,e}$.

**Algoritmo de Despeje:**
1. Separar evaluaciones con nota conocida ($K$) y evaluaciones vacías/incógnitas ($U$).
2. Calcular **Puntos Acumulados**: $P_{acum} = \sum_{e \in K} \alpha_e \cdot N_e$.
3. Calcular **Peso Restante Total**: $\alpha_{rest} = \sum_{e \in U} \alpha_e$.
4. **Cálculo por Nota Final ($\ge 55$):**
   $$X_{global} = \frac{55 - P_{acum}}{\alpha_{rest}}$$
5. **Cálculo por Restricción de Grupo ($g$ con mínimo $M_g$):**
   Para cada grupo con requisito mínimo $M_g$:
   $$X_{grupo\_g} = \frac{M_g - \sum_{e \in K_g} w_{g,e} \cdot N_{g,e}}{\sum_{e \in U_g} w_{g,e}}$$
6. El sistema debe reportar tanto $X_{global}$ como cada $X_{grupo\_g}$ para que el estudiante sepa exactamente qué evaluación le exige mayor nota.

---

## 6.Estructura de Carpetas Sugerida

```text
src/
├── components/
│   ├── ui/                  # Componentes generados por shadcn/ui
│   ├── layout/              # Navbar, Footer, DataBackupModal
│   ├── curriculum/          # CurriculumGrid, SemesterColumn, CourseCard
│   ├── solver/              # SemesterSolver, FormulaBuilder, SolverOutput, InteractiveSliders
│   └── analytics/           # AnalyticsDashboard, GraduationRequirements
├── data/
│   └── ici-2014.json        # Datos iniciales de Ingeniería Civil Informática
├── engine/
│   ├── gradeSolver.ts       # Lógica de despeje de notas y restricciones
│   └── graphUnlock.ts       # Lógica de prerrequisitos (DAG)
├── services/
│   └── sigaService.ts       # Capa de abstracción para futura conexión con SIGA USM
├── store/
│   └── useAcademicStore.ts  # Estado global con Zustand + persistencia en localStorage
├── types/
│   └── academic.ts          # Interfaces TypeScript (Course, EvaluationGroup, SolverResult)
└── App.tsx
```

---

## 7. Datos Semilla (`src/data/ici-2014.json`)

Utiliza exactamente este JSON como fuente de datos inicial para poblar la malla de **Ingeniería Civil Informática (Plan 2014)**:

```json
{
  "carrera": "Ingeniería Civil Informática",
  "codigo_plan": "7313",
  "plan": "2014",
  "universidad": "Universidad Técnica Federico Santa María",
  "escala_notas": { "minima": 0, "maxima": 100, "aprobacion": 55 },
  "areas": {
    "MFQ": { "nombre": "Matemáticas, Físicas y Química", "color": "#008B8B" },
    "IC": { "nombre": "Industrial y Comercial", "color": "#4682B4" },
    "HEFL": { "nombre": "Humanistas, Educación Física y Libres", "color": "#9ACD32" },
    "TI": { "nombre": "Transversal y de Integración", "color": "#A52A2A" },
    "FI": { "nombre": "Fundamentos de Informática", "color": "#1E5AA8" },
    "SID": { "nombre": "Sistemas de Información y de Decisión", "color": "#8B2635" },
    "ISD": { "nombre": "Ingeniería de Software y Datos", "color": "#F4C430" },
    "ITIC": { "nombre": "Infraestructura TIC", "color": "#5D4777" },
    "CCI": { "nombre": "Computación en Ciencia e Ingeniería", "color": "#2E8B57" },
    "ELEC": { "nombre": "Electivos Informática y Electivos", "color": "#F28C28" }
  },
  "ramos": [
    { "id": 1, "sigla": "IWI-131", "nombre": "Programación", "semestre": 1, "creditos_usm": 3, "creditos_sct": 5, "area": "FI", "prerrequisitos": [] },
    { "id": 2, "sigla": "MAT-021", "nombre": "Matemáticas I", "semestre": 1, "creditos_usm": 5, "creditos_sct": 8, "area": "MFQ", "prerrequisitos": [] },
    { "id": 3, "sigla": "FIS-100", "nombre": "Introducción a la Física", "semestre": 1, "creditos_usm": 3, "creditos_sct": 6, "area": "MFQ", "prerrequisitos": [] },
    { "id": 4, "sigla": "HRW-132", "nombre": "Humanístico I", "semestre": 1, "creditos_usm": 2, "creditos_sct": 3, "area": "HEFL", "prerrequisitos": [] },
    { "id": 5, "sigla": "DEW-100", "nombre": "Educación Física I", "semestre": 1, "creditos_usm": 1, "creditos_sct": 2, "area": "HEFL", "prerrequisitos": [] },
    { "id": 6, "sigla": "QUI-010", "nombre": "Química y Sociedad", "semestre": 2, "creditos_usm": 3, "creditos_sct": 5, "area": "MFQ", "prerrequisitos": [] },
    { "id": 7, "sigla": "MAT-022", "nombre": "Matemáticas II", "semestre": 2, "creditos_usm": 5, "creditos_sct": 7, "area": "MFQ", "prerrequisitos": ["MAT-021"] },
    { "id": 8, "sigla": "FIS-110", "nombre": "Física General I", "semestre": 2, "creditos_usm": 5, "creditos_sct": 8, "area": "MFQ", "prerrequisitos": ["MAT-021", "FIS-100"] },
    { "id": 9, "sigla": "IWG-101", "nombre": "Introducción a la Ingeniería", "semestre": 2, "creditos_usm": 2, "creditos_sct": 3, "area": "TI", "prerrequisitos": [] },
    { "id": 10, "sigla": "HRW-133", "nombre": "Humanístico II", "semestre": 2, "creditos_usm": 2, "creditos_sct": 3, "area": "HEFL", "prerrequisitos": [] },
    { "id": 11, "sigla": "DEW-101", "nombre": "Educación Física II", "semestre": 2, "creditos_usm": 1, "creditos_sct": 2, "area": "HEFL", "prerrequisitos": ["DEW-100"] },
    { "id": 12, "sigla": "INF-134", "nombre": "Estructuras de Datos", "semestre": 3, "creditos_usm": 3, "creditos_sct": 5, "area": "FI", "prerrequisitos": ["IWI-131"] },
    { "id": 13, "sigla": "MAT-023", "nombre": "Matemáticas III", "semestre": 3, "creditos_usm": 4, "creditos_sct": 7, "area": "MFQ", "prerrequisitos": ["MAT-022"] },
    { "id": 14, "sigla": "FIS-130", "nombre": "Física General III", "semestre": 3, "creditos_usm": 4, "creditos_sct": 8, "area": "MFQ", "prerrequisitos": ["MAT-022", "FIS-110"] },
    { "id": 15, "sigla": "INF-152", "nombre": "Estructuras Discretas", "semestre": 3, "creditos_usm": 3, "creditos_sct": 5, "area": "FI", "prerrequisitos": ["IWI-131", "MAT-021"] },
    { "id": 16, "sigla": "INF-260", "nombre": "Teoría de Sistemas", "semestre": 3, "creditos_usm": 3, "creditos_sct": 5, "area": "SID", "prerrequisitos": ["IWG-101"] },
    { "id": 17, "sigla": "INF-1", "nombre": "Libre 1 / Actividad Co-curricular", "semestre": 3, "creditos_usm": 1, "creditos_sct": 2, "area": "HEFL", "prerrequisitos": [] },
    { "id": 18, "sigla": "INF-253", "nombre": "Lenguajes de Programación", "semestre": 4, "creditos_usm": 3, "creditos_sct": 5, "area": "FI", "prerrequisitos": ["INF-134"] },
    { "id": 19, "sigla": "MAT-024", "nombre": "Matemáticas IV", "semestre": 4, "creditos_usm": 4, "creditos_sct": 6, "area": "MFQ", "prerrequisitos": ["MAT-023"] },
    { "id": 20, "sigla": "FIS-120", "nombre": "Física General II", "semestre": 4, "creditos_usm": 4, "creditos_sct": 8, "area": "MFQ", "prerrequisitos": ["MAT-022", "FIS-110"] },
    { "id": 21, "sigla": "INF-155", "nombre": "Informática Teórica", "semestre": 4, "creditos_usm": 3, "creditos_sct": 5, "area": "FI", "prerrequisitos": ["INF-134", "INF-152"] },
    { "id": 22, "sigla": "IWN-170", "nombre": "Economía IA", "semestre": 4, "creditos_usm": 3, "creditos_sct": 5, "area": "IC", "prerrequisitos": ["MAT-023"] },
    { "id": 23, "sigla": "INF-2", "nombre": "Libre 2 / Actividad Co-curricular", "semestre": 4, "creditos_usm": 1, "creditos_sct": 2, "area": "HEFL", "prerrequisitos": [] },
    { "id": 24, "sigla": "INF-239", "nombre": "Bases de Datos", "semestre": 5, "creditos_usm": 3, "creditos_sct": 5, "area": "ISD", "prerrequisitos": ["INF-134"] },
    { "id": 25, "sigla": "INF-245", "nombre": "Arquitectura y Organización de Computadores", "semestre": 5, "creditos_usm": 3, "creditos_sct": 5, "area": "ITIC", "prerrequisitos": ["INF-134"] },
    { "id": 26, "sigla": "FIS-140", "nombre": "Física General IV", "semestre": 5, "creditos_usm": 4, "creditos_sct": 8, "area": "MFQ", "prerrequisitos": ["FIS-130", "FIS-120"] },
    { "id": 27, "sigla": "INF-280", "nombre": "Estadística Computacional", "semestre": 5, "creditos_usm": 3, "creditos_sct": 5, "area": "CCI", "prerrequisitos": ["IWI-131", "MAT-023"] },
    { "id": 28, "sigla": "INF-270", "nombre": "Organizaciones y Sistemas de Información", "semestre": 5, "creditos_usm": 3, "creditos_sct": 5, "area": "SID", "prerrequisitos": ["INF-260"] },
    { "id": 29, "sigla": "INF-3", "nombre": "Libre 3 / Actividad Co-curricular", "semestre": 5, "creditos_usm": 1, "creditos_sct": 2, "area": "HEFL", "prerrequisitos": [] },
    { "id": 30, "sigla": "INF-236", "nombre": "Análisis y Diseño de Software", "semestre": 6, "creditos_usm": 3, "creditos_sct": 5, "area": "ISD", "prerrequisitos": ["INF-239", "INF-253"] },
    { "id": 31, "sigla": "INF-246", "nombre": "Sistemas Operativos", "semestre": 6, "creditos_usm": 3, "creditos_sct": 5, "area": "ITIC", "prerrequisitos": ["INF-245"] },
    { "id": 32, "sigla": "INF-276", "nombre": "Ingeniería, Informática y Sociedad", "semestre": 6, "creditos_usm": 3, "creditos_sct": 5, "area": "TI", "prerrequisitos": ["INF-270"] },
    { "id": 33, "sigla": "INF-221", "nombre": "Algoritmos y Complejidad", "semestre": 6, "creditos_usm": 3, "creditos_sct": 5, "area": "FI", "prerrequisitos": ["INF-152", "INF-253"] },
    { "id": 34, "sigla": "INF-292", "nombre": "Optimización", "semestre": 6, "creditos_usm": 3, "creditos_sct": 5, "area": "SID", "prerrequisitos": ["IWI-131", "MAT-023"] },
    { "id": 35, "sigla": "INF-4", "nombre": "Libre 4 / Actividad Co-curricular", "semestre": 6, "creditos_usm": 1, "creditos_sct": 2, "area": "HEFL", "prerrequisitos": [] },
    { "id": 36, "sigla": "INF-225", "nombre": "Ingeniería de Software", "semestre": 7, "creditos_usm": 3, "creditos_sct": 5, "area": "ISD", "prerrequisitos": ["INF-236"] },
    { "id": 37, "sigla": "INF-256", "nombre": "Redes de Computadores", "semestre": 7, "creditos_usm": 3, "creditos_sct": 5, "area": "ITIC", "prerrequisitos": ["INF-246"] },
    { "id": 38, "sigla": "ICN-270", "nombre": "Información y Matemáticas Financieras", "semestre": 7, "creditos_usm": 3, "creditos_sct": 5, "area": "IC", "prerrequisitos": ["IWN-170"] },
    { "id": 39, "sigla": "INF-285", "nombre": "Computación Científica", "semestre": 7, "creditos_usm": 3, "creditos_sct": 5, "area": "CCI", "prerrequisitos": ["MAT-024", "INF-221"] },
    { "id": 40, "sigla": "INF-293", "nombre": "Investigación de Operaciones", "semestre": 7, "creditos_usm": 3, "creditos_sct": 6, "area": "SID", "prerrequisitos": ["INF-280", "INF-292"] },
    { "id": 41, "sigla": "INF-5", "nombre": "Libre 5 / Actividad Co-curricular", "semestre": 7, "creditos_usm": 1, "creditos_sct": 2, "area": "HEFL", "prerrequisitos": [] },
    { "id": 42, "sigla": "INF-322", "nombre": "Diseño Interfaces Usuarias", "semestre": 8, "creditos_usm": 3, "creditos_sct": 5, "area": "ISD", "prerrequisitos": ["INF-225"] },
    { "id": 43, "sigla": "INF-343", "nombre": "Sistemas Distribuidos", "semestre": 8, "creditos_usm": 3, "creditos_sct": 5, "area": "ITIC", "prerrequisitos": ["INF-256"] },
    { "id": 44, "sigla": "INF-301", "nombre": "Electivo Informática I", "semestre": 8, "creditos_usm": 3, "creditos_sct": 5, "area": "ELEC", "prerrequisitos": [] },
    { "id": 45, "sigla": "INF-295", "nombre": "Inteligencia Artificial", "semestre": 8, "creditos_usm": 3, "creditos_sct": 5, "area": "CCI", "prerrequisitos": ["INF-292", "INF-221"] },
    { "id": 46, "sigla": "INF-266", "nombre": "Sistemas de Gestión", "semestre": 8, "creditos_usm": 3, "creditos_sct": 5, "area": "SID", "prerrequisitos": ["INF-270", "INF-276"] },
    { "id": 47, "sigla": "INF-6", "nombre": "Libre 6 / Actividad Co-curricular", "semestre": 8, "creditos_usm": 1, "creditos_sct": 2, "area": "HEFL", "prerrequisitos": [] },
    { "id": 48, "sigla": "INF-302", "nombre": "Electivo Informática II", "semestre": 9, "creditos_usm": 3, "creditos_sct": 5, "area": "ELEC", "prerrequisitos": [] },
    { "id": 49, "sigla": "INF-303", "nombre": "Electivo Informática III", "semestre": 9, "creditos_usm": 3, "creditos_sct": 5, "area": "ELEC", "prerrequisitos": [] },
    { "id": 50, "sigla": "INF-311", "nombre": "Electivo I", "semestre": 9, "creditos_usm": 3, "creditos_sct": 5, "area": "ELEC", "prerrequisitos": [] },
    { "id": 51, "sigla": "INF-312", "nombre": "Electivo II", "semestre": 9, "creditos_usm": 3, "creditos_sct": 5, "area": "ELEC", "prerrequisitos": [] },
    { "id": 52, "sigla": "INF-360", "nombre": "Gestión de Proyectos de Informática", "semestre": 9, "creditos_usm": 3, "creditos_sct": 5, "area": "TI", "prerrequisitos": ["INF-322", "INF-266"] },
    { "id": 53, "sigla": "INF-7", "nombre": "Libre 7 / Actividad Co-curricular", "semestre": 9, "creditos_usm": 1, "creditos_sct": 2, "area": "HEFL", "prerrequisitos": [] },
    { "id": 54, "sigla": "INF-304", "nombre": "Electivo Informática IV", "semestre": 10, "creditos_usm": 3, "creditos_sct": 5, "area": "ELEC", "prerrequisitos": [] },
    { "id": 55, "sigla": "INF-313", "nombre": "Electivo III", "semestre": 10, "creditos_usm": 3, "creditos_sct": 5, "area": "ELEC", "prerrequisitos": [] },
    { "id": 56, "sigla": "INF-314", "nombre": "Electivo IV", "semestre": 10, "creditos_usm": 3, "creditos_sct": 5, "area": "ELEC", "prerrequisitos": [] },
    { "id": 57, "sigla": "INF-228", "nombre": "Taller Desarrollo de Proyecto de Informática", "semestre": 10, "creditos_usm": 6, "creditos_sct": 10, "area": "TI", "prerrequisitos": ["INF-360"] },
    { "id": 58, "sigla": "INF-309", "nombre": "Trabajo de Título 1", "semestre": 10, "creditos_usm": 1, "creditos_sct": 2, "area": "TI", "prerrequisitos": ["INF-360"] },
    { "id": 59, "sigla": "INF-310", "nombre": "Trabajo de Título 2", "semestre": 11, "creditos_usm": 12, "creditos_sct": 20, "area": "TI", "prerrequisitos": ["INF-228", "INF-309"] }
  ]
}
```

---

## 8. Plantillas Pre-cargadas de Fórmulas (Default Syllabus Templates)
Cuando el usuario agregue un ramo a su semestre, inicialízalo con una plantilla estándar USM editable:
- **Bloque 1: Certámenes (Peso: 70%)** $\rightarrow$ `C1 (33.3%)`, `C2 (33.3%)`, `C3 (33.4%)`. Requisito mínimo de bloque: `50`.
- **Bloque 2: Controles / Tareas (Peso: 30%)** $\rightarrow$ `T1 (50%)`, `T2 (50%)`. Sin requisito mínimo.

---

## 9. Configuración para Despliegue en GitHub Pages

1. En `vite.config.ts`, configura la propiedad `base` usando el nombre del repositorio:
   ```typescript
   export default defineConfig({
     plugins: [react()],
     base: './', // Usar './' permite que funcione en cualquier subruta de GitHub Pages sin romper los assets
     resolve: {
       alias: { "@": path.resolve(__dirname, "./src") }
     }
   })
   ```
2. Crea el archivo `.github/workflows/deploy.yml` para despliegue automático con GitHub Actions cada vez que se haga `push` a la rama `main`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: ["main"]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: "pages"
     cancel-in-progress: true

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4
         - name: Setup Node
           uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: 'npm'
         - name: Install dependencies
           run: npm ci
         - name: Build
           run: npm run build
         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: ./dist

     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       needs: build
       steps:
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```


---

## 10. Documentación de Cambios e Implementación Realizada

### 10.1 Resumen Ejecutivo
Se completó la implementación íntegra del proyecto **Sansano Academic Tracker (USM Malla & Grade Solver)** siguiendo al 100% las especificaciones de este documento. La aplicación está construida sobre **React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Radix UI + Zustand**, lista para ejecutarse localmente y para despliegue automatizado en **GitHub Pages** mediante GitHub Actions.

La arquitectura fue orquestada y delegada mediante sub-agentes especializados:
1. **`setup-agent`**: Inicialización del entorno, dependencias de producción y desarrollo, configuración de Tailwind con colores corporativos USM, tsconfig con alias `@/*`, vite.config.ts, y GitHub Actions workflow.
2. **`engine-store-agent`**: Modelado estricto de tipos (`src/types/academic.ts`), integración de datos semilla de ICI-2014 (`src/data/ici-2014.json`), plantillas de evaluación USM (`src/data/defaultTemplates.ts`), servicios asíncronos desacoplados (`curriculumService.ts` y `sigaService.ts`), motor matemático de despeje lineal y restricciones ("Wolfram USM" en `gradeSolver.ts`), motor de resolución DAG de prerrequisitos (`graphUnlock.ts`), store global persistente con Zustand (`useAcademicStore.ts`), y suite de tests unitarios verificados.
3. **`ui-views-agent`**: Construcción de 16 primitivas accesibles de shadcn/ui en `src/components/ui/`, barra superior `Navbar` con estadísticas en tiempo real y selector de carrera, modal de respaldo `DataBackupModal` (importar/exportar JSON), Vista 1 de Malla Curricular con 11 columnas e interactividad con confeti, Vista 2 de Wolfram USM Solver con editor de fórmulas y simulador de sliders dinámicos, Vista 3 de Dashboard de Titulación y Estadísticas, y layout maestro en `App.tsx`.

---

### 10.2 Árbol de Archivos Creados

```text
c:\Users\barri\Desktop\Malla_USM\
├── .github/
│   └── workflows/
│       └── deploy.yml                   # Despliegue automático a GitHub Pages
├── dist/                                # Compilación optimizada lista para producción
├── src/
│   ├── components/
│   │   ├── analytics/
│   │   │   └── AnalyticsDashboard.tsx   # Vista 3: Métricas SCT/USM, checklist de hitos y áreas
│   │   ├── curriculum/
│   │   │   ├── CourseCard.tsx           # Tarjeta interactiva (APPROVED, IN_PROGRESS, AVAILABLE, LOCKED)
│   │   │   ├── CourseDetailModal.tsx    # Modal de ficha técnica, prerrequisitos y dependencias
│   │   │   ├── CurriculumGrid.tsx       # Vista 1: Grilla de 11 semestres, leyenda de áreas y filtros
│   │   │   └── SemesterColumn.tsx       # Columna de semestre con badges y progreso
│   │   ├── layout/
│   │   │   ├── DataBackupModal.tsx      # Modal para importar/exportar JSON de respaldo
│   │   │   ├── Footer.tsx               # Pie de página institucional USM
│   │   │   └── Navbar.tsx               # Barra superior con KPIs (SCT, %, GPA), tabs y acciones
│   │   ├── solver/
│   │   │   ├── FormulaBuilder.tsx       # Configurador de ponderaciones, grupos, mínimos y recuperativo
│   │   │   ├── InteractiveSliders.tsx   # Modo 2: Sliders dinámicos con rebalanceo automático
│   │   │   ├── SemesterSolver.tsx       # Vista 2: Wolfram USM Solver, panel lateral y combobox
│   │   │   └── SolverOutput.tsx         # Diagnóstico algebraico en tiempo real y progreso a 55
│   │   └── ui/                          # Primitivas shadcn/ui accesibles (Radix UI)
│   │       ├── alert.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── command.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── popover.tsx
│   │       ├── progress.tsx
│   │       ├── slider.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       └── tooltip.tsx
│   ├── data/
│   │   ├── defaultTemplates.ts          # Plantilla USM (70% Certámenes min 50 + 30% Tareas) e hitos
│   │   └── ici-2014.json                # Malla completa ICI Plan 2014 (59 ramos, 10 áreas temáticas)
│   ├── engine/
│   │   ├── gradeSolver.test.ts          # 8 tests exhaustivos de validación matemática y DAG
│   │   ├── gradeSolver.ts               # Motor matemático: despeje lineal, restricciones y sliders
│   │   └── graphUnlock.ts               # Resolución del grafo acíclico de prerrequisitos (DAG)
│   ├── lib/
│   │   └── utils.ts                     # Helper de clases `cn()` con clsx y tailwind-merge
│   ├── services/
│   │   ├── curriculumService.ts         # Abstracción desacoplada para carga asíncrona de planes
│   │   └── sigaService.ts               # Contrato preparado para futura conexión con SIGA USM
│   ├── store/
│   │   └── useAcademicStore.ts          # Store reactivo Zustand con persistencia en localStorage
│   ├── types/
│   │   └── academic.ts                  # Tipos TypeScript para asignaturas, evaluaciones y solver
│   ├── App.tsx                          # Orquestador visual de la SPA con navegación por tabs
│   ├── index.css                        # Variables de color CSS y directivas Tailwind
│   └── main.tsx                         # Punto de entrada de React 18
├── components.json                      # Configuración de shadcn/ui
├── index.html                           # HTML base con título y favicon institucional
├── package.json                         # Dependencias, scripts y metadatos del proyecto
├── postcss.config.js                    # Plugins PostCSS (Tailwind y Autoprefixer)
├── tailwind.config.js                   # Configuración del tema Tailwind y colores corporativos USM
├── tsconfig.json                        # Configuración de TypeScript con alias de rutas
├── tsconfig.node.json                   # Configuración de TypeScript para Vite
└── vite.config.ts                       # Configuración de Vite con base './' y alias '@'
```

---

### 10.3 Detalle de Funcionalidades Implementadas

#### 1. Malla Curricular Interactiva (Vista 1)
- **Grilla Horizontal de 11 Semestres:** Visualización panorámica con scroll horizontal suave.
- **Códigos y Áreas Temáticas Oficiales:** MFQ (Cian), IC (Azul acero), HEFL (Verde oliva), TI (Marrón), FI (Azul clásico), SID (Rojo oscuro), ISD (Dorado/Ámbar), ITIC (Púrpura), CCI (Verde bosque) y ELEC (Naranja). Leyenda superior interactiva que filtra la malla al hacer clic en un área.
- **4 Estados de Ramo:**
  - `APPROVED`: Fondo esmeralda, check verde y nota registrada. Clic para desmarcar.
  - `IN_PROGRESS`: Borde iluminado con indicador pulsante "Cursando". Vinculado directamente al Solver.
  - `AVAILABLE`: Desbloqueado (todos sus prerrequisitos aprobados). Clic izquierdo lo aprueba directamente (con animación de confeti mediante `canvas-confetti`).
  - `LOCKED`: Opacidad al 45%, cursor de bloqueo. Tooltip informativo que detalla exactamente qué asignaturas le faltan para desbloquearse.
- **Menú Contextual y Modal de Ficha:** Opciones para cursar el ramo en el semestre actual, registrar nota con calificación exacta (0 a 100), o ver el árbol genealógico de prerrequisitos y asignaturas futuras que desbloquea.

#### 2. Calculadora & Wolfram USM Solver de Notas (Vista 2)
- **Panel de Ramos Inscritos:** Vista rápida de todos los ramos del semestre con diagnóstico en tiempo real (Aprobado, En Carrera, En Peligro, o nota necesaria).
- **Inscripción de Asignaturas:** Selector inteligente tipo `Command`/Combobox para buscar cualquier asignatura de la malla e incorporarla al semestre actual.
- **Configurador de Ponderaciones (`FormulaBuilder`):**
  - Creación y edición dinámica de bloques de evaluación (ej. Certámenes 70%, Tareas 30%).
  - Switch para requisito de nota mínima de bloque ("Muerte Súbita", ej. $\ge 50$ en certámenes).
  - Switch para Certamen Recuperativo con campo de nota obtenida.
  - Asignación de ponderaciones internas a cada evaluación ($w_{g,e}$) y nota (0 a 100, o vacío para tratarlo como incógnita $x_i$).
  - Botón para restablecer al instante a la plantilla estándar USM.
- **Motor Matemático en Tiempo Real (`SolverOutput`):**
  - Cálculo de puntos acumulados $P_{acum} = \sum \alpha_e \cdot N_e$ y progreso visual hacia los 55 puntos.
  - **Modo 1 (Despeje Uniforme):** Despeje algebraico de la nota necesaria $X_{global} = (55 - P_{acum}) / \alpha_{rest}$ y de las restricciones de bloque $X_{grupo\_g}$. Alerta clara si la restricción de bloque es más exigente que la meta global.
  - **Modo 2 (Sliders Interactivos Dinámicos):** Sliders de 0 a 100 para cada evaluación vacía. Al mover el supuesto de una nota, el sistema recalcula en tiempo real las evaluaciones restantes para preservar la meta de 55.
  - **Detección Automática de Escenarios:** Matemáticamente aprobado (aún sacando 0 en lo restante), en peligro (requiere $> 100$), y cálculo de la nota necesaria en el Certamen Recuperativo para rescatar el ramo.

#### 3. Titulación & Estadísticas (Vista 3)
- **Tarjetas KPI:** Créditos SCT aprobados (sobre 300), Créditos USM aprobados, Promedio Ponderado Acumulado (GPA) por créditos SCT, y proyección de semestres restantes.
- **Checklist de Requisitos de Titulación USM:**
  - Bachiller en Ciencias de la Ingeniería (verificado automáticamente al completar semestres 1 a 4).
  - Licenciatura en Ciencias de la Ingeniería (verificado automáticamente al completar semestres 1 a 8).
  - Acreditación de Dominio de Inglés (TOEIC $\ge$ 550 pts).
  - Créditos Humanistas / HCW Convalidables.
  - Práctica Industrial (Práctica 1).
  - Práctica Profesional (Práctica 2).
- **Desglose por Áreas de Conocimiento:** Barras de avance porcentual y créditos aprobados por cada una de las 10 áreas temáticas de la carrera.

#### 4. Respaldo y Persistencia
- **Persistencia en LocalStorage:** El estado del estudiante se conserva automáticamente bajo la clave `'sansano-academic-tracker-v1'`.
- **Importar / Exportar JSON:** Modal integrado para copiar al portapapeles, descargar archivo `.json` de respaldo, o importar un archivo previamente respaldado con validación de estructura.

---

### 10.5 Verificación de Calidad y Tests

1. **Suite de Pruebas Matemáticas y DAG (`src/engine/gradeSolver.test.ts`):**
   - Test 1: Normalización de pesos porcentuales y fraccionarios.
   - Test 2: Despeje lineal de nota requerida para alcanzar 55.
   - Test 3: Detección de restricción vinculante de grupo ("muerte súbita").
   - Test 4: Sustitución de certamen recuperativo por la nota más baja y rescate de ramo.
   - Test 5: Rebalanceo dinámico de sliders conservando la igualdad $NF = 55$.
   - Test 6: Detección de aprobación matemática anticipada.
   - Test 7: Validación de aciclicidad del grafo (DAG) y resolución de dependencias en los 59 ramos de ICI-2014.
   - Test 8: Integración reactiva del store Zustand, cálculo de GPA y respaldo JSON.
   - **Resultado:** 8/8 tests aprobados exitosamente (`ALL ENGINE & GRAPH TESTS PASSED SUCCESSFULLY`).

2. **Compilación de Producción:**
   - Comando: `npm run build` (`tsc && vite build`).
   - Resultado: Compilación limpia con 0 errores de TypeScript y bundle generado exitosamente en `dist/`.


---

## 10. Documentación de Cambios e Implementación Realizada

### 10.1 Resumen Ejecutivo
Se completó la implementación íntegra del proyecto **Sansano Academic Tracker (USM Malla & Grade Solver)** siguiendo al 100% las especificaciones de este documento. La aplicación está construida sobre **React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Radix UI + Zustand**, lista para ejecutarse localmente y para despliegue automatizado en **GitHub Pages** mediante GitHub Actions.

La arquitectura fue orquestada y delegada mediante sub-agentes especializados:
1. **`setup-agent`**: Inicialización del entorno, dependencias de producción y desarrollo, configuración de Tailwind con colores corporativos USM, tsconfig con alias `@/*`, vite.config.ts, y GitHub Actions workflow.
2. **`engine-store-agent`**: Modelado estricto de tipos (`src/types/academic.ts`), integración de datos semilla de ICI-2014 (`src/data/ici-2014.json`), plantillas de evaluación USM (`src/data/defaultTemplates.ts`), servicios asíncronos desacoplados (`curriculumService.ts` y `sigaService.ts`), motor matemático de despeje lineal y restricciones ("Wolfram USM" en `gradeSolver.ts`), motor de resolución DAG de prerrequisitos (`graphUnlock.ts`), store global persistente con Zustand (`useAcademicStore.ts`), y suite de tests unitarios verificados.
3. **`ui-views-agent`**: Construcción de 16 primitivas accesibles de shadcn/ui en `src/components/ui/`, barra superior `Navbar` con estadísticas en tiempo real y selector de carrera, modal de respaldo `DataBackupModal` (importar/exportar JSON), Vista 1 de Malla Curricular con 11 columnas e interactividad con confeti, Vista 2 de Wolfram USM Solver con editor de fórmulas y simulador de sliders dinámicos, Vista 3 de Dashboard de Titulación y Estadísticas, y layout maestro en `App.tsx`.

---

### 10.2 Árbol de Archivos Creados

```text
c:\Users\barri\Desktop\Malla_USM\
├── .github/
│   └── workflows/
│       └── deploy.yml                   # Despliegue automático a GitHub Pages
├── dist/                                # Compilación optimizada lista para producción
├── src/
│   ├── components/
│   │   ├── analytics/
│   │   │   └── AnalyticsDashboard.tsx   # Vista 3: Métricas SCT/USM, checklist de hitos y áreas
│   │   ├── curriculum/
│   │   │   ├── CourseCard.tsx           # Tarjeta interactiva (APPROVED, IN_PROGRESS, AVAILABLE, LOCKED)
│   │   │   ├── CourseDetailModal.tsx    # Modal de ficha técnica, prerrequisitos y dependencias
│   │   │   ├── CurriculumGrid.tsx       # Vista 1: Grilla de 11 semestres, leyenda de áreas y filtros
│   │   │   └── SemesterColumn.tsx       # Columna de semestre con badges y progreso
│   │   ├── layout/
│   │   │   ├── DataBackupModal.tsx      # Modal para importar/exportar JSON de respaldo
│   │   │   ├── Footer.tsx               # Pie de página institucional USM
│   │   │   └── Navbar.tsx               # Barra superior con KPIs (SCT, %, GPA), tabs y acciones
│   │   ├── solver/
│   │   │   ├── FormulaBuilder.tsx       # Configurador de ponderaciones, grupos, mínimos y recuperativo
│   │   │   ├── InteractiveSliders.tsx   # Modo 2: Sliders dinámicos con rebalanceo automático
│   │   │   ├── SemesterSolver.tsx       # Vista 2: Wolfram USM Solver, panel lateral y combobox
│   │   │   └── SolverOutput.tsx         # Diagnóstico algebraico en tiempo real y progreso a 55
│   │   └── ui/                          # Primitivas shadcn/ui accesibles (Radix UI)
│   │       ├── alert.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── command.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── popover.tsx
│   │       ├── progress.tsx
│   │       ├── slider.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       └── tooltip.tsx
│   ├── data/
│   │   ├── defaultTemplates.ts          # Plantilla USM (70% Certámenes min 50 + 30% Tareas) e hitos
│   │   └── ici-2014.json                # Malla completa ICI Plan 2014 (59 ramos, 10 áreas temáticas)
│   ├── engine/
│   │   ├── gradeSolver.test.ts          # 8 tests exhaustivos de validación matemática y DAG
│   │   ├── gradeSolver.ts               # Motor matemático: despeje lineal, restricciones y sliders
│   │   └── graphUnlock.ts               # Resolución del grafo acíclico de prerrequisitos (DAG)
│   ├── lib/
│   │   └── utils.ts                     # Helper de clases `cn()` con clsx y tailwind-merge
│   ├── services/
│   │   ├── curriculumService.ts         # Abstracción desacoplada para carga asíncrona de planes
│   │   └── sigaService.ts               # Contrato preparado para futura conexión con SIGA USM
│   ├── store/
│   │   └── useAcademicStore.ts          # Store reactivo Zustand con persistencia en localStorage
│   ├── types/
│   │   └── academic.ts                  # Tipos TypeScript para asignaturas, evaluaciones y solver
│   ├── App.tsx                          # Orquestador visual de la SPA con navegación por tabs
│   ├── index.css                        # Variables de color CSS y directivas Tailwind
│   └── main.tsx                         # Punto de entrada de React 18
├── components.json                      # Configuración de shadcn/ui
├── index.html                           # HTML base con título y favicon institucional
├── package.json                         # Dependencias, scripts y metadatos del proyecto
├── postcss.config.js                    # Plugins PostCSS (Tailwind y Autoprefixer)
├── tailwind.config.js                   # Configuración del tema Tailwind y colores corporativos USM
├── tsconfig.json                        # Configuración de TypeScript con alias de rutas
├── tsconfig.node.json                   # Configuración de TypeScript para Vite
└── vite.config.ts                       # Configuración de Vite con base './' y alias '@'
```

---

### 10.3 Detalle de Funcionalidades Implementadas

#### 1. Malla Curricular Interactiva (Vista 1)
- **Grilla Horizontal de 11 Semestres:** Visualización panorámica con scroll horizontal suave.
- **Códigos y Áreas Temáticas Oficiales:** MFQ (Cian), IC (Azul acero), HEFL (Verde oliva), TI (Marrón), FI (Azul clásico), SID (Rojo oscuro), ISD (Dorado/Ámbar), ITIC (Púrpura), CCI (Verde bosque) y ELEC (Naranja). Leyenda superior interactiva que filtra la malla al hacer clic en un área.
- **4 Estados de Ramo:**
  - `APPROVED`: Fondo esmeralda, check verde y nota registrada. Clic para desmarcar.
  - `IN_PROGRESS`: Borde iluminado con indicador pulsante "Cursando". Vinculado directamente al Solver.
  - `AVAILABLE`: Desbloqueado (todos sus prerrequisitos aprobados). Clic izquierdo lo aprueba directamente (con animación de confeti mediante `canvas-confetti`).
  - `LOCKED`: Opacidad al 45%, cursor de bloqueo. Tooltip informativo que detalla exactamente qué asignaturas le faltan para desbloquearse.
- **Menú Contextual y Modal de Ficha:** Opciones para cursar el ramo en el semestre actual, registrar nota con calificación exacta (0 a 100), o ver el árbol genealógico de prerrequisitos y asignaturas futuras que desbloquea.

#### 2. Calculadora & Wolfram USM Solver de Notas (Vista 2)
- **Panel de Ramos Inscritos:** Vista rápida de todos los ramos del semestre con diagnóstico en tiempo real (Aprobado, En Carrera, En Peligro, o nota necesaria).
- **Inscripción de Asignaturas:** Selector inteligente tipo `Command`/Combobox para buscar cualquier asignatura de la malla e incorporarla al semestre actual.
- **Configurador de Ponderaciones (`FormulaBuilder`):**
  - Creación y edición dinámica de bloques de evaluación (ej. Certámenes 70%, Tareas 30%).
  - Switch para requisito de nota mínima de bloque ("Muerte Súbita", ej. $\ge 50$ en certámenes).
  - Switch para Certamen Recuperativo con campo de nota obtenida.
  - Asignación de ponderaciones internas a cada evaluación ($w_{g,e}$) y nota (0 a 100, o vacío para tratarlo como incógnita $x_i$).
  - Botón para restablecer al instante a la plantilla estándar USM.
- **Motor Matemático en Tiempo Real (`SolverOutput`):**
  - Cálculo de puntos acumulados $P_{acum} = \sum \alpha_e \cdot N_e$ y progreso visual hacia los 55 puntos.
  - **Modo 1 (Despeje Uniforme):** Despeje algebraico de la nota necesaria $X_{global} = (55 - P_{acum}) / \alpha_{rest}$ y de las restricciones de bloque $X_{grupo\_g}$. Alerta clara si la restricción de bloque es más exigente que la meta global.
  - **Modo 2 (Sliders Interactivos Dinámicos):** Sliders de 0 a 100 para cada evaluación vacía. Al mover el supuesto de una nota, el sistema recalcula en tiempo real las evaluaciones restantes para preservar la meta de 55.
  - **Detección Automática de Escenarios:** Matemáticamente aprobado (aún sacando 0 en lo restante), en peligro (requiere $> 100$), y cálculo de la nota necesaria en el Certamen Recuperativo para rescatar el ramo.

#### 3. Titulación & Estadísticas (Vista 3)
- **Tarjetas KPI:** Créditos SCT aprobados (sobre 300), Créditos USM aprobados, Promedio Ponderado Acumulado (GPA) por créditos SCT, y proyección de semestres restantes.
- **Checklist de Requisitos de Titulación USM:**
  - Bachiller en Ciencias de la Ingeniería (verificado automáticamente al completar semestres 1 a 4).
  - Licenciatura en Ciencias de la Ingeniería (verificado automáticamente al completar semestres 1 a 8).
  - Acreditación de Dominio de Inglés (TOEIC $\ge$ 550 pts).
  - Créditos Humanistas / HCW Convalidables.
  - Práctica Industrial (Práctica 1).
  - Práctica Profesional (Práctica 2).
- **Desglose por Áreas de Conocimiento:** Barras de avance porcentual y créditos aprobados por cada una de las 10 áreas temáticas de la carrera.

#### 4. Respaldo y Persistencia
- **Persistencia en LocalStorage:** El estado del estudiante se conserva automáticamente bajo la clave `'sansano-academic-tracker-v1'`.
- **Importar / Exportar JSON:** Modal integrado para copiar al portapapeles, descargar archivo `.json` de respaldo, o importar un archivo previamente respaldado con validación de estructura.

---

### 10.5 Verificación de Calidad y Tests

1. **Suite de Pruebas Matemáticas y DAG (`src/engine/gradeSolver.test.ts`):**
   - Test 1: Normalización de pesos porcentuales y fraccionarios.
   - Test 2: Despeje lineal de nota requerida para alcanzar 55.
   - Test 3: Detección de restricción vinculante de grupo ("muerte súbita").
   - Test 4: Sustitución de certamen recuperativo por la nota más baja y rescate de ramo.
   - Test 5: Rebalanceo dinámico de sliders conservando la igualdad $NF = 55$.
   - Test 6: Detección de aprobación matemática anticipada.
   - Test 7: Validación de aciclicidad del grafo (DAG) y resolución de dependencias en los 59 ramos de ICI-2014.
   - Test 8: Integración reactiva del store Zustand, cálculo de GPA y respaldo JSON.
   - **Resultado:** 8/8 tests aprobados exitosamente (`ALL ENGINE & GRAPH TESTS PASSED SUCCESSFULLY`).

2. **Compilación de Producción:**
   - Comando: `npm run build` (`tsc && vite build`).
   - Resultado: Compilación limpia con 0 errores de TypeScript y bundle generado exitosamente en `dist/`.
