# Codex Review — SonarQube-style rule set

## Go (backend)

### Security
- **Hardcoded secrets/credentials**: Flag any hardcoded API keys, passwords, tokens, or secrets in any file (Go source, docker-compose.yml, Dockerfile, .env files, shell scripts, config files). Must use env vars or vault. This includes default/fallback values like `${VAR:-hardcoded-default}` in docker-compose — the fallback itself is a hardcoded secret.
- **SQL injection**: Flag any raw SQL string concatenation or `fmt.Sprintf` for SQL queries. Must use parameterized queries or an ORM.
- **Path traversal**: Flag any file path constructed from user input without `filepath.Clean()` or validation.
- **Insecure TLS**: Flag `InsecureSkipVerify: true`, missing TLS config, or weak cipher suites.
- **CORS misconfiguration**: Flag wildcard origins combined with credentialed requests; must be explicit.

### Reliability
- **Nil pointer dereference**: Flag any pointer/reference dereference without a nil guard. Every `*T` access must be preceded by a nil check or provably safe constructor.
- **Unclosed resource**: Flag any opened file (`os.Open`), HTTP response body, database rows (`sql.Rows`), or network connection that is not closed via `defer close()`. Check that the `defer` runs before any early return.
- **Ignored error returns**: Flag any error return value that is explicitly discarded (`_` assignment or ignored entirely). Errors must be handled or intentionally wrapped and returned.
- **Goroutine leak**: Flag any goroutine started without a cancellation mechanism (context, done channel, or WaitGroup).
- **Panic in goroutine**: Flag goroutines lacking a `defer recover()` — an unhandled panic crashes the whole process.
- **Race condition**: Flag shared mutable state accessed from multiple goroutines without mutex/channel synchronization.
- **Context propagation**: Flag any `context.Background()` or `context.TODO()` inside request-scoped code paths; must use the parent request context.
- **Timeout missing**: Flag any HTTP client, DB query, or external call that lacks a timeout/deadline via context.

### Maintainability
- **TODO/FIXME comments (SonarQube go:S1135)**: Flag every `// TODO:`, `// FIXME:`, `// HACK:`, `// BUG:`, `// XXX:` comment. These indicate incomplete work and are tracked by SonarQube rule S1135. Each finding must list the comment text verbatim and the file:line.
- **Commented-out code**: Flag blocks of commented-out code. Remove or explain with a tracker reference.
- **Error wrapping**: Flag plain `return err` — should use `fmt.Errorf("...: %w", err)` to preserve the error chain.
- **Magic numbers/strings**: Flag unnamed literals in business logic. Extract to named constants.
- **Duplicate string literals (SonarQube go:S1192)**: Flag every non-trivial string literal that appears **3 or more times** anywhere in the project — not just in changed lines, but across the entire file. This includes HTTP headers (`"Content-Type"`), MIME types (`"application/json"`), error messages, config keys, and any repeated value. Each must be extracted to a file-level `const` block. List each duplicated literal with all file:line locations.
- **Struct field alignment**: Flag excessively padded structs; suggest reordering to minimize memory footprint.
- **Unused parameters/dependencies**: Flag unused function parameters and imported-but-unused packages (Go compiler catches imports).

### Performance
- **Repeated string concatenation in loop**: Flag `+=` on strings in a loop; recommend `strings.Builder`.
- **Unbounded slice growth**: Flag `append` in a loop without pre-allocation (`make([]T, 0, capacity)`).
- **Missing `defer` before early return**: Flag resources that leak because a `defer` is placed after a conditional return.
- **Large object passed by value**: Flag large structs passed by value instead of by pointer.

---

## TypeScript / React (frontend)

### Security
- **XSS via `dangerouslySetInnerHTML`**: Treat any use as a critical finding. Must be accompanied by sanitization (DOMPurify) and a comment explaining why safe HTML rendering is required.
- **XSS via `innerHTML` / `outerHTML`**: Flag any direct DOM manipulation with user-controlled content. Use `textContent` or sanitize.
- **`eval()` / `new Function()`**: Flag as critical — dynamic code execution is a remote-code-execution risk.
- **URL injection**: Flag `window.location` assignments built from user input without validation.
- **Open redirect**: Flag redirect URLs from query params or user input without allow-list validation.

### React-specific
- **Missing `key` prop**: Flag any `.map()` rendering a list of elements without a stable, unique `key`.
- **Unstable key (index)**: Flag `key={index}` — use a unique ID from the data.
- **Missing dependency array**: Flag `useEffect`/`useMemo`/`useCallback` with incomplete or missing dependency arrays that would cause stale closures or runaway execution.
- **Uncontrolled → controlled input switch**: Flag inputs that transition from uncontrolled to controlled (or vice versa) during lifecycle.
- **Direct DOM manipulation**: Flag `document.getElementById` or ref-based `.innerHTML` instead of React state.
- **Missing `rel="noopener noreferrer"`**: Flag any `<a target="_blank">` without the `rel` attribute — security and phishing risk.
- **State update on unmounted component**: Flag async operations that call `setState` without checking mount status (cancellation token or useEffect cleanup).
- **Unnecessary re-renders**: Flag heavy computations or inline objects/arrays/functions in JSX on every render — suggest `useMemo`/`useCallback`.
- **Prop drilling > 3 levels**: Flag deeply threaded props; suggest Context or composition.
- **`aria-*` / accessibility**: Flag interactive elements missing accessible labels, missing `alt` on content images, or clickable divs without keyboard handling.

### Maintainability
- **Ambiguous JSX spacing (SonarQube typescript:S6772)**: Flag when a closing JSX element tag (e.g., `</span>`, `</svg>`) is directly followed by bare text on the next line at the same indentation level, without an explicit `{' '}` whitespace expression between them. This creates ambiguous spacing — it's unclear whether the text is a sibling or should be wrapped. Each finding must list file:line.
  Example pattern to FLAG:
  ```
  </span>
  Explore Vite
  ```
  Example pattern to ACCEPT:
  ```
  </span>
  {' '}
  Explore Vite
  ```
  This applies to any element whose closing tag is followed by text at the same indent level without `{' '}`.
- **Missing whitespace/punctuation in JSX text**: Flag adjacent text and elements that would render without a space between them (e.g., `<code>text</code>more` without a space or punctuation).
- **`any` type**: Flag every use of `any` — must use `unknown` or a proper type/interface.
- **`ts-ignore` / `ts-expect-error`**: Flag as technical debt — must include a comment with a ticket reference.
- **Console.log left in production code**: Flag `console.log`/`console.warn` — recommend a proper logging utility or cleanup.
- **Duplicate code**: Flag 10+ line blocks repeated across files with structural similarity.
- **Duplicate string literals (SonarQube typescript:S1192)**: Flag every non-trivial string literal that appears **3 or more times** anywhere in the project — not just in changed lines, but across the entire file. This includes API paths, route strings, localStorage keys, CSS class names, and any repeated value. List each duplicated literal with all file:line locations.
- **God component**: Flag any component exceeding 200 lines or handling more than 3 distinct responsibilities.

---

## General (both backend & frontend)

- **TODO/FIXME without tracker reference**: Flag any TODO/FIXME lacking a ticket number or issue link.
- **Hardcoded environment**: Flag any IP address, hostname, or port that should come from configuration.
- **Sensitive data in logs**: Flag any log line that may contain passwords, tokens, PII (email, phone), or session identifiers.
- **Missing input validation**: Flag any external input (API request body, form data, URL params) that is used without validation/sanitization.
- **Missing error boundary / 500 handler**: Flag any missing global error boundary (React) or recovery middleware (Go) that would serve a raw stack trace to clients.
