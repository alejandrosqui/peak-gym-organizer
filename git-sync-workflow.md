# Workflow Git: Server Ubuntu + Windows local con Claude Code

Este documento define el flujo de trabajo cuando Claude Code corre en **dos máquinas** sincronizadas por git. Aplica a todos los proyectos (Peak Gym, TecnoSolution, CoopKaiser, PatagoniaSoftware).

---

## Principio rector

> **Git es la única fuente de verdad. Ningún archivo se modifica fuera de un commit.**

Esto elimina la pregunta "¿qué versión es la buena?" y permite que Claude Code en cualquiera de las dos máquinas opere con confianza.

---

## Setup inicial (una vez por máquina)

### Windows (desarrollo principal)

```powershell
# Instalar Node 20+
# Instalar Claude Code
npm install -g @anthropic-ai/claude-code

# Configurar git
git config --global user.name "Alejandro"
git config --global user.email "<tu-email>"
git config --global pull.rebase true
git config --global init.defaultBranch main

# Clonar repos en C:\Users\Alex\auditoria\
cd C:\Users\Alex\auditoria
git clone https://github.com/alejandrosqui/gymhub.git peak-gym
git clone https://github.com/alejandrosqui/tecnosolution.git tecnosolution
# ... etc
```

### Server Ubuntu (deploy + edits ocasionales)

```bash
# Instalar Claude Code
npm install -g @anthropic-ai/claude-code

# Configurar git
git config --global user.name "Alejandro"
git config --global user.email "<tu-email>"
git config --global pull.rebase true

# Los repos ya están en /var/www/<proyecto>
cd /var/www/gymhub
git remote -v   # verificar que apunten al GitHub correcto
```

### En ambas máquinas: alias útiles

```bash
# ~/.bashrc o ~/.zshrc (en Windows: PowerShell profile)
alias gs='git status'
alias gl='git log --oneline -10'
alias gp='git pull --rebase'
alias gpu='git push'
alias gco='git checkout'
alias gcb='git checkout -b'
```

---

## Flujo diario: arrancar trabajo

**Siempre que abrís Claude Code en cualquier máquina, los primeros comandos son:**

```bash
git status        # ver si hay edits sueltos
git fetch origin
git log --oneline origin/main..HEAD   # commits locales no pusheados
git log --oneline HEAD..origin/main   # commits remotos no pulleados
```

### Decisión según estado

| Estado | Acción |
|--------|--------|
| `working tree clean` y `up to date` | OK, podés arrancar |
| Edits sueltos en working tree | `git stash` o commitear antes de tocar nada |
| Commits locales no pusheados | Decidir si pushear o si son experimentales |
| Commits remotos pendientes | `git pull --rebase` |
| Branch divergida | `git pull --rebase` y resolver |

### Regla para Claude Code

Agregá al `CLAUDE.md` de cada repo:

```markdown
## Regla obligatoria al iniciar sesión

Antes de cualquier modificación de archivos, ejecutar:
1. `git status`
2. `git fetch origin && git log --oneline HEAD..origin/main`

Si hay edits sueltos sin commit o commits remotos pendientes, DETENERSE y preguntar al usuario antes de continuar.
```

---

## Flujo: implementar un cambio (cualquier máquina)

```bash
# 1. Sincronizar
git checkout main
git pull --rebase

# 2. Crear branch
git checkout -b feature/<slug-en-kebab-case>

# 3. Trabajar — commits atómicos
# (Claude Code edita archivos)
git add <archivo-específico>   # NO usar `git add .` ciego
git commit -m "feat: descripcion clara"

# 4. Validar antes de push
npm run typecheck && npm run test

# 5. Push
git push -u origin feature/<slug>

# 6. PR en GitHub
gh pr create --fill   # con GitHub CLI, o web
```

---

## Caso especial: edit urgente en server (hotfix)

A veces hay que tocar algo en el server directamente (nginx config, restart de service, etc.). Para edits de **código**, esta es la regla estricta:

```bash
# En el server, NUNCA editar sin branch
cd /var/www/gymhub
git checkout -b fix/<slug-urgente>

# Editar con nano/vim
nano src/foo.ts

# Commitear ACÁ MISMO
git add src/foo.ts
git commit -m "fix: hotfix urgente porque X"

# Push
git push -u origin fix/<slug-urgente>

# En Windows, pullear esa branch para seguir trabajando ahí
git fetch origin
git checkout fix/<slug-urgente>
```

Si ya hubo edits sin commit en server (situación de emergencia que pasó):

