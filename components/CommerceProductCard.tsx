import Link from 'next/link';
import {
  bestOffer,
  collectOfferRows,
  formatMoney,
  merchantName,
  productImageUrl,
} from '@/lib/commerce';
import { mediaUrl, type CommerceProduct } from '@/lib/strapi';

export default function CommerceProductCard({
  product,
  showStoreLogo = false,
  showCompareButton = true,
  titleClassName = '',
}: {
  product: CommerceProduct;
  showStoreLogo?: boolean;
  showCompareButton?: boolean;
  titleClassName?: string;
}) {
  const rows = collectOfferRows(product);
  const best = bestOffer(rows);
  const image = productImageUrl(product);
  const category = product.categories?.[0]?.name ?? product.category ?? 'Product';
  const bestMerchant = best?.offer.merchant ?? null;
  const storeLogo = bestMerchant?.logo ? mediaUrl(bestMerchant.logo) : null;
  const storeName = best ? merchantName(best.offer) : null;

  return (
    <article className="group flex h-full flex-col border border-ink/10 bg-white" data-testid={`commerce-product-${product.slug}`}>
      <Link href={`/products/${product.slug}`} className="commerce-product-image-box grid overflow-hidden bg-white">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.primaryImage?.alternativeText || product.name}
            className="commerce-product-image h-52 w-full object-contain p-5 mix-blend-multiply transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-52 w-full items-center justify-center bg-muted px-6 text-center font-display text-2xl font-bold text-ink/25">
            {product.brandRef?.name ?? product.brand ?? 'NXT'}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {showStoreLogo ? (
          <div className="flex h-5 items-center">
            {storeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storeLogo} alt={storeName ?? 'Marketplace'} referrerPolicy="no-referrer" className="h-5 max-w-[96px] object-contain object-left" />
            ) : (
              <span className="line-clamp-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{storeName ?? category}</span>
            )}
          </div>
        ) : (
          <p className="line-clamp-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {category}
          </p>
        )}
        <Link href={`/products/${product.slug}`}>
          <h3 className={`product-card-title mt-3 line-clamp-2 font-display leading-tight text-ink transition group-hover:text-primary ${titleClassName}`}>
            {product.name}
          </h3>
        </Link>

        {/* From price on one line (no border) + store/marketplace name */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <p className="font-display text-base font-bold text-ink">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/40">From</span>
            {best ? formatMoney(best.offer.price ?? best.offer.originalPrice, best.offer.currency ?? 'USD') : 'Check price'}
          </p>
          {storeLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={storeLogo} alt={storeName ?? 'Store'} referrerPolicy="no-referrer" className="h-5 max-w-[84px] shrink-0 object-contain object-right" />
          ) : (
            <p className="line-clamp-1 text-right text-xs font-bold text-ink/55">
              {best ? merchantName(best.offer) : 'No offers yet'}
            </p>
          )}
        </div>

        {showCompareButton && (
          <div className="mt-4 flex justify-start">
            <Link
              href={`/products/${product.slug}`}
              className="inline-flex bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-emphasis"
            >
              Compare
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
