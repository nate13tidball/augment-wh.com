# Development Guidelines

- Do not modify the main site or its normal production routes unless Nathan explicitly asks.
- Build and test requested experiments under the `/dev/` path by default.
- Do not create Git branches unless Nathan explicitly asks.
- Host a local preview by default for website work so Nathan can review and iterate quickly. Reuse an existing preview when suitable; otherwise bind to 127.0.0.1 on a free port and provide the exact URL. Serve only `public/`, never the repository root. Keep the preview running for iteration.
- After changing a website page or asset, verify it locally, commit the relevant website changes on `main`, and push `origin main` in the same task. Nathan has authorized this as the default website workflow. Do not leave a completed website edit only in the working tree unless Nathan explicitly asks for a local-only draft or a concrete blocker prevents the push.
- After pushing, verify the remote commit and the intended deployed route. A `/dev/` page stays under `/dev/` and requires the existing admin login on Vercel; pushing it does not replace `/`.
- When this repository is a submodule of Augment-wh, commit and push the updated submodule pointer to the parent repository's `main`. Include only the pointer and directly related website instructions; preserve unrelated parent changes.
- Never force-push, change remotes, or publish unrelated changes.
- Preserve unrelated work already in the repository.
- Keep webpage paragraphs and continuous prose blocks to 20 words maximum. Use short bullets or aligned columns for longer explanations. Follow the main page's `/ Section name` and `(01)` numbering treatment where appropriate.
- Put secondary page options, such as animation controls, inside the hamburger menu rather than floating over content.
