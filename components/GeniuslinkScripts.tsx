'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

const GENIUSLINK_TSID = 426428;
const GENIUSLINK_DOMAIN = 'https://buy.geni.us';

type GeniuslinkWindow = Window & {
  Genius?: {
    amazon?: {
      convertLinks?: (tsid: number, useSmartLinks: boolean, domain: string) => void;
    };
  };
};

function convertAmazonLinks() {
  try {
    const convertLinks = (window as GeniuslinkWindow).Genius?.amazon?.convertLinks;
    if (typeof convertLinks === 'function') {
      convertLinks(GENIUSLINK_TSID, true, GENIUSLINK_DOMAIN);
    }
  } catch (error) {
    console.warn('Geniuslink link conversion failed', error);
  }
}

export default function GeniuslinkScripts() {
  const pathname = usePathname();

  useEffect(() => {
    const timer = window.setTimeout(convertAmazonLinks, 250);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <Script
      id="geniuslink-snippet"
      src="https://geniuslinkcdn.com/snippet.min.js"
      strategy="afterInteractive"
      onLoad={convertAmazonLinks}
    />
  );
}
