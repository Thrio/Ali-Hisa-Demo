# /overnight — autonomous run

Only after the Blueprint and design are approved. Follow `docs/AUTONOMOUS-RUN.md` in the kit (the coordinator pastes its prompt). Rules that never bend:

- One command per call; never `;`, `&&`, `||`, `|`, `$( )` or backticks. `cat`, `head`, `tail`, `grep`, `ls` only with paths inside this project.
- No installs, no `npm audit fix`, no deploy, no push, no remote, no logins. Never edit `package.json` scripts, `tools/`, `.cursor/` or `web-brain.lock`.
- Missing content → `[[PENDING]]`, `PendingText`, `ImageSlot`. Per band ≤ 3 rounds and 45 minutes, then `needs review`.
- `PROGRESS.md` run log after every step. Only a security stop ends early.

Last line: `Next: morning review — node tools/check-project.mjs, then every band ok/fix.`
