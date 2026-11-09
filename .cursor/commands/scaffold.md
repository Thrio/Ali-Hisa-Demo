# /scaffold — running empty shell

Gate: `node tools/check-project.mjs --stage scaffold` (kickoff, refs and design must be approved). Read: `stack.mdc`, skill `scaffold-site`.

Follow `scaffold-site`: app generated in a temp folder and copied in, exact versions, security floor, `public/_headers`, scripts `dev build lint typecheck verify`, tokens copied to `src/app/globals.css`, `node tools/check-project.mjs --sync-motion-tokens`. Done when `npm ci` passes on a clean copy and `node tools/preship-scrub.mjs` shows no BLOCKER. Commit. Never push.

Last line: `Next: /build — first band: home band 1.`
