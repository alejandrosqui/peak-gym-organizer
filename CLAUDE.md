# Peak Gym Organizer — Contexto operativo para Claude Code

Este archivo es la memoria persistente del proyecto. Lee esto antes de cualquier acción.

---

## Identidad del proyecto

- **Producto**: Peak Gym Organizer — SaaS multi-tenant para gimnasios
- **Dominio**: https://gymhub.com.ar
- **Owner técnico**: Alejandro (alejandrosqui)
- **Origen**: rescatado de Lovable/Orchestra, reconstruido y deployado de forma independiente
- **Idioma del producto**: español (Argentina)

---

## Stack técnico

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (Postgres + Auth + Edge Functions + Storage)
- **Supabase project ID**: `argrapuaijxjzldvpulw`
- **Pagos**: MercadoPago (Access Token de TEST configurado como secret)
- **Deploy**: Nginx + Let's Encrypt en Ubuntu server propio
- **Auth**: Supabase Auth (email + password)

### Estructura Supabase

- **11 tablas** + **5 RPCs** (tipos regenerados desde cero, sin `as any`)
- **6 Edge Functions** deployadas:
  - `register-gym` — alta de tenant
  - `create-student-portal` — alta de alumno
  - `create-staff-user` — alta de staff
  - `reset-student-password` — reset password
  - `create-checkout` — crea preferencia MP
  - `mercadopago-webhook` — recibe notificaciones MP
- **JWT verification**: desactivada en functions protegidas (resuelve 401s)

---

## Comandos clave

```bash
# Desarrollo local
npm install
npm run dev

# Build
npm run build

# Tests (a montar — ver specs/001-test-harness-foundation.spec.md)
npm run test

# Deploy
git push origin main
# en server:
cd /var/www/gymhub && git pull && npm install && npm run build
sudo systemctl reload nginx
```

---

## Convenciones de código

### TypeScript
- **NUNCA** usar `as any`. Si los tipos de Supabase no alcanzan, regenerar con `supabase gen types typescript`.
- **NUNCA** acceder a propiedades privadas (ej: `(supabase as any)._something`). Usar `supabase.functions.invoke()` y la API pública.
- Cualquier nuevo `as any` que aparezca debe levantar alerta en el review.

### Llamadas a edge functions
- Usar **siempre** `supabase.functions.invoke(name, { body })`.
- Manejar `{ data, error }` explícitamente; nunca tragar errores.

### Performance
- Email check con `getUserByEmail()`, no scan O(n) sobre `auth.users`.
- Cualquier query que vaya a crecer con tenants/alumnos requiere paginación.

---

## Reglas de Git

### Branches
- `main` — protegida, solo merge vía PR
- `feature/<slug>` — nueva funcionalidad
- `fix/<slug>` — bugfix
- `chore/<slug>` — refactor, deps, infra
- `docs/<slug>` — documentación
- `test/<slug>` — agregar tests

### Commits — Conventional Commits en español
```
feat: agrega flujo de checkout con MercadoPago
fix: corrige 401 en create-staff-user
chore: refactor de hook useGymContext
test: cobertura para register-gym edge function
docs: actualiza README con setup de Supabase
```

### Flujo
1. Trabajar siempre en branch feature/fix.
2. **Commits atómicos**: un cambio lógico por commit.
3. Antes de push: `npm run typecheck && npm run test`.
4. PR a main con descripción: **qué**, **por qué**, **cómo testeé**.
5. Un subagente revisor (`security-reviewer`) debe pasar antes de merge.

---

## Sincronización entre máquinas

Alejandro trabaja en **dos máquinas**: server Ubuntu y Windows local. **Git es la única fuente de verdad**.

- **NUNCA** editar archivos en server sin commit.
- Flujo correcto: editar en una máquina → commit → push → pull en la otra.
- Si hay edits sueltos en server sin commit, hacer `git stash` y avisarme antes de actuar.
- Verificar `git status` y `git log -3` al iniciar cualquier tarea.

---

## Áreas sensibles — NO TOCAR sin confirmación explícita

- **Migraciones Supabase aplicadas**: nunca modificar, solo crear nuevas.
- **Secrets de edge functions**: nunca exponer ni loguear (MercadoPago Access Token, Service Role Key, etc.).
- **RLS policies**: cambios en políticas requieren spec previa.
- **JWT verification settings**: están desactivadas por una razón documentada. Cambiarlas requiere análisis.

---

## Deuda técnica conocida (priorizada)

1. **Tests**: cobertura cercana a cero. Bloqueante para refactorizar con confianza.
2. **Paginación**: listados de alumnos/staff sin paginación.
3. **RLS hardening**: políticas existen pero falta auditoría sistemática.
4. **Sentry**: sin observabilidad de errores en producción.
5. **Monetización**: freemium (25 alumnos gratis) + Pro pendiente de implementar end-to-end.

Orden de ataque acordado: **1 → 3 → 2 → 4 → 5**.

---

## Skills aplicables a este proyecto

- `tech-debt-review` — auditoría de deuda técnica (correr semanal)
- `security-audit` — revisar antes de cada merge a main
- `readme-doctor` — mantener README al día
- `multitenant-saas` — patterns multi-tenant (RLS, scoping por tenant)

---

## Cómo arrancar cualquier tarea en este repo

1. `git status` y `git log -3` para ver estado.
2. Leer la spec relevante en `specs/` si existe.
3. Si no hay spec y la tarea no es trivial: **escribir spec primero** (ver `specs/README.md`).
4. Crear branch con prefijo correcto.
5. Implementar en commits atómicos.
6. Correr `npm run typecheck && npm run test` antes de cada commit.
7. Abrir PR con plantilla.
