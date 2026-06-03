# AGENTS.md

This file provides guidance to Claude Code and OpenCode when working with this repository.

## Project Overview

**Name:** weekly-friday-training
**Type:** Documentation / Planning / Scripts
**Owner:** hobv@inet.vn
**Description:** iNET Innovation Lab — Internal product incubator framework. Solo inventor builds MVPs/SaaS, demos to stakeholders every Friday, evaluates via scoring rubric, and selects products to generate revenue. Also houses the Token-First Design System setup (viUI token layer for cross-platform MVPs).

## Active Plans

| Plan | Description | Status |
|------|-------------|--------|
| `plans/260508-0811-inet-innovation-lab/` | Lab framework: pipeline tracking, Friday demo process, tech catalog | pending |
| `plans/260511-0817-inet-design-token-layer/` | viUI token layer: CSS vars, Tailwind preset, Shadcn, NativeWind, Next.js starter | pending |

## Key Context

- **Token source:** viUI MCP `https://viui.inet.vn/mcp` — 28 tools, 24 resources
- **Primary brand tokens:** `#024799` (navy), `#cc0e0e` (red accent), 8pt grid, WCAG 2.1 AA
- **Known bug:** viUI MCP `generate_color_vars` returns `{}` — workaround: hardcode token values
- **Platforms:** React/Next.js, React Native (NativeWind), Vue (viUI native)

## Role & Responsibilities

Analyze user requirements, delegate tasks to appropriate sub-agents, and ensure cohesive delivery that follows plans in `./plans/`. Always read the relevant plan file before implementing.

## Rules & Workflows

- Primary workflow: `./.claude/rules/primary-workflow.md`
- Development rules: `./.claude/rules/development-rules.md`
- Orchestration protocol: `./.claude/rules/orchestration-protocol.md`
- Documentation management: `./.claude/rules/documentation-management.md`
- Skill domain routing: `./.claude/rules/skill-domain-routing.md`
- Skill workflow routing: `./.claude/rules/skill-workflow-routing.md`

**IMPORTANT:** Analyze the skills catalog and activate the skills needed for each task.
**IMPORTANT:** Follow development rules in `./.claude/rules/development-rules.md` strictly.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end.
**IMPORTANT:** Date format injected by session hooks via `$CK_PLAN_DATE_FORMAT`. Use for plan/report naming.

## Development Principles

- **YAGNI:** You Aren't Gonna Need It — avoid over-engineering
- **KISS:** Keep It Simple, Stupid — prefer simple solutions
- **DRY:** Don't Repeat Yourself — eliminate duplication

## Documentation

Keep docs in `./docs/` folder (to be created):

```
./docs/
├── project-overview-pdr.md
├── how-we-work.md
├── friday-session-format.md
└── tech-stack-catalog.md
```
