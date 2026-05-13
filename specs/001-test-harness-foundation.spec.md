# Spec 001 — Test Harness Foundation

**Status**: 📝 Draft → ⏳ Awaiting approval → ⚙️ In progress → ✅ Done
**Author**: Alejandro
**Created**: 2026-05-12
**Target release**: v0.5.0
**Estimated effort**: 3-5 días

---

## ¿Por qué ahora?

Peak Gym tiene cobertura de tests cercana a cero. Esto bloquea cualquier refactor con confianza: cualquier cambio puede romper algo sin que nos enteremos. Antes de tocar paginación, RLS, monetización o cualquier otra deuda, necesitamos un **harness de tests funcionando** con cobertura mínima del flujo crítico.

Esta spec **no** intenta llegar a 80% de cobertura. Apunta a:
1. Tener la infra de testing lista (frameworks, scripts, CI).
2. Cubrir el camino feliz de los 3 flujos más críticos.
3. Establecer el patrón para que cada feature nueva nazca con tests.

---

## Requirements

### Funcionales

- **R1**: el repo debe tener un comando `npm run test` que corra todos los tests y exit con código != 0 si falla.
- **R2**: el repo debe tener un comando `npm run test:watch` para desarrollo.
- **R3**: el repo debe tener `npm run test:coverage` que genere reporte HTML en `coverage/`.
- **R4**: deben existir tests para los siguientes flujos críticos (camino feliz):
  - **F1**: registro de gimnasio nuevo (`register-gym` edge function)
  - **F2**: login de usuario existente
  - **F3**: creación de portal de alumno (`create-student-portal`)
- **R5**: los tests de edge functions deben correr contra una instancia local de Supabase (no contra producción).
- **R6**: existe un patrón documentado en `tests/README.md` que explica cómo agregar tests.

### No funcionales

- **NF1**: el suite completo debe correr en <60 segundos en local.
- **NF2**: no debe haber dependencias de red externa (mocks o Supabase local).
- **NF3**: los tests deben ser deterministas (no flaky).
- **NF4**: cobertura inicial reportada para los 3 flujos: ≥80% líneas.

### Restricciones

- No tocar features productivas.
- No modificar edge functions deployadas en este ciclo.
- No requerir variables de entorno de producción para correr tests.

---

## Out of scope (explícitamente NO)

- Tests E2E con browser (Playwright/Cypress) — siguiente spec.
- Coverage de los 11 flujos restantes — se hace incrementalmente con cada feature.
- Tests de MercadoPago webhook — siguiente spec (requiere mock complejo).
- Performance/load testing.
- Tests de UI components (siguiente spec).

---

## Design

### Stack de testing

- **Framework**: Vitest (alineado con Vite, rápido, API similar a Jest)
- **Testing Library**: `@testing-library/react` para componentes
- **Mocks de Supabase**: `@supabase/supabase-js` con `MockSupabaseClient` propio
- **Supabase local**: `supabase start` para tests de edge functions
- **Coverage**: `@vitest/coverage-v8`

### Estructura de archivos

```
peak-gym/
├── tests/
│   ├── README.md                    # cómo agregar tests
│   ├── helpers/
│   │   ├── mock-supabase.ts         # cliente mockeado
│   │   ├── test-data.ts             # fixtures
│   │   └── setup.ts                 # setup global
│   ├── unit/
│   │   ├── hooks/
│   │   └── lib/
│   ├── integration/
│   │   ├── auth.test.ts             # F2: login
│   │   └── student-portal.test.ts   # F3
│   └── edge-functions/
│       └── register-gym.test.ts     # F1
├── vitest.config.ts
├── coverage/                         # generado, gitignored
└── package.json                      # scripts test, test:watch, test:coverage
```

### Decisiones técnicas

- **Vitest sobre Jest**: integra nativo con Vite, no hay que mantener config dual.
- **Supabase local sobre mocks puros para edge functions**: queremos validar que la function corre end-to-end.
- **Mock client para tests de hooks/componentes**: rapidez y aislamiento.
- **Coverage v8 sobre istanbul**: mejor performance, integración nativa con Vitest.

