# SENTINEL — Understand-the-Project Guide

This folder exists so **you** can understand the whole system deeply enough to explain it, defend it, and answer any stakeholder question — all in plain English, with diagrams.

We go **wave by wave**. Read one, ask me anything, then move to the next.

## Reading order

| # | Document | What it answers | Status |
|---|---|---|---|
| 01 | [Overview](01_OVERVIEW.md) | What is SENTINEL? What problem does it solve? Who uses it? | ✅ ready |
| 02 | [Tech Stack — the *why*](02_TECH_STACK_WHY.md) | What each technology is, in plain words, and **why we picked it** | ✅ ready |
| 03 | [Architecture](03_ARCHITECTURE.md) | How the pieces fit together (frontend, backend, database) | ✅ ready |
| 04 | [Data Model](04_DATA_MODEL.md) | What we store and how it connects (the database) | ✅ ready |
| 05 | [Workflows](05_WORKFLOWS.md) | Step-by-step of report → escalate → acknowledge → close | ✅ ready |
| 06 | [Design Decisions & Rationale](06_DESIGN_DECISIONS.md) | Why it's built this way; the rules it must never break | ✅ ready |
| 07 | [Epics & Stories](07_EPICS_AND_STORIES.md) | The features, explained simply | ✅ ready |
| 08 | [Stakeholder Q&A](08_STAKEHOLDER_QA.md) | Likely questions + ready answers | ✅ ready |

**✅ The guide is complete — all 8 documents ready.** Start at 01 and read in order, or jump to 08 for the meeting cheat-sheet.

## How to use this
- Each doc is written for a **non-deep-technical reader**. Where a technical word is unavoidable, it's explained the first time with a everyday analogy.
- **Diagrams** use Mermaid — they render automatically on GitHub (open the file on github.com) and in most Markdown viewers.
- 🎤 **"If a stakeholder asks…"** boxes give you a ready-to-say answer.

## The one-paragraph version (for when you're put on the spot)
> SENTINEL is a crisis call-tree tool. When an IT or cyber incident happens, someone reports it in a few clicks. The system automatically emails the right people in the right order, and if the first person doesn't respond in time, it escalates to the next — and keeps a live, honest picture of who has acknowledged. It measures how fast the team responds, logs everything for audit, and is built as a standard web application (React + NestJS + PostgreSQL) that can move onto Sodexo's own servers when the pilot succeeds.
