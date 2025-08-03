# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **TSG ARC Codegolf** - a code golf platform for solving ARC (Abstraction and Reasoning Corpus) visual pattern puzzles using Python. Built for Tokyo University Science Club (TSG) members with Slack integration for authentication.

## Development Commands

```bash
# Start full development environment (server + Firebase emulators + function watching)
npm run dev

# Development components individually
npm run dev:server          # SolidStart dev server only
npm run dev:firebase         # Firebase emulators only
npm run functions:build:watch # Watch and compile functions

# Production build
npm run build

# Testing (runs with Firebase emulators)
npm run test
npm run test:vitest         # Vitest only (requires emulators running)

# Code quality
npm run lint               # Biome linting with auto-fix
npm run format             # Biome formatting
npm run fix                # Format + lint with unsafe fixes

# Firebase functions
npm run functions:shell    # Interactive functions shell
```

## Architecture

### Technology Stack
- **Frontend**: SolidJS with SolidStart, TypeScript, Bootstrap 5, Vinxi build system
- **Backend**: Firebase (Firestore, Auth, Functions, Hosting)
- **Functions**: Node.js 20 (auth/triggers) + Python (code execution)
- **Development**: Biome (linting/formatting), Vitest (testing), Firebase emulators

### Key Architecture Patterns

**Firebase-Centric Design:**
- All data lives in Firestore with real-time subscriptions
- Authentication via Slack OAuth with custom Firebase blocking functions
- Cloud Functions handle code execution and user verification
- Security rules enforce authenticated + acknowledged user access

**SolidJS Patterns:**
- File-based routing in `src/routes/`
- Reactive Firebase integration via `solid-firebase` library
- Generic collection/document components (`Collection.tsx`, `Doc.tsx`)
- CSS modules for component-specific styling

**Code Execution Pipeline:**
1. User submits Python code via web interface
2. Firebase trigger enqueues execution in Cloud Functions
3. Python function executes code against ARC test cases in sandbox
4. Results stored with validation and task ownership updates
5. Real-time UI updates via Firestore subscriptions

### Data Models

**Core Collections:**
- `tasks` - Task metadata with ownership tracking
- `taskData` - ARC puzzle test cases (train/test subsets)  
- `submissions` - User code submissions with execution results
- `users` - User profiles linked to Slack accounts

**Key Relationships:**
- Tasks reference shortest submission and owner
- Submissions belong to user and task with status tracking
- Task data loaded from 400+ JSON files in `google-code-golf-2025/`

## Development Workflow

### Local Development Setup
- Firebase emulators run on ports: Firestore (8080), Auth (9099), Hosting (5000)
- Emulator data persists in `emulators-data/` with auto import/export
- Functions auto-compile and reload on changes
- Use `npm run dev` for full stack development

### Code Quality Standards
- **Biome** handles all linting and formatting (replaces ESLint/Prettier)
- Single quotes, no bracket spacing, strict TypeScript rules
- Auto-organize imports, prefer const assertions, self-closing JSX elements
- Husky pre-commit hooks enforce quality

### Testing
- **Vitest** with SolidJS Testing Library
- Tests run against Firebase emulators for integration testing
- Use `npm run test` which automatically starts emulators and waits for readiness
- Test files: `*.test.tsx` alongside components

## Firebase Integration

### Authentication Flow
1. Slack OAuth via custom OIDC provider
2. Firebase Auth blocking function verifies TSG team membership
3. User acknowledgment required for terms of service
4. Firestore security rules enforce authenticated access

### Functions Architecture
- **Node.js functions** (`functions/`): User auth, submission triggers, Slack integration
- **Python functions** (`python-functions/`): Sandboxed code execution engine
- Functions auto-deploy with predeploy compilation

### Data Patterns
- Use `useFirestore()` hook with Firestore queries for reactive data
- `Collection.tsx` handles loading states, errors, empty states
- `Doc.tsx` for single document subscriptions
- Always include user authentication checks in components

## Component Architecture

### Shared Components (`src/lib/`)
- `Collection.tsx` - Generic Firestore collection renderer with loading/error states
- `Doc.tsx` - Generic Firestore document renderer
- `Grids.tsx` - ARC visual grid renderer (0-9 colored cells)
- `firebase.ts` - Firebase configuration and typed collection references
- `schema.d.ts` - TypeScript interfaces for all data models

### Route Structure
- `(home)/` - Main authenticated layout
- `tasks/[taskId]/` - Individual task pages with submission interface
- `submissions/` - Submission listing and detail pages
- `admin.tsx` - Admin interface for task management

### Grid Visualization
- ARC puzzles rendered as colored grids using CSS Grid
- Colors 0-9 mapped to distinct visual colors
- Responsive design with proper input/output pattern display
- CSS modules for scoped grid styling

## Code Golf Domain

### ARC Puzzles
- 400+ visual pattern recognition puzzles from ARC dataset
- Each task has train/test subsets with input/output grids
- Players write Python functions to transform input grids to output grids
- Shortest code (by byte count) wins and becomes task owner

### Submission System
- Real-time submission tracking with status: pending → running → accepted/rejected
- Python code execution in sandboxed Cloud Functions
- Detailed test case results with error messages
- Leaderboard based on shortest successful solutions

### Slack Integration
- User verification against TSG Slack workspace
- Profile data synchronized from Slack API
- Authentication requires active TSG membership
- User acknowledgment flow for platform terms

## Important Implementation Notes

### Firebase Security
- All collections require authenticated + acknowledged users
- Read access: tasks, taskData, submissions
- Write access: only submissions (other writes via Cloud Functions)
- Security rules in `firestore.rules`

### Performance Considerations
- Client-side rendering only (SSR disabled for auth-heavy app)
- Firebase optimizations in Vite config for smaller bundles
- Limit Firestore queries (e.g., recent submissions limited to 10)
- CSS modules prevent style conflicts across components

### Error Handling
- `Collection.tsx` provides consistent loading/error states
- Firebase auth state managed centrally
- Graceful handling of missing data and network errors
- User-friendly error messages for submission failures