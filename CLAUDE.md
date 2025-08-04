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
- **IMPORTANT**: Use `createMemo()` for derived reactive computations, not functions
- **IMPORTANT**: For Firestore queries with ordering, use `query(collection, orderBy(...))` pattern

**Code Execution Pipeline:**
1. User submits Python code via web interface (creates submission with status: 'pending')
2. `onSubmissionCreated` trigger enqueues execution in Python Cloud Functions
3. `executeSubmission` Python function:
   - Atomically updates status from 'pending' to 'running' using transaction
   - Executes code against ARC test cases in sandbox
   - Updates status to 'accepted' or 'rejected' with detailed results
4. `onSubmissionStatusChanged` trigger handles completion:
   - Updates task leaderboard for accepted submissions (if code is shorter)
   - Logs rejected submissions for monitoring
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
- **Functions Testing**: Use `npm --prefix functions exec tsc --noEmit` to check TypeScript errors

## Firebase Integration

### Authentication Flow
1. Slack OAuth via custom OIDC provider
2. Firebase Auth blocking function verifies TSG team membership
3. User acknowledgment required for terms of service
4. Firestore security rules enforce authenticated access

### Functions Architecture
- **Node.js functions** (`functions/`): User auth, submission triggers, Slack integration, leaderboard updates
- **Python functions** (`python-functions/`): Sandboxed code execution engine
- Functions auto-deploy with predeploy compilation

### Firebase Storage Integration
- **Setup**: Storage configured with emulator on port 9199
- **Avatar Storage**: User avatars stored in `avatars/{userId}` path
- **Security**: Users can only upload/read their own avatars
- **Constraints**: 5MB file size limit, image files only
- **Implementation**: Use Firebase Storage SDK with `uploadBytes()` and `getDownloadURL()`

**Key Firebase Functions:**
1. `onSubmissionCreated` - Triggers when new submission is created, enqueues Python execution
2. `onSubmissionStatusChanged` - Triggers when submission status changes from running to accepted/rejected
   - Updates task leaderboard when better solutions are accepted
   - Uses transactions to prevent race conditions on task ownership
   - Handles both accepted (leaderboard update) and rejected (logging) submissions
3. `executeSubmission` (Python) - Executes user code against test cases with atomic status updates

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
- `contributions/` - User ranking by contributions (descending order)
- `preferences/` - User profile management (avatar upload, display name editing)
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
- Read access: tasks, taskData, submissions, users
- Write access: submissions (users can create), users (users can update own profile)
- User profile updates restricted to `displayName` and `photoURL` fields only
- Firebase Storage rules allow avatar uploads to `avatars/{userId}` with 5MB limit
- Security rules in `firestore.rules` and `storage.rules`

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

### Firebase Security Rules Best Practices

**Firestore Rules:**
- **CRITICAL**: `request.resource.data` contains the ENTIRE document after update, not just changed fields
- **Use `diff().affectedKeys()`** to check only fields being modified: `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['field1', 'field2'])`
- **Field validation** applies to final document state: `request.resource.data.fieldName is string`
- **User profile updates**: Allow users to modify only their own documents with `request.auth.uid == userId`
- **Partial updates**: Users can update subsets of allowed fields (e.g., only displayName without photoURL)

**Storage Rules:**
- **CRITICAL**: `resource` refers to the existing file in storage, `request.resource` refers to the file being uploaded
- **File size validation**: Use `request.resource.size < 5 * 1024 * 1024` for 5MB limit
- **Content type validation**: Use `request.resource.contentType.matches('image/.*')` for image files
- **Path-based permissions**: Match user ID in path with `request.auth.uid`