import Link from 'next/link';
import {
  bestOffer,
  collectOfferRows,
  formatMoney,
  merchantCount,
  merchantName,
  productImageUrl,
} from '@/lib/commerce';
import type { CommerceProduct } from '@/lib/strapi';

export default function CommerceProductCard({ product }: { product: CommerceProduct }) {
  const rows = collectOfferRows(product);
  const best = bestOffer(rows);
  const image = productImageUrl(product);
  const category = product.categories?.[0]?.name ?? product.category ?? 'Product';

  return (
    <article className="group flex h-full flex-col border border-ink/10 bg-white" data-testid={`commerce-product-${product.slug}`}>
      <Link href={`/products/${product.slug}`} className="block overflow-hidden bg-white">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.primaryImage?.alternativeText || product.name}
            className="h-52 w-full object-contain p-5 transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-52 w-full items-center justify-center bg-muted px-6 text-center font-display text-2xl font-bold text-ink/25">
            {product.brandRef?.name ?? product.brand ?? 'NXT'}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          {category}
        </p>
        <Link href={`/products/${product.slug}`}>
          <h2 className="mt-3 line-clamp-3 font-display text-xl font-bold leading-tight text-ink transition group-hover:text-primary">
            {product.name}
          </h2>
        </Link>

        {product.shortDescription && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/60">{product.shortDescription}</p>
        )}

        <div className="mt-auto grid grid-cols-2 gap-3 pt-5 text-sm">
          <div className="border border-ink/10 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-ink/40">From</p>
            <p className="mt-1 font-display text-lg font-bold text-ink">
              {best ? formatMoney(best.offer.price ?? best.offer.originalPrice, best.offer.currency ?? 'USD') : 'Check price'}
            </p>
          </div>
          <div className="border border-ink/10 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-ink/40">Stores</p>
            <p className="mt-1 font-display text-lg font-bold text-ink">
              {rows.length ? merchantCount(rows) : 0}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="line-clamp-1 text-xs text-ink/45">
            {best ? merchantName(best.offer) : 'No offers yet'}
          </p>
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-emphasis"
          >
            Compare
          </Link>
        </div>
      </div>
    </article>
  );
}
