# Development Guidelines

- Do not modify the main site or its normal production routes unless Nathan explicitly asks.
- Build and test requested experiments under the `/dev/` path by default.
- Do not create Git branches unless Nathan explicitly asks.
- Host a local preview by default for website work so Nathan can review and iterate quickly. Reuse an existing preview when suitable; otherwise bind to 127.0.0.1 on a free port and provide the exact URL. Serve only `public/`, never the repository root. Keep the preview running for iteration.
- Review changes locally first. Commit, push, or publish only when Nathan requests it.
- Never force-push, change remotes, or publish unrelated changes.
- Preserve unrelated work already in the repository.
- Keep webpage paragraphs and continuous prose blocks to 20 words maximum. Use short bullets or aligned columns for longer explanations. Follow the main page's `/ Section name` and `(01)` numbering treatment where appropriate.
