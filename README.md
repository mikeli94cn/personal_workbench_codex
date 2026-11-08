# Personal workbench

First module: a single-user to-do list. Plain HTML/CSS/JavaScript, Java 21 + Spring Boot, and MySQL. Spring serves the client and REST API together; no frontend build is needed.

## Run with MySQL

1. Install Java 21, Maven 3.6.3 or newer, and MySQL 8 or newer.
2. Edit the password in `database/setup.sql`, then run that script using a MySQL administrator account. It creates the database and a restricted application user. Hibernate creates/updates the tasks table at startup.
3. In PowerShell, from this directory:

```powershell
$env:DB_USER = 'workbench'
$env:DB_PASSWORD = 'your-password-from-setup'
# Optional if your MySQL host, port, or database differs:
$env:DB_URL = 'jdbc:mysql://localhost:3306/workbench'
mvn spring-boot:run
```

Open http://localhost:8080. Keep credentials out of source control.

## Try without MySQL

```powershell
./run.ps1 -Demo
# Or with your own compatible Maven installation:
mvn spring-boot:run "-Dspring-boot.run.profiles=demo"
```

`run.ps1` uses the project-local Maven in `tools/` when available, and otherwise uses `mvn` on PATH. Run `./run.ps1 -Test` for tests or `./run.ps1` for MySQL mode.

This explicit demo profile uses an H2 database persisted in `data/`. It is separate from MySQL; switching profiles does not move data.

## Features

- Small Sakura, Kero-chan, and Spinel character stickers decorate navigation, task buttons, the editor, theme control, and empty states. They are local transparent PNG assets in `src/main/resources/static/characters/`. Decorative images preserve accessible text labels, and hover effects respect reduced-motion preferences.

- The top-right language button switches directly between 简体中文 (default) and English. It shows the language you can switch to: **EN** or **中文**. Preferences persist across reloads and synchronize across tabs; Spanish preferences reset to Chinese. Task content and unsaved edits remain unchanged.

- The top-right palette icon offers four Cardcaptor Sakura inspired themes: **Sakura Blossom** (default, petals and soft pink), **Clow Grimoire** (parchment, burgundy, and gold card borders), **Pink Star Wand** (pink stars), and **Clear Card Crystal** (pearl and lavender). These replace the old palettes; older preferences reset to Sakura Blossom. Themes persist in the browser, synchronize across tabs, and work offline with local SVG ornaments.
- Bright theme with white surfaces, light blue backgrounds, blue controls, and pastel priority indicators across the task list and calendar.
- Calendar has separate **Week tasks** and **Month tasks** sections above its daily date grid. Create and edit each type using the task editor; choose any date within the target week or month. Select a week or navigate months to view its tasks. Completed period tasks remain visible and can be reopened. Existing tasks remain daily tasks. These task types are not recurring schedules. Hibernate adds the task type column on restart. All tasks includes every type.
- Monthly Calendar view: tasks appear on their due dates, with previous/next month and Today navigation. Weeks start on Monday; today's date is highlighted. Select a day number to create a task due that day, or select a task to edit/reschedule it. Checkboxes complete/reopen tasks. Completed tasks remain visible with crossed-out titles.
- Calendar supports the same search and label filters. Tasks without due dates appear under **No due date** beneath the calendar. On small screens, scroll the month horizontally. Calendar changes use the existing task API; no database migration is required.
- Create and edit tasks with notes, due dates, and low/medium/high priorities.
- Complete and reopen tasks; delete with confirmation.
- The sidebar has two task views: **All tasks** and **Calendar**. All tasks includes open, completed, overdue, and undated tasks. Calendar includes weekly and monthly overviews for planning.
- Search titles and notes; sort by newest, due date, or priority. Completed tasks appear last in mixed views.
- Progress counts, empty states, responsive layout, keyboard-accessible forms, server validation, and visible request errors.

## API

### Task labels

Use the **Manage labels** tag icon in the top-right corner (or the button in the task editor) to define labels separately from tasks. Enter a name and choose one of ten preset colors, use the native color picker, or type a six-digit hex value such as `#39a765`. The live preview shows your selection. Definitions persist in the database even when unused.

In the task editor, select up to 10 colored label chips; click a selected chip to remove it. Opening Manage labels from the editor preserves your draft and current selections. Names are trimmed, stored in lowercase, and limited to 40 characters. Duplicate names are rejected. Existing task labels are automatically imported on startup with their previous category colors.

Use **Edit color** to recolor an existing label everywhere. Label names stay fixed. Deleting a label requires confirmation and removes that label from tasks while preserving the tasks themselves. Search and label filters continue to work in All tasks. Colors stay consistent across themes and reloads, with contrasting text for custom light and dark colors.

Restart the Java application, then refresh the browser. Hibernate creates the `label_definitions` table automatically with the existing `ddl-auto=update` configuration; task data is retained. Backend tests and browser verification use isolated H2 databases, not your MySQL data.

Task API requests can still include `"labels":["self-improvement","health"]`. An empty array removes labels; omitting it preserves existing labels on updates. Unknown labels submitted by older clients automatically receive a definition with a default color.

| Method | Label route | Behavior |
| --- | --- | --- |
| GET | `/api/labels` | List label definitions, including unused labels |
| POST | `/api/labels` | Create with `{"name":"housework","color":"#e05263"}`, returns 201 |
| PUT | `/api/labels/{id}` | Change color with `{"color":"#123abc"}` |
| DELETE | `/api/labels/{id}` | Remove definition and references from tasks, returns 204 |

Invalid names/colors return 400, duplicate names return 409, and missing definitions return 404.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create, returns 201 |
| PUT | `/api/tasks/{id}` | Replace editable fields |
| DELETE | `/api/tasks/{id}` | Delete, returns 204 |

POST and PUT accept:

```json
{"title":"Plan the week","notes":"Pick three priorities","dueDate":"2026-11-02","priority":"MEDIUM","completed":false}
```

`dueDate` may be null. Titles must contain non-whitespace text and be at most 200 characters; notes are required (empty is fine), at most 4000 characters. Invalid inputs return 400; missing tasks return 404. IDs and creation timestamps are server-managed. Dates are calendar dates interpreted in the browser's local timezone.

## Development

Calendar date/grouping tests (Node.js, no dependencies): `node --test tests/calendar.test.cjs`. To exercise local daylight-saving boundaries explicitly in PowerShell, set `$env:TZ = 'America/Los_Angeles'` before running them.

```powershell
mvn test
mvn package
java -jar target/personal-workbench-0.1.0.jar
```

Java sources are in `src/main/java/com/workbench`; client files in `src/main/resources/static`; configuration in `src/main/resources`. Tests use an isolated in-memory H2 database, not your MySQL database.

This initial version binds to loopback (`127.0.0.1`) and has no login or multi-user isolation. Add authentication, authorization, database migrations, and deployment configuration before exposing it to other users. Task text is rendered with DOM text nodes rather than interpreted HTML. Google Fonts is optional; system fonts work offline. The schema update setting is for iterative local development; use versioned migrations before production.

Theme references: [official Cardcaptor Sakura site](https://ccsakura-official.com/anime/index.html), [Good Smile sealing-key and wing merchandise](https://www.goodsmile.com/en/product/11507/Cardcaptor%2BSakura%2BClow%2BCard%2BEmbroidered%2BHoodie%2BSealing%2BKey%2BBlack%2BPink%2B). Decorations are local SVG/CSS assets.
