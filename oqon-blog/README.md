# OQON blog (blog.oqonlabs.com)

Static, dependency-free blog. Each Markdown file in `content/es` or `content/en` becomes a plain HTML page.

- Build: `node build.mjs` → `dist/`
- Cloudflare Pages: root directory `oqon-blog`, build command `node build.mjs`, output directory `dist`
- Front matter: title, description, slug, lang, pair (slug of the other-language version), date, updated, image, imageAlt
- `[[CTA]]` on its own line inserts the OQON VISION product block
- A `## Preguntas frecuentes` / `## Frequently asked questions` section becomes FAQPage schema