### Dependencias a agregar

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jsdom": "^25.0.0",
    "msw": "^2.0.0"
  }
}
```

(Versiones exactas a confirmar en implementación contra `npm view <pkg> versions`.)

---

## Tasks

Cada task = un commit atómico. Subagente implementador toma una task a la vez.

### T1 — Setup de Vitest y dependencias
- Branch: `feature/test-harness-foundation`
- Instalar deps de devDependencies.
- Crear `vitest.config.ts` con jsdom env, alias, coverage config.
- Agregar scripts a `package.json`: `test`, `test:watch`, `test:coverage`.
- Crear `tests/helpers/setup.ts` con `@testing-library/jest-dom` import.
- **Done when**: `npm run test` corre y dice "no tests found" sin error.
- **Commit**: `chore: setup inicial de Vitest y testing-library`

### T2 — Helpers y fixtures
- Crear `tests/helpers/mock-supabase.ts` con factory de mock client tipado.
- Crear `tests/helpers/test-data.ts` con fixtures de gym, user, student.
- Documentar uso en `tests/README.md` (esqueleto inicial).
- **Done when**: helpers tipados sin errores TS, ejemplos en README.
- **Commit**: `test: agrega helpers de mock Supabase y fixtures`

### T3 — F2: tests de auth (login)
- `tests/integration/auth.test.ts`
- Casos: login exitoso, password incorrecto, usuario inexistente, sesión persistente.
- Mock del cliente Supabase.
- **Done when**: 4+ tests pasan, cobertura del flujo ≥80%.
- **Commit**: `test: agrega tests de flujo de login`

### T4 — F3: tests de create-student-portal
- `tests/integration/student-portal.test.ts`
- Casos: creación exitosa, email duplicado, gym no encontrado, sin permisos.
- **Done when**: 4+ tests pasan.
- **Commit**: `test: agrega tests de creacion de portal de alumno`

### T5 — F1: tests de edge function register-gym
- Setup de Supabase local (`supabase start` documentado en README).
- `tests/edge-functions/register-gym.test.ts` corriendo contra local.
- Casos: registro exitoso, email duplicado, datos inválidos.
- **Done when**: tests pasan contra Supabase local.
- **Commit**: `test: agrega tests de edge function register-gym`

### T6 — Coverage report y CI hook
- Configurar `coverage/` en `.gitignore`.
- Agregar pre-commit hook que corre `npm run test`.
- Documentar en CLAUDE.md que tests son bloqueantes.
- **Done when**: `npm run test:coverage` genera HTML, pre-commit bloquea si falla.
- **Commit**: `chore: agrega pre-commit hook con tests bloqueantes`

### T7 — README de tests
- Completar `tests/README.md` con:
  - Cómo correr.
  - Cómo agregar test nuevo.
  - Patrón para mockear Supabase.
  - Patrón para testear edge functions.
- **Done when**: alguien que nunca vio el repo puede agregar un test siguiendo el README.
- **Commit**: `docs: completa README de tests`

### T8 — Merge a main + tag
- Abrir PR con descripción completa.
- Pasar review del subagente `security-reviewer` (no debe haber leaks de secrets en fixtures).
- Merge a main.
- Tag `v0.5.0`.
- **Commit final**: merge commit + tag.

---

## Phase gates

| Phase | Gate | Quien aprueba |
|-------|------|---------------|
| Requirements | Esta spec aprobada | Alejandro |
| Design | Stack de testing confirmado | Alejandro |
| Tasks | Plan T1-T8 aprobado | Alejandro |
| Implementation | PR pasa review automático + manual | security-reviewer + Alejandro |

---

## Verificación de éxito

Al cerrar esta spec, debe cumplirse:

- [ ] `npm run test` corre los 12+ tests en <60s
- [ ] `npm run test:coverage` reporta ≥80% en los 3 flujos cubiertos
- [ ] Pre-commit hook bloquea commits con tests rotos
- [ ] `tests/README.md` permite a alguien externo agregar un test sin ayuda
- [ ] Branch `feature/test-harness-foundation` mergeada a main vía PR
- [ ] Tag `v0.5.0` creado
- [ ] CHANGELOG.md actualizado

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Edge functions difíciles de testear localmente | Media | Alto | Si Supabase local da problemas, mockear con MSW |
| Tests flaky por timing async | Media | Medio | Usar `waitFor` explícito, no `setTimeout` |
| Tipos de Supabase rotos en mocks | Baja | Medio | Regenerar tipos como primer paso de T2 |
| Coverage no llega a 80% | Baja | Bajo | Aceptar 70% como mínimo y documentar gap |

---

## Notas

- Esta spec es el **gate** para todo refactor posterior. Hasta que esté ✅, no se ataca paginación ni RLS hardening.
- El patrón establecido aquí se replica en TecnoSolution, CoopKaiser, PatagoniaSoftware en specs posteriores.
- Después de cerrar esto, la siguiente spec es **002-rls-audit-and-hardening**.