```bash
git stash push -m "edits-urgentes-server-YYYY-MM-DD"
git checkout -b fix/<slug>
git stash pop
git add -p   # revisar hunk por hunk
git commit -m "fix: ..."
git push -u origin fix/<slug>
```

---

## Reglas de oro

### 1. NUNCA editar `main` directamente
`main` es **protegida**. Solo merges vía PR.

### 2. NUNCA hacer `git push --force` a `main`
Si te equivocaste en `main`, revertir con un commit nuevo (`git revert`).

### 3. NUNCA dejar edits sin commit cruzando máquinas
Si vas a cerrar la sesión en server y seguir en Windows: commit + push primero. Sí o sí.

### 4. Commits pequeños y atómicos
Un commit = un cambio lógico. Si el mensaje empieza con "y" ("agrega X **y** Y"), son dos commits.

### 5. Conventional Commits en español
```
feat:     nueva funcionalidad
fix:      bugfix
chore:    refactor, deps, infra
docs:     documentación
test:     agregar/modificar tests
style:    formato (no afecta lógica)
perf:     mejora de performance
refactor: refactor sin cambio de comportamiento
revert:   revertir commit anterior
```

### 6. Pre-commit hooks bloqueantes
Cada repo debe tener:
- typecheck (si TypeScript)
- tests
- lint
- secrets scan (`gitleaks` o similar)

Si el hook falla, el commit no se hace. Punto.

---

## Resolución de conflictos: cuando las dos máquinas tocaron lo mismo

```bash
# Estás en Windows con cambios locales
git pull --rebase origin main

# Aparece conflicto
# CONFLICT (content): Merge conflict in src/foo.ts

# 1. Ver qué tenés vs qué viene del server
git status
git diff

# 2. Resolver (con Claude Code o manual)
# Editar el archivo, dejar la versión final

# 3. Marcar resuelto
git add src/foo.ts
git rebase --continue

# 4. Push
git push
```

Si el rebase se complica, podés abortar con `git rebase --abort` y empezar de nuevo.

---

## Setup de Claude Code para multi-máquina

### CLAUDE.md compartido vía git

El `CLAUDE.md` está en cada repo, versionado. Mejora en cualquier máquina → commit → push → la otra máquina lo levanta al pullear. **No mantener `CLAUDE.md` diferentes en cada máquina.**

### Skills personales (no por repo)

Skills van en `~/.claude/skills/` que es por máquina. Para mantenerlos sincronizados:

**Opción A** (recomendada): repo aparte para skills

```bash
# Una vez
mkdir ~/.claude-skills-repo
cd ~/.claude-skills-repo
git init
git remote add origin https://github.com/alejandrosqui/claude-skills.git

# Linkear desde ~/.claude/skills/
mv ~/.claude/skills/* ~/.claude-skills-repo/
ln -s ~/.claude-skills-repo ~/.claude/skills

# En la otra máquina, clonar y linkear igual
```

**Opción B** (más simple, peor): copiar skills a mano entre máquinas.

### Configuración de Claude Code (settings.json)

Está en `~/.claude/settings.json`. Tenelo en el mismo repo de skills:

```bash
mv ~/.claude/settings.json ~/.claude-skills-repo/settings.json
ln -s ~/.claude-skills-repo/settings.json ~/.claude/settings.json
```

---

## Checklist de "¿estoy listo para trabajar en este repo desde esta máquina?"

- [ ] Claude Code instalado
- [ ] Git configurado con nombre/email
- [ ] Repo clonado
- [ ] `CLAUDE.md` existe en raíz
- [ ] `npm install` corrido
- [ ] `npm run test` funciona (aunque sea "no tests yet")
- [ ] Pre-commit hooks instalados
- [ ] `~/.claude/skills/` sincronizado
- [ ] GitHub CLI instalado (opcional, recomendado)

---

## Anti-patterns a evitar

❌ Editar archivos en server con nano sin commit y volver a Windows
❌ `git add .` ciego (siempre revisar qué se agrega)
❌ Commits con mensaje "wip", "asdf", "cambios"
❌ Mergear PR sin tests pasando
❌ Force push a `main`
❌ Mantener `CLAUDE.md` distintos en cada máquina
❌ Commitear `.env`, `node_modules/`, `dist/`, `coverage/`
❌ Trabajar varios días en una branch sin push (riesgo de pérdida)

✅ Commits frecuentes, atómicos, descriptivos
✅ Push diario aunque sea de branch feature
✅ PR chico (>500 líneas de diff = revisar si es 2 PRs)
✅ Pre-commit hooks bloqueantes
✅ Tests bloqueantes
