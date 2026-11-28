# Development Guidelines

For Penpot design work, use [docs/penpot-workflow.md](docs/penpot-workflow.md) and
`node scripts/penpot.mjs`. Keep the MCP key in device-local configuration, never
in this repository. Penpot is an editable design copy; review changes before
applying them to the website's HTML/CSS.

Read [WEBSITE_GUIDELINES.md](WEBSITE_GUIDELINES.md) before editing any page. It defines the shared header, appearance controls, accessibility, and third-person copy rules. Ordinary page copy must avoid first/second person; blog posts may use an author’s personal voice.

- Do not modify the main site or its normal production routes unless Nathan explicitly asks.
- Build and test requested experiments under the `/dev/` path by default.
- Do not create Git branches unless Nathan explicitly asks.
- Host a local preview by default for website work so Nathan can review and iterate quickly. Reuse an existing preview when suitable; otherwise bind to 127.0.0.1 on a free port and provide the exact URL. Serve only `public/`, never the repository root. Keep the preview running for iteration.
- After changing a website page or asset, verify it locally, commit all pending website changes on `main`, and push `origin main` in the same task. Nathan has authorized this as the default website workflow. Do not leave a completed website edit only in the working tree unless Nathan explicitly asks for a local-only draft or a concrete blocker prevents the push.
- After pushing, verify the remote commit, Vercel status, the GitHub Pages fallback workflow for that same commit, and the intended deployed route. A successful Vercel status does not establish that GitHub Actions passed. Follow the deployment troubleshooting steps in README.md. A `/dev/` page stays under `/dev/` and requires the existing admin login on Vercel; pushing it does not replace `/`.
- When this repository is a submodule of aAugment, commit and push the updated submodule pointer to the parent repository's `main`. Include only the pointer and directly related website instructions; preserve unrelated parent changes.
- When publishing the local website, include pending homepage, modeling assets, data, tests, and guidelines so deployment matches the preview.
- Never force-push, change remotes, or publish changes outside this website repository except its parent submodule pointer.
- Preserve unrelated work already in the repository.
- Keep webpage paragraphs and continuous prose blocks to 20 words maximum. Use short bullets or aligned columns for longer explanations. Follow the main page's `/ Section name` and `(01)` numbering treatment where appropriate.
- Put secondary page options, such as animation controls, inside the hamburger menu rather than floating over content.
