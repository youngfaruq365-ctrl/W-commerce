import React from 'react';
import { motion } from 'framer-motion';
import { usePreview } from '../commerce/PreviewContext';
import { ProductCard } from '../commerce/ProductCard';

const SectionTitle = ({ title, sub }) => (
  <div className="mb-10">
    {sub && <p className="text-xs font-black uppercase tracking-widest mb-3 opacity-40">{sub}</p>}
    <h2 className="text-3xl md:text-4xl font-black leading-tight" style={{ fontFamily: 'var(--s-font-heading)' }}>{title}</h2>
  </div>
);

const Wrap = ({ children, className = '' }) => (
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 ${className}`}>{children}</div>
);

// Standard 3-4 column grid
export const GridStandard = ({ store, profile, motionVariants, styleProfile }) => {
  const { products } = usePreview();
  const tier = styleProfile?.tier || store?.tier || 'essential';
  return (
    <Wrap>
      <SectionTitle title="Featured Collection" sub="New Arrivals" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} tier={tier} />)}
      </div>
    </Wrap>
  );
};

// Bento mosaic grid
export const GridBento = ({ store, profile, motionVariants, styleProfile }) => {
  const { products, setActivePage } = usePreview();
  const tier = styleProfile?.tier || store?.tier || 'essential';
  return (
    <Wrap>
      <SectionTitle title="Highlights" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[220px]">
        <div className="col-span-2 row-span-2 relative rounded-[var(--s-radius)] overflow-hidden bg-[var(--s-surface)] group cursor-pointer" onClick={() => setActivePage('products')}>
          <img src={`https://picsum.photos/seed/${store.id}-g1/800/800`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 p-6 text-white"><div className="font-black text-2xl">New Arrivals</div><div className="text-sm opacity-70 mt-1">Shop the latest</div></div>
        </div>
        <div className="rounded-[var(--s-radius)] overflow-hidden relative group cursor-pointer" onClick={() => setActivePage('products')}>
          <div className="absolute inset-0 bg-[var(--s-primary)]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--s-bg)]">
            <div className="font-black text-2xl">{products.length}+</div>
            <div className="text-xs font-bold opacity-70 uppercase tracking-wider mt-1">Products</div>
          </div>
        </div>
        <div className="rounded-[var(--s-radius)] overflow-hidden relative group cursor-pointer bg-[var(--s-surface)]" onClick={() => setActivePage('products')}>
          <img src={`https://picsum.photos/seed/${store.id}-g2/400/400`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white font-black text-sm">Shop →</span>
          </div>
        </div>
        {products.slice(0, 2).map((p, i) => (
          <div key={p.id} className="rounded-[var(--s-radius)] overflow-hidden bg-[var(--s-surface)]">
            <ProductCard product={p} tier={tier} />
          </div>
        ))}
      </div>
    </Wrap>
  );
};

// Masonry
export const GridMasonry = ({ store, profile, motionVariants, styleProfile }) => {
  const { products } = usePreview();
  const tier = styleProfile?.tier || store?.tier || 'essential';
  return (
    <Wrap>
      <SectionTitle title="Collection" />
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {products.map((p, i) => (
          <div key={p.id} className="break-inside-avoid">
            <ProductCard product={p} tier={tier} />
          </div>
        ))}
      </div>
    </Wrap>
  );
};

// Horizontal scroll
export const GridHorizontal = ({ store, profile, motionVariants, styleProfile }) => {
  const { products } = usePreview();
  const tier = styleProfile?.tier || store?.tier || 'essential';
  return (
    <Wrap>
      <SectionTitle title="Shop the Look" />
      <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
        {products.map(p => (
          <div key={p.id} className="w-64 flex-shrink-0 snap-start">
            <ProductCard product={p} tier={tier} />
          </div>
        ))}
      </div>
    </Wrap>
  );
};

// Editorial large grid
export const GridEditorial = ({ store, profile, motionVariants, styleProfile }) => {
  const { products } = usePreview();
  const tier = styleProfile?.tier || store?.tier || 'essential';
  return (
    <Wrap>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="md:col-span-2"><SectionTitle title="Editorial Picks" sub="Curated for You" /></div>
        {products.slice(0, 2).map(p => (
          <div key={p.id} className="aspect-[3/4]">
            <ProductCard product={p} tier={tier} />
          </div>
        ))}
        <div className="md:col-span-2 grid grid-cols-3 gap-6">
          {products.slice(2, 5).map(p => <ProductCard key={p.id} product={p} tier={tier} />)}
        </div>
      </div>
    </Wrap>
  );
};

// Featured (1 big + grid)
export const GridFeatured = ({ store, profile, motionVariants, styleProfile }) => {
  const { products } = usePreview();
  const tier = styleProfile?.tier || store?.tier || 'essential';
  return (
    <Wrap>
      <SectionTitle title="Featured" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="md:row-span-2">
          <ProductCard product={products[0]} tier={tier} />
        </div>
        {products.slice(1, 3).map(p => <ProductCard key={p.id} product={p} tier={tier} />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        {products.slice(3, 6).map(p => <ProductCard key={p.id} product={p} tier={tier} />)}
      </div>
    </Wrap>
  );
};

// Asymmetric
export const GridAsymmetric = GridFeatured;
