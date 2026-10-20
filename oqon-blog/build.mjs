// OQON blog — static site generator (no dependencies).
// Reads content/es/*.md and content/en/*.md, writes plain HTML to dist/.
// Cloudflare Pages: root directory "oqon-blog", build command "node build.mjs", output "dist".
import fs from "node:fs";
import path from "node:path";

const SITE = "https://blog.oqonlabs.com";
const MAIN = "https://www.oqonlabs.com";
const PRODUCT = `${MAIN}/producto/oqon-vision`;
const GA4 = "G-52SKY3DBXX";
const META_PIXEL = "796347656634198";
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, "dist");

const T = {
  es: {
    blog: "Blog", home: "Inicio", shop: "Tienda", other: "English", updated: "Actualizado",
    by: "Por", cta: "Ver OQON VISION", list: "Precio de lista", launch: "Precio de lanzamiento",
    indexTitle: "Blog de OQON: respuestas claras sobre gafas inteligentes",
    indexDesc: "Preguntas reales sobre gafas con cámara, audio e Inteligencia Artificial, respondidas sin rodeos.",
    priceLine: "<s>$500.000</s> <strong>$350.000 COP</strong> de lanzamiento",
    payLine: "Pago con tarjeta, Bre-B o PSE · Devolución del 100% en 30 días · Garantía en Colombia",
    related: "También te puede servir", foot: "OQON · Gafas inteligentes con Inteligencia Artificial",
  },
  en: {
    blog: "Blog", home: "Home", shop: "Shop", other: "Español", updated: "Updated",
    by: "By", cta: "See OQON VISION", list: "List price", launch: "Launch price",
    indexTitle: "OQON Blog: straight answers about smart glasses",
    indexDesc: "Real questions about camera glasses, open-ear audio and AI glasses, answered plainly.",
    priceLine: "<s>$500,000</s> <strong>$350,000 COP</strong> launch price · sold in Colombia",
    payLine: "Card, Bre-B or PSE · 30-day 100% refund · Warranty handled in Colombia",
    related: "You may also find useful", foot: "OQON · Smart glasses with AI",
  },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function parse(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`Missing front matter: ${file}`);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
  }
  for (const k of ["title", "description", "slug", "lang", "date", "updated", "pair", "image", "imageAlt"]) {
    if (!meta[k]) throw new Error(`${file}: missing "${k}"`);
  }
  return { meta, body: m[2] };
}

function inline(s, slug) {
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img src="${u}" alt="${a}" loading="lazy">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    let href = u;
    if (href.startsWith(PRODUCT)) href += (href.includes("?") ? "&" : "?") + `utm_source=blog&utm_medium=organic&utm_campaign=${slug}`;
    const ext = /^https?:/.test(href) && !href.includes("oqonlabs.com");
    return `<a href="${href}"${ext ? ' rel="noopener" target="_blank"' : ""}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return s;
}

function md(body, meta) {
  const lines = body.split("\n");
  const html = [];
  const faq = [];
  let i = 0, inFaq = false, curQ = null;
  const ctaBlock = () => {
    const t = T[meta.lang];
    const href = `${PRODUCT}?utm_source=blog&utm_medium=organic&utm_campaign=${meta.slug}`;
    return `<aside class="cta"><img src="${meta.image}" alt="${esc(meta.imageAlt)}" loading="lazy"><div><p class="cta-name">OQON VISION</p><p class="cta-price">${t.priceLine}</p><a class="btn" href="${href}">${t.cta}</a><p class="cta-small">${t.payLine}</p></div></aside>`;
  };
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.trim() === "[[CTA]]") { html.push(ctaBlock()); i++; continue; }
    let h = l.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length, text = h[2];
      if (lvl === 2) inFaq = /preguntas frecuentes|frequently asked|faq/i.test(text);
      if (lvl === 3 && inFaq) { curQ = { q: text, a: [] }; faq.push(curQ); }
      else curQ = null;
      html.push(`<h${lvl}>${inline(text, meta.slug)}</h${lvl}>`); i++; continue;
    }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(rows[0]);
      const bodyRows = rows.slice(2).map(cells);
      html.push(`<div class="table"><table><thead><tr>${head.map((c) => `<th>${inline(c, meta.slug)}</th>`).join("")}</tr></thead><tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, meta.slug)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^(-|\d+\.)\s+/.test(l)) {
      const ordered = /^\d+\./.test(l);
      const items = [];
      while (i < lines.length && /^(-|\d+\.)\s+/.test(lines[i])) { items.push(lines[i].replace(/^(-|\d+\.)\s+/, "")); i++; }
      html.push(`<${ordered ? "ol" : "ul"}>${items.map((x) => `<li>${inline(x, meta.slug)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
      if (curQ) curQ.a.push(items.join(". "));
      continue;
    }
    if (/^>\s?/.test(l)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, "")); i++; }
      html.push(`<p class="answer">${inline(q.join(" "), meta.slug)}</p>`);
      continue;
    }
    if (/^!\[/.test(l)) { html.push(`<figure>${inline(l.trim(), meta.slug)}</figure>`); i++; continue; }
    const p = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|\||-\s|\d+\.\s|>|!\[|\[\[CTA\]\])/.test(lines[i])) { p.push(lines[i]); i++; }
    const text = p.join(" ");
    html.push(`<p>${inline(text, meta.slug)}</p>`);
    if (curQ) curQ.a.push(text);
  }
  return { html: html.join("\n"), faq: faq.map((f) => ({ q: f.q, a: f.a.join(" ").replace(/\*\*|\*|\[([^\]]+)\]\([^)]+\)/g, "$1") })) };
}

