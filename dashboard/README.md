# iNET Innovation Lab — MVP Dashboard

Static Astro dashboard for the solo inventor workflow at iNET. Reads
`pipeline/*.md` + `products/*/mvp.yaml` + `evaluation/sessions/*.md`
and renders 4 views: Pipeline Kanban, MVP Detail, Friday Sessions, Tech Catalog.
No backend, no CRUD UI — edit files in VS Code, rebuild, share via tunnel.

---

## Quick Start

```powershell
cd dashboard
npm install
npm run dev        # http://localhost:4321
```

Hot-reload activates on changes to `products/*/mvp.yaml` and `evaluation/sessions/*.md`.

---

## Add a New MVP (3-step workflow)

**1. Create the product folder and manifest:**
```powershell
mkdir products\my-new-mvp
# Write products\my-new-mvp\mvp.yaml (see schema below)
```

**2. Write `mvp.yaml`** — minimum required fields:
```yaml
id: MVP-009
name: My New MVP
slug: my-new-mvp        # must match folder name
status: backlog         # backlog | building | selected | parked | retired
created: 2026-06-01
owner: you@inet.vn
problem: |
  One paragraph describing the problem.
tech_stack:
  - typescript
  - postgres
scoring: []
```

**3. Add a row to the matching pipeline file:**
```markdown
# In pipeline/00-backlog.md  (or 01-building.md, 02-selected.md, etc.)
| my-new-mvp | My New MVP | - | Short description |
```

Then `npm run build` — the MVP card appears in the kanban lane matching its status.
Invalid `mvp.yaml` emits a `⚠ invalid manifest` warning card without failing the build.

---

## Build

```powershell
cd dashboard
npm run build      # outputs to dashboard\dist\
```

Build time target: < 5s for up to ~50 MVPs. Output is fully static HTML.

---

## Deploy via Tunnel

Share the built dashboard with stakeholders over Cloudflare tunnel:

```powershell
# From project root — build first, then serve dashboard\dist\
cd dashboard && npm run build && cd ..
.\start-friday-demo-server-and-cloudflared-tunnel.ps1 -Source dashboard
```

Default (`-Source plans`) still serves the demo gallery at `plans/` — backward compatible.
Stakeholders open the tunnel URL in any browser; Cloudflare Access prompts for login.

---

## Cloudflare Access Setup (Zero Trust + Email Allowlist)

Locks the tunnel to `@inet.vn` emails only — stakeholders login via magic link, no password.

### One-time named tunnel setup (admin only)

```powershell
cloudflared tunnel login
cloudflared tunnel create inet-lab-dashboard
cloudflared tunnel route dns inet-lab-dashboard lab.inet.vn
```

Update `~/.cloudflared/config-friday.yml` to reference the named tunnel instead of
`--url http://localhost:9030`.

### Cloudflare Zero Trust — Access policy (6 steps)

1. Open **Cloudflare Zero Trust dashboard** → Access → Applications → Add an application → Self-hosted.
2. Set **Application name:** `iNET Innovation Lab Dashboard`. **Domain:** `lab.inet.vn` (or your named tunnel hostname).
3. **Identity provider:** Email OTP (built-in, no IdP needed). Optional: Google Workspace if iNET uses it.
4. **Access policy:** Action = `Allow`. Include rule = `Emails ending in` → `@inet.vn`.
5. **Session duration:** `24 hours` — stakeholder stays logged in for the full Friday review day.
6. **Test:** Open tunnel URL in incognito → CF Access login prompt → enter `you@inet.vn` → check inbox for magic link → click → dashboard opens.

Non-`@inet.vn` emails are blocked at Cloudflare edge before reaching the server.
CF Access free tier supports up to 50 users — sufficient for iNET internal team.

### Stakeholder onboarding (3 steps)

1. Receive Friday demo invite email with tunnel URL.
2. Open URL → enter your `@inet.vn` email → click magic link in inbox.
3. Dashboard opens. Session valid for 24 hours — no re-login needed during the day.

---

## Troubleshoot

**`⚠ invalid manifest` card appears in kanban**
Run `npm run build` and look for `[warn] ⚠ Invalid mvp.yaml [slug]` in output.
Fix the field listed in the error (usually a missing required field or bad date format).

**MVP detail page not generated (`/mvp/slug/` returns 404)**
Check that `slug` in `mvp.yaml` exactly matches the folder name under `products/`.

**Tech catalog empty**
Ensure `tech_stack` array is populated in `mvp.yaml`. At least one MVP must have entries.

**Session not appearing at `/sessions/YYYY-MM-DD/`**
Verify frontmatter `date:` format is `YYYY-MM-DD` and `mode:` is `demo-day` or `progress-review`.
Also confirm the file is under `evaluation/sessions/`.

**Cloudflare Access — "Access Denied" for `@inet.vn` email**
Confirm the Access policy rule is `Emails ending in` (not `Email is`). Check the policy
is attached to the correct application domain. Clear browser cookies and retry in incognito.

**Port 9030 already in use**
The tunnel script auto-kills the old process. If it fails, run:
`Stop-Process -Id (netstat -ano | Select-String ':9030 ' | Select-String LISTENING | ForEach-Object { ($_ -split '\s+')[-1] }) -Force`
