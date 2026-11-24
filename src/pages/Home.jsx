import { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts, getCachedProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import { 
  ArrowUpDown, 
  IndianRupee, 
  X, 
  RotateCcw, 
  Filter, 
  Sparkles 
} from 'lucide-react';

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

  // Synchronously initialize from cache so back navigation renders full height immediately with 0ms delay!
  const cachedInitial = getCachedProducts({ includeHidden: false });
  const [products, setProducts] = useState(() => cachedInitial || []);
  const [loading, setLoading] = useState(() => !cachedInitial || cachedInitial.length === 0);
  const [error, setError] = useState(null);

  // Filter & Sort States
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [selectedSort, setSelectedSort] = useState('featured');

  useEffect(() => {
    if (window.location.hash === '#about') {
      setTimeout(() => {
        document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, []);

  // Restore scroll position when navigating back from ProductDetail
  useLayoutEffect(() => {
    const savedY = sessionStorage.getItem('home_scroll_y');
    if (savedY !== null && products.length > 0) {
      const targetY = Number(savedY);
      window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });

      // Run on next tick as well in case layout is adjusting
      const timer = setTimeout(() => {
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
        sessionStorage.removeItem('home_scroll_y');
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [products]);

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      if (!products || products.length === 0) {
        setLoading(true);
      }
      setError(null);
      try {
        const result = await getProducts({ forceRefresh: true, includeHidden: false });
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

  const isSearching = Boolean(query && query.trim());

  // Automatically reset sort to 'featured' and price to 'all' when search query is cleared
  useEffect(() => {
    if (!isSearching) {
      if (selectedSort !== 'featured') {
        setSelectedSort('featured');
      }
      if (selectedPriceRange !== 'all') {
        setSelectedPriceRange('all');
      }
    }
  }, [isSearching, selectedSort, selectedPriceRange]);

  // Combined search, price filter & sorting
  const filteredProducts = useMemo(() => {
    const queryClean = query.trim().toLowerCase();

    return products
      .filter((product) => {
        // Exclude products hidden by admin so buyers cannot see them
        if (product.isHidden === true || product.is_hidden === true) {
          return false;
        }
        if (Array.isArray(product.features) && product.features.some(f => typeof f === 'string' && f.startsWith('__hidden__:'))) {
          return false;
        }

        // 1. Text Search (name, category, description)
        const matchesQuery = !queryClean || (
          (product.name && product.name.toLowerCase().includes(queryClean)) ||
          (product.description && product.description.toLowerCase().includes(queryClean)) ||
          (product.category && product.category.toLowerCase().includes(queryClean))
        );

        // 2. Price Range Match (only applied when searching)
        let matchesPrice = true;
        if (isSearching && selectedPriceRange !== 'all') {
          const price = Number(product.price || 0);
          if (selectedPriceRange === 'under-500') {
            matchesPrice = price < 500;
          } else if (selectedPriceRange === '500-1000') {
            matchesPrice = price >= 500 && price <= 1000;
          } else if (selectedPriceRange === '1000-2500') {
            matchesPrice = price > 1000 && price <= 2500;
          } else if (selectedPriceRange === 'above-2500') {
            matchesPrice = price > 2500;
          }
        }

        return matchesQuery && matchesPrice;
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
  }, [products, query, selectedPriceRange, selectedSort, isSearching]);

  const handleResetFilters = () => {
    setSelectedPriceRange('all');
    setSelectedSort('featured');
    if (query) {
      setSearchParams({});
    }
  };

  return (
    <div className="home-container">
      <main className="products-section">
        {/* CONTROLS TOOLBAR: Price & Sort Filters - ONLY SHOWN WHEN SEARCHING */}
        {!loading && isSearching && (
          <div className="filter-controls-toolbar">
            <div className="filter-toolbar-left">
              <span className="products-count-label">
                Found <strong>{filteredProducts.length}</strong> product{filteredProducts.length === 1 ? '' : 's'}
              </span>
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

              {/* Quick Sort Options */}
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
            </div>
          </div>
        )}

        {/* ACTIVE FILTER TAGS PILLS - ONLY SHOWN WHEN SEARCHING */}
        {!loading && isSearching && (selectedPriceRange !== 'all' || selectedSort !== 'featured') && (
          <div className="active-filter-tags-row">
            <span className="active-tags-title">Active Filters:</span>

            {selectedPriceRange !== 'all' && (
              <span className="active-filter-chip">
                Price: {PRICE_RANGES.find(r => r.id === selectedPriceRange)?.label}
                <button type="button" onClick={() => setSelectedPriceRange('all')} title="Remove price filter">
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedSort !== 'featured' && (
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
          isSearching ? (
            <div className="search-products-list">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-search-card">
                  <div className="skeleton-search-thumb shimmer"></div>
                  <div className="skeleton-search-body">
                    <div className="skeleton-line shimmer skeleton-cat"></div>
                    <div className="skeleton-line shimmer skeleton-title"></div>
                    <div className="skeleton-line shimmer skeleton-price"></div>
                    <div className="skeleton-btn shimmer"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="products-grid homepage-products-grid">
              {Array.from({ length: 6 }).map((_, i) => (
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
          )
        ) : error ? (
          <div className="no-results" style={{ textAlign: 'center', padding: '4rem' }}>
            <h3>Failed to load products</h3>
            <p style={{ color: 'var(--color-text-light)', marginTop: '0.5rem' }}>{error}</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          isSearching ? (
            <div className="search-products-list">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} layout="list" />
              ))}
            </div>
          ) : (
            <div className="products-grid homepage-products-grid">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} layout="grid" />
              ))}
            </div>
          )
        ) : (
          <div className="filter-empty-state">
            <div className="empty-filter-icon-circle">
              <Filter size={32} />
            </div>
            <h3>No products found</h3>
            <p>No products match your search or price filter.</p>
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
