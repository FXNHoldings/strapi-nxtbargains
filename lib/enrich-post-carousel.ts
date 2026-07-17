import { bestOffer, collectOfferRows, formatMoney } from '@/lib/commerce';
import { getCommerceProduct } from '@/lib/strapi';

const CAROUSEL_ITEM_RE =
  /<a class="nxt-product-carousel__item" href="(?:https:\/\/nxt\.bargains)?\/([^/"]+)\/([^"]+)"[\s\S]*?<span class="nxt-product-carousel__price">([^<]*)<\/span>/g;

const PLACEHOLDER_PRICES = new Set(['View on NXT.Bargains', 'Check current price', 'Check price']);

function carouselPriceLabel(slug: string, priceBySlug: Map<string, string | null>): string | null {
  const label = priceBySlug.get(slug);
  return label && !PLACEHOLDER_PRICES.has(label) ? label : null;
}

export async function enrichPostCarouselHtml(html: string): Promise<string> {
  if (!html.includes('nxt-product-carousel__price')) return html;

  const slugs = [
    ...new Set(
      [...html.matchAll(/nxt-product-carousel__item" href="(?:https:\/\/nxt\.bargains)?\/[^/"]+\/([^"]+)"/g)].map(
        (match) => match[1],
      ),
    ),
  ];

  const priceBySlug = new Map<string, string | null>();
  await Promise.all(
    slugs.map(async (slug) => {
      const product = await getCommerceProduct(slug).catch(() => null);
      if (!product) {
        priceBySlug.set(slug, null);
        return;
      }

      const best = bestOffer(collectOfferRows(product));
      priceBySlug.set(
        slug,
        best
          ? formatMoney(best.offer.price ?? best.offer.originalPrice, best.offer.currency ?? 'USD')
          : null,
      );
    }),
  );

  return html.replace(CAROUSEL_ITEM_RE, (full, _categorySlug, productSlug, currentPrice) => {
    const nextPrice = carouselPriceLabel(productSlug, priceBySlug);
    if (!nextPrice) {
      if (PLACEHOLDER_PRICES.has(currentPrice)) {
        return full.replace(/\n<span class="nxt-product-carousel__price">[^<]*<\/span>/, '');
      }
      return full;
    }
    if (currentPrice === nextPrice) return full;
    return full.replace(`>${currentPrice}<`, `>${nextPrice}<`);
  });
}
