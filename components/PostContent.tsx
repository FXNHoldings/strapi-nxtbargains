/**
 * Renders post body HTML.
 *
 * Source posts come from a WordPress site that bakes a "GreenShift / GSPB" block
 * into the markup — inline <style> chunks, .gspb_* class names and a flex column
 * layout. Tailwind's `prose` class fights GSPB's layout (forces block images,
 * adds vertical margins between siblings, etc.), so we render plain HTML and
 * style only the non-GSPB elements via globals.css scoped to `.post-content`.
 *
 * Affiliate-tag rewriting happens at import time (server-side, in the importer)
 * — not here.
 */
export default function PostContent({ html }: { html: string }) {
  return (
    <div
      className="post-content"
      data-testid="post-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
