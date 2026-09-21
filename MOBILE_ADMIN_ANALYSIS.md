# Mobile B12 admin wizard — design analysis

## What the current products tell us

The mobile app already exposes a coherent B12 admin information architecture:

- **Hub/status:** license state, usage/quota, and whether the academic year is active.
- **People:** institution roster, teachers, parents, and pending enrollments.
- **Classes:** school classes and subjects.
- **Day-to-day:** assignments, attendance, weekly plans, class chat, direct chat, calendar events, and school workdays.
- **More:** financial reminders and secondary administration tools.

The academic setup implementation in the mobile app is a guided flow. Its actual data dependencies are:

1. Academic year and terms are platform-owned context.
2. Create/select subjects.
3. Create classes with grade, section, capacity, and homeroom teacher.
4. Attach a subject and teacher to a class.
5. Assign unassigned students to the class.

The web B12 admin dashboard adds useful operational signals: pending enrollments, active students, active teachers, parents, and LMS status, followed by quick links. The school-wizard demo adds a longer first-run setup path for school identity, paths, stages, subjects, teachers, classes, parents, students, enrollment, teaching assignments, and behavior.

## Design decision for mobile

The mobile version should not copy the web's dense 10-step list. It should use a **hub plus one focused task at a time**:

- A compact status header makes the current school/year obvious.
- Four primary setup cards show completion and blockers.
- Each card opens a single-screen form with a sticky primary action.
- The stepper is horizontal on larger phones and collapses to `Step 2 of 4` on narrow screens.
- Repeated records (subjects, classes, teachers, students) use bottom-sheet-like cards and inline search.
- The bottom navigation keeps Dashboard, Setup, People, and More reachable without losing wizard context.
- A persistent “what remains” summary prevents admins from getting lost after creating one record.

## Visual direction

The prototype follows the existing SAM system: Cairo typography, `#00BCD4` primary cyan, deep teal `#004D56`, white elevated surfaces, cool blue-gray background, 12–18px corners, and restrained cyan focus states. It is intentionally mobile-first and uses 44px minimum touch targets.

## Prototype questions this staging page answers

- Does a task-first mobile wizard feel clearer than a web-like checklist?
- Is the right home grouping **Dashboard / Setup / People / More**?
- Does a compact “2 of 4” stepper work better than showing every dependency?
- Are capacity and assignment blockers visible early enough?

The page is a throwaway prototype. It stores no data and does not call APIs. The “complete” actions only update in-memory state so the flow can be tested safely.
