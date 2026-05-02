/**
 * Renders post body HTML.
 *
 * Source posts come from a WordPress site that bakes a "GreenShift / GSPB" block
 * into the markup — inline <style> chunks, .gspb_* class names and column markup.
 * We render it raw via dangerouslySetInnerHTML; the parent <article> applies the
 * Tailwind `prose` typography baseline so anything not styled by GSPB still reads.
 *
 * If/when affiliate-tag rewriting is needed, it should happen at import time
 * (server-side, in the importer) — not here.
 */
export default function PostContent({ html }: { html: string }) {
  return (
    <div
      className="post-content prose prose-slate max-w-none prose-headings:font-display prose-headings:text-ink prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl"
      data-testid="post-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
