import { useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { CATEGORIES, products } from '../data/products';

export default function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = category === 'All' || p.category === category;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  return (
    <div className="page home-page">
      <section className="hero">
        <div className="container hero-inner">
          <div>
            <p className="hero-eyebrow">Welcome to MehtaMart</p>
            <h1>Shop smarter. Live better.</h1>
            <p className="hero-sub">
              Discover deals across electronics, fashion, grocery, books, and home essentials.
            </p>
          </div>
          <div className="hero-search">
            <label htmlFor="search" className="sr-only">
              Search products
            </label>
            <input
              id="search"
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="container shop-section">
        <div className="shop-toolbar">
          <h2>Categories</h2>
          <div className="category-pills" role="tablist">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={category === cat}
                className={category === cat ? 'pill active' : 'pill'}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <p className="results-meta">
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
        </p>

        {filtered.length === 0 ? (
          <p className="empty-state">No products match your search. Try another keyword or category.</p>
        ) : (
          <div className="product-grid">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section id="about" className="about-strip">
        <div className="container">
          <h2>About MehtaMart</h2>
          <p>
            MehtaMart is a simple, customer-first marketplace built for fast browsing and easy checkout.
            Quality products, fair prices, and delivery you can trust.
          </p>
        </div>
      </section>
    </div>
  );
}
