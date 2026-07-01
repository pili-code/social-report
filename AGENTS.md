<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## GTM dashboard data updates

When the user asks to update or refresh the GTM dashboard, always use `.claude/skills/update-gtm-data/SKILL.md`. Follow that skill's stepwise flow, one channel at a time. Do not change dashboard UI, layout, sections, columns, or copy as part of a data update unless the user explicitly asks for a UI change.
