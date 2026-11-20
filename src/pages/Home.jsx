import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import { 
  SlidersHorizontal, 
  ArrowUpDown, 
  IndianRupee, 
  X, 
  RotateCcw, 
  Filter, 
  Sparkles 
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'All',
  'Speakers & Audio',
  'LED Lights',
  'Soldering & Tools',
  'Multimeters & Testers',
  'Torches & Flashlights',
  'Electronic Components',
  'Accessories'
];

const PRICE_RANGES = [
  { id: 'all', label: 'All Prices' },
  { id: 'under-500', label: 'Under ₹500' },
  { id: '500-1000', label: '₹500 - ₹1,000' },
  { id: '1000-2500', label: '₹1,000 - ₹2,500' },
  { id: 'above-2500', label: 'Above ₹2,500' }
];

const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured / Popular' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
  { id: 'discount', label: 'Biggest Discount (% OFF)' },
  { id: 'newest', label: 'Newest Arrivals' }
];

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryFromUrl = searchParams.get('category') || 'All';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Sort States
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [selectedSort, setSelectedSort] = useState('featured');

  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [categoryFromUrl]);

  useEffect(() => {
    if (window.location.hash === '#about') {
      setTimeout(() => {
        document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getProducts();
        if (isMounted) {
          setProducts(result.products || []);
          if (result.error && (!result.products || result.products.length === 0)) {
            setError(result.error);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load products');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute all available categories from database products
  const availableCategories = useMemo(() => {
    const presentInDb = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const merged = ['All', ...new Set([...DEFAULT_CATEGORIES.slice(1), ...presentInDb])];
    return merged;
  }, [products]);

  const isSearching = Boolean(query && query.trim());

  // Automatically reset sort to 'featured' when search query is cleared
  useEffect(() => {
    if (!isSearching && selectedSort !== 'featured') {
      setSelectedSort('featured');
    }
  }, [isSearching, selectedSort]);

  // Combined search, category filter, price filter & sorting
  const filteredProducts = useMemo(() => {
    const queryClean = query.trim().toLowerCase();

    return products
      .filter((product) => {
        // 1. Text Search (name, category, description)
        const matchesQuery = !queryClean || (
          (product.name && product.name.toLowerCase().includes(queryClean)) ||
          (product.description && product.description.toLowerCase().includes(queryClean)) ||
          (product.category && product.category.toLowerCase().includes(queryClean))
        );

        // 2. Category Match
        const matchesCategory = selectedCategory === 'All' || 
          (product.category && product.category.toLowerCase() === selectedCategory.toLowerCase());

        // 3. Price Range Match
        const price = Number(product.price || 0);
        let matchesPrice = true;
        if (selectedPriceRange === 'under-500') {
          matchesPrice = price < 500;
        } else if (selectedPriceRange === '500-1000') {
          matchesPrice = price >= 500 && price <= 1000;
        } else if (selectedPriceRange === '1000-2500') {
          matchesPrice = price > 1000 && price <= 2500;
        } else if (selectedPriceRange === 'above-2500') {
          matchesPrice = price > 2500;
        }

        return matchesQuery && matchesCategory && matchesPrice;
      })
      .sort((a, b) => {
        if (!isSearching) return 0;
        if (selectedSort === 'price-low') {
          return Number(a.price || 0) - Number(b.price || 0);
        }
        if (selectedSort === 'price-high') {
          return Number(b.price || 0) - Number(a.price || 0);
        }
        if (selectedSort === 'discount') {
          return (Number(b.discountPercentage) || 0) - (Number(a.discountPercentage) || 0);
        }
        if (selectedSort === 'newest') {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        return 0; // Default Featured
      });
  }, [products, query, selectedCategory, selectedPriceRange, selectedSort, isSearching]);

  const activeFiltersCount = 
    (selectedCategory !== 'All' ? 1 : 0) + 
    (selectedPriceRange !== 'all' ? 1 : 0) + 
    (isSearching && selectedSort !== 'featured' ? 1 : 0) + 
    (isSearching ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedPriceRange('all');
    setSelectedSort('featured');
    if (query) {
      setSearchParams({});
    }
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
  };

  return (
    <div className="home-container">
      <main className="products-section">
        <div className="section-header">
          <h2>{query ? `Search Results for "${query}"` : 'All Products'}</h2>
          <div className="header-underline"></div>
        </div>

        {/* CATEGORY FILTER PILLS BAR */}
        {!loading && availableCategories.length > 1 && (
          <div className="category-filter-strip">
            {availableCategories.map((cat) => {
              const count = cat === 'All'
                ? products.length
                : products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;

              // Only show category pills that have at least 1 product (or 'All')
              if (cat !== 'All' && count === 0) return null;

              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();

              return (
                <button
                  key={cat}
                  type="button"
                  className={`category-filter-pill ${isActive ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(cat)}
                >
                  <span>{cat}</span>
                  <span className="cat-pill-badge">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* CONTROLS TOOLBAR: Filter status, Sort, Price Filter */}
        {!loading && (
          <div className="filter-controls-toolbar">
            <div className="filter-toolbar-left">
              <span className="products-count-label">
                Showing <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'product' : 'products'}
              </span>

              {activeFiltersCount > 0 && (
                <button 
                  type="button" 
                  className="reset-all-filters-btn" 
                  onClick={handleResetFilters}
                  title="Clear all active filters"
                >
                  <RotateCcw size={12} /> Clear Filters
                </button>
              )}
            </div>

            <div className="filter-toolbar-right">
              {/* Quick Price Range Filter */}
              <div className="filter-select-container">
                <IndianRupee size={14} className="filter-select-icon" />
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="filter-dropdown-select"
                  aria-label="Filter by price range"
                >
                  {PRICE_RANGES.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Quick Sort Options - ONLY shown when searching */}
              {isSearching && (
                <div className="filter-select-container sort-search-container">
                  <ArrowUpDown size={14} className="filter-select-icon" />
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="filter-dropdown-select"
                    aria-label="Sort searched products"
                  >
                    {SORT_OPTIONS.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVE FILTER TAGS PILLS */}
        {!loading && (selectedCategory !== 'All' || selectedPriceRange !== 'all' || query) && (
          <div className="active-filter-tags-row">
            <span className="active-tags-title">Active:</span>

            {query && (
              <span className="active-filter-chip">
                Search: "{query}"
                <button type="button" onClick={() => setSearchParams({})} title="Remove search filter">
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedCategory !== 'All' && (
              <span className="active-filter-chip">
                Category: {selectedCategory}
                <button type="button" onClick={() => setSelectedCategory('All')} title="Remove category filter">
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedPriceRange !== 'all' && (
              <span className="active-filter-chip">
                Price: {PRICE_RANGES.find(r => r.id === selectedPriceRange)?.label}
                <button type="button" onClick={() => setSelectedPriceRange('all')} title="Remove price filter">
                  <X size={12} />
                </button>
              </span>
            )}

            {isSearching && selectedSort !== 'featured' && (
              <span className="active-filter-chip">
                Sort: {SORT_OPTIONS.find(s => s.id === selectedSort)?.label}
                <button type="button" onClick={() => setSelectedSort('featured')} title="Reset sorting">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="products-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-product-card">
                <div className="skeleton-thumb shimmer"></div>
                <div className="skeleton-body">
                  <div className="skeleton-line shimmer skeleton-cat"></div>
                  <div className="skeleton-line shimmer skeleton-title"></div>
                  <div className="skeleton-line shimmer skeleton-price"></div>
                  <div className="skeleton-btn shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="no-results" style={{ textAlign: 'center', padding: '4rem' }}>
            <h3>Failed to load products</h3>
            <p style={{ color: 'var(--color-text-light)', marginTop: '0.5rem' }}>{error}</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="filter-empty-state">
            <div className="empty-filter-icon-circle">
              <Filter size={32} />
            </div>
            <h3>No products found</h3>
            <p>No products match your selected category or price filter.</p>
            <button 
              type="button" 
              className="clear-all-empty-btn" 
              onClick={handleResetFilters}
            >
              <RotateCcw size={15} /> Clear All Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
