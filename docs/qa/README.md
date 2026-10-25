# QA manual (SCRUM-23)

Plantillas para registrar el QA funcional y el checklist ASVS L1. **No marques una prueba como hecha si no se ejecutó a mano.** Cada fila lleva resultado (OK, NO o N/A), fecha, responsable y evidencia (captura o enlace).

| Archivo | Para qué sirve |
| --- | --- |
| `datos-del-ensayo.md` | Fecha, entorno, commit y responsable de la sesión |
| `checklist-asvs-l1.md` | Checklist ASVS nivel 1 por capítulo |
| `criterios-aceptacion-po.md` | Criterios de aceptación del Product Owner |
| `defectos.md` | Registro de defectos |
| `go-no-go.md` | Decisión Go/No-Go de la PO |

Entorno: despliegue en Vercel o `APP_BUILD_TARGET=runner docker compose up -d --build --wait`. Cuentas de prueba: `docs/datos-de-prueba.md`. Solo datos ficticios.
