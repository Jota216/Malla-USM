# USM Malla & Grade Solver

Aplicación web interactiva de código abierto diseñada para estudiantes de la **Universidad Técnica Federico Santa María (USM)**. Permite gestionar el avance de la malla curricular y calcular de forma exacta las notas necesarias para aprobar cada asignatura del semestre.

## Características Principales

* **Malla Curricular Interactiva:** Visualiza los ramos por semestre, marca tus asignaturas aprobadas y descubre automáticamente qué ramos tienes desbloqueados según sus prerrequisitos.
* **Solver de Notas (Estilo WolframAlpha):** Configura las ponderaciones de tus ramos en curso, ingresa tus notas parciales y despeja automáticamente cuánto necesitas en los certámenes, controles o laboratorios restantes para llegar al **55**.
* **Reglas de Aprobación USM:** Soporte para condiciones especiales de aprobación (promedio mínimo de certámenes, nota mínima de laboratorio y certamen global recuperativo).
* **100% Privado y Sin Servidor:** Todo tu progreso se guarda localmente en tu navegador (`localStorage`), con opción de exportar e importar tu respaldo en formato `.json`.

## Stack Tecnológico

* **Frontend:** React + TypeScript + Vite
* **Estilos y UI:** Tailwind CSS + shadcn/ui
* **Hosting:** GitHub Pages