const url = (lang, slug) => (lang === "es" ? `${SITE}/${slug}/` : `${SITE}/en/${slug}/`);
const indexUrl = (lang) => (lang === "es" ? `${SITE}/` : `${SITE}/en/`);

function shell({ lang, title, description, canonical, alternates, image, jsonld, body }) {
  const t = T[lang];
  const otherLang = lang === "es" ? "en" : "es";
  const altLinks = alternates.map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${a.href}">`).join("\n");
  const xdef = alternates.find((a) => a.lang === "es");
  const switchHref = (alternates.find((a) => a.lang === otherLang) || { href: indexUrl(otherLang) }).href;
  return `<!doctype html>
<html lang="${lang === "es" ? "es-CO" : "en-US"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${altLinks}
${xdef ? `<link rel="alternate" hreflang="x-default" href="${xdef.href}">` : ""}
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta property="og:locale" content="${lang === "es" ? "es_CO" : "en_US"}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/styles.css">
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:"denied"});
gtag("js",new Date());gtag("config","${GA4}");
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4}"></script>
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body>
<header class="top"><a class="logo" href="${MAIN}/">oqon</a><nav><a href="${indexUrl(lang)}">${t.blog}</a><a href="${PRODUCT}?utm_source=blog&utm_medium=organic&utm_campaign=nav">${t.shop}</a><a href="${switchHref}" hreflang="${otherLang}">${t.other}</a></nav></header>
<main>
${body}
</main>
<div id="cc" class="cc" hidden><p>${lang === "es" ? "Usamos cookies para medir visitas y mejorar nuestros anuncios." : "We use cookies to measure visits and improve our ads."} <a href="${MAIN}/legal/cookies">${lang === "es" ? "Política de cookies" : "Cookie policy"}</a></p><div><button type="button" data-c="0">${lang === "es" ? "Rechazar" : "Decline"}</button><button type="button" data-c="1" class="ok">${lang === "es" ? "Aceptar" : "Accept"}</button></div></div>
<script>
(function(){var K="oqon_blog_consent",v=null;try{v=localStorage.getItem(K)}catch(e){}
function grant(){gtag("consent","update",{ad_storage:"granted",ad_user_data:"granted",ad_personalization:"granted",analytics_storage:"granted"});
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init","${META_PIXEL}");fbq("track","PageView");}
if(v==="1"){grant();return}if(v==="0")return;var c=document.getElementById("cc");c.hidden=false;
c.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var ok=b.getAttribute("data-c")==="1";try{localStorage.setItem(K,ok?"1":"0")}catch(e){}c.hidden=true;if(ok)grant();});
document.addEventListener("click",function(e){var a=e.target.closest("a.btn");if(a&&window.gtag)gtag("event","click_product",{link_url:a.href});});})();
</script>
<footer class="foot"><p>${t.foot}</p><p><a href="${MAIN}/">oqonlabs.com</a> · <a href="mailto:info@oqonlabs.com">info@oqonlabs.com</a></p></footer>
</body>
</html>`;
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const posts = { es: [], en: [] };
  for (const lang of ["es", "en"]) {
    const dir = path.join(ROOT, "content", lang);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md")).sort()) {
      const p = parse(path.join(dir, f));
      if (p.meta.lang !== lang) throw new Error(`${f}: lang mismatch`);
      if (p.meta.draft === "true") continue;
      posts[lang].push(p);
    }
    posts[lang].sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1));
  }
  const bySlug = (lang, slug) => posts[lang].find((p) => p.meta.slug === slug);
  const sitemap = [];

  for (const lang of ["es", "en"]) {
    const t = T[lang];
    for (const p of posts[lang]) {
      const { meta } = p;
      const { html, faq } = md(p.body, meta);
      const canonical = url(lang, meta.slug);
      const otherLang = lang === "es" ? "en" : "es";
      const pair = bySlug(otherLang, meta.pair);
      const alternates = [{ lang, href: canonical }];
      if (pair) alternates.push({ lang: otherLang, href: url(otherLang, pair.meta.slug) });
      const related = posts[lang].filter((x) => x.meta.slug !== meta.slug).slice(0, 3);
      const author = { "@type": "Person", name: "Fernando Arenas", jobTitle: lang === "es" ? "Fundador de OQON" : "Founder of OQON" };
      const jsonld = [
        { "@context": "https://schema.org", "@type": "Article", headline: meta.title, description: meta.description, image: [meta.image], datePublished: meta.date, dateModified: meta.updated, inLanguage: lang === "es" ? "es-CO" : "en-US", author, publisher: { "@type": "Organization", name: "OQON", url: MAIN }, mainEntityOfPage: canonical },
        { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [ { "@type": "ListItem", position: 1, name: "OQON", item: MAIN + "/" }, { "@type": "ListItem", position: 2, name: t.blog, item: indexUrl(lang) }, { "@type": "ListItem", position: 3, name: meta.title, item: canonical } ] },
      ];
      if (faq.length) jsonld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
      const body = `<article>
<p class="crumbs"><a href="${MAIN}/">OQON</a> › <a href="${indexUrl(lang)}">${t.blog}</a></p>
<h1>${esc(meta.title)}</h1>
<p class="meta">${t.by} Fernando Arenas · ${t.updated}: <time datetime="${meta.updated}">${meta.updated}</time></p>
${html}
${related.length ? `<section class="related"><h2>${t.related}</h2><ul>${related.map((r) => `<li><a href="${url(lang, r.meta.slug)}">${esc(r.meta.title)}</a></li>`).join("")}</ul></section>` : ""}
</article>`;
      const dest = lang === "es" ? path.join(OUT, meta.slug) : path.join(OUT, "en", meta.slug);
      fs.mkdirSync(dest, { recursive: true });
      fs.writeFileSync(path.join(dest, "index.html"), shell({ lang, title: `${meta.title} | OQON`, description: meta.description, canonical, alternates, image: meta.image, jsonld, body }));
      sitemap.push({ loc: canonical, lastmod: meta.updated, alternates });
    }
    // index page
    const list = posts[lang].map((p) => `<li><a href="${url(lang, p.meta.slug)}"><strong>${esc(p.meta.title)}</strong></a><br><span>${esc(p.meta.description)}</span></li>`).join("\n");
    const idxBody = `<section><h1>${esc(t.indexTitle)}</h1><p class="answer">${esc(t.indexDesc)}</p><ul class="posts">${list}</ul></section>`;
    const idxCanon = indexUrl(lang);
    const idxAlts = [{ lang: "es", href: indexUrl("es") }, { lang: "en", href: indexUrl("en") }];
    const idxDir = lang === "es" ? OUT : path.join(OUT, "en");
    fs.mkdirSync(idxDir, { recursive: true });
    fs.writeFileSync(path.join(idxDir, "index.html"), shell({ lang, title: t.indexTitle, description: t.indexDesc, canonical: idxCanon, alternates: idxAlts, image: posts[lang][0]?.meta.image || "", jsonld: [{ "@context": "https://schema.org", "@type": "Blog", name: t.indexTitle, url: idxCanon, publisher: { "@type": "Organization", name: "OQON", url: MAIN } }], body: idxBody }));
    sitemap.push({ loc: idxCanon, lastmod: posts[lang][0]?.meta.updated, alternates: idxAlts });
  }

  const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemap.map((s) => `<url><loc>${s.loc}</loc>${s.lastmod ? `<lastmod>${s.lastmod}</lastmod>` : ""}${s.alternates.map((a) => `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.href}"/>`).join("")}</url>`).join("\n")}
</urlset>`;
  fs.writeFileSync(path.join(OUT, "sitemap.xml"), sm);

  // llms.txt: plain index for AI assistants
  const llms = `# OQON blog\n\n> OQON makes OQON VISION, smart glasses with a camera, open-ear audio and an assistant optimized for Spanish, sold in Colombia. Launch price $350.000 COP (list $500.000). Product page: ${PRODUCT}\n\n## Español\n${posts.es.map((p) => `- [${p.meta.title}](${url("es", p.meta.slug)}): ${p.meta.description}`).join("\n")}\n\n## English\n${posts.en.map((p) => `- [${p.meta.title}](${url("en", p.meta.slug)}): ${p.meta.description}`).join("\n")}\n`;
  fs.writeFileSync(path.join(OUT, "llms.txt"), llms);

  fs.cpSync(path.join(ROOT, "static"), OUT, { recursive: true });
  console.log(`Built ${posts.es.length} ES + ${posts.en.length} EN posts → dist/`);
}

build();
