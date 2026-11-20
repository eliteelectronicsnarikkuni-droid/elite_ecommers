import { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts, getCachedProducts } from '../services/productService';
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

  // Synchronously initialize from cache so back navigation renders full height immediately with 0ms delay!
  const cachedInitial = getCachedProducts();
  const [products, setProducts] = useState(() => cachedInitial || []);
  const [loading, setLoading] = useState(() => !cachedInitial || cachedInitial.length === 0);
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

  // Automatically reset sort to 'featured', price to 'all', and category to 'All' when search query is cleared
  useEffect(() => {
    if (!isSearching) {
      if (selectedSort !== 'featured') {
        setSelectedSort('featured');
      }
      if (selectedPriceRange !== 'all') {
        setSelectedPriceRange('all');
      }
      if (selectedCategory !== 'All') {
        setSelectedCategory('All');
      }
    }
  }, [isSearching, selectedSort, selectedPriceRange, selectedCategory]);

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

        // 2. Category Match (only applied when searching)
        const matchesCategory = !isSearching || selectedCategory === 'All' || 
          (product.category && product.category.toLowerCase() === selectedCategory.toLowerCase());

        // 3. Price Range Match (only applied when searching)
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
    (isSearching && selectedCategory !== 'All' ? 1 : 0) + 
    (isSearching && selectedPriceRange !== 'all' ? 1 : 0) + 
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

  return (
    <div className="home-container">
      <main className="products-section">
        {/* Search Results Header - only displayed when search is active */}
        {isSearching && (
          <div className="section-header">
            <h2>Search Results for "{query}"</h2>
            <div className="header-underline"></div>
          </div>
        )}

        {/* CONTROLS TOOLBAR: Category, Price & Sort Filters - ONLY SHOWN WHEN SEARCHING */}
        {!loading && isSearching && (
          <div className="filter-controls-toolbar">
            <div className="filter-toolbar-left">
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
              {/* Category Filter for Search Results */}
              <div className="filter-select-container">
                <SlidersHorizontal size={14} className="filter-select-icon" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="filter-dropdown-select"
                  aria-label="Filter search results by category"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

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
        {!loading && isSearching && (selectedCategory !== 'All' || selectedPriceRange !== 'all' || selectedSort !== 'featured') && (
          <div className="active-filter-tags-row">
            <span className="active-tags-title">Active Filters:</span>

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
