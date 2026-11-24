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
  const [customMinPrice, setCustomMinPrice] = useState('');
  const [customMaxPrice, setCustomMaxPrice] = useState('');
  const [appliedCustomPrice, setAppliedCustomPrice] = useState({ min: '', max: '' });
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Prevent background scrolling when mobile filter drawer is open
  useEffect(() => {
    if (isMobileFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileFilterOpen]);

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
      setCustomMinPrice('');
      setCustomMaxPrice('');
      setAppliedCustomPrice({ min: '', max: '' });
    }
  }, [isSearching]);

  const handleResetFilters = () => {
    setSelectedPriceRange('all');
    setSelectedSort('featured');
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setAppliedCustomPrice({ min: '', max: '' });
    if (query) {
      setSearchParams({});
    }
  };

  const handleSelectPresetPrice = (rangeId) => {
    setSelectedPriceRange(rangeId);
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setAppliedCustomPrice({ min: '', max: '' });
  };

  const handleApplyCustomPrice = (e) => {
    if (e) e.preventDefault();
    const minVal = customMinPrice.trim();
    const maxVal = customMaxPrice.trim();
    if (!minVal && !maxVal) {
      setSelectedPriceRange('all');
      setAppliedCustomPrice({ min: '', max: '' });
      return;
    }
    const numMin = minVal !== '' ? parseFloat(minVal) : null;
    const numMax = maxVal !== '' ? parseFloat(maxVal) : null;
    if (numMin !== null && numMax !== null && numMin > numMax) {
      setAppliedCustomPrice({ min: String(numMax), max: String(numMin) });
      setCustomMinPrice(String(numMax));
      setCustomMaxPrice(String(numMin));
    } else {
      setAppliedCustomPrice({ min: minVal, max: maxVal });
    }
    setSelectedPriceRange('custom');
  };

  const handleClearPriceFilter = () => {
    setSelectedPriceRange('all');
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setAppliedCustomPrice({ min: '', max: '' });
  };

  const getPriceFilterLabel = () => {
    if (selectedPriceRange === 'custom') {
      const min = appliedCustomPrice.min;
      const max = appliedCustomPrice.max;
      if (min && max) return `₹${Number(min).toLocaleString('en-IN')} - ₹${Number(max).toLocaleString('en-IN')}`;
      if (min) return `Over ₹${Number(min).toLocaleString('en-IN')}`;
      if (max) return `Under ₹${Number(max).toLocaleString('en-IN')}`;
      return 'Custom Price';
    }
    return PRICE_RANGES.find(r => r.id === selectedPriceRange)?.label;
  };

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
          if (selectedPriceRange === 'custom') {
            const min = appliedCustomPrice.min !== '' ? parseFloat(appliedCustomPrice.min) : null;
            const max = appliedCustomPrice.max !== '' ? parseFloat(appliedCustomPrice.max) : null;
            if (min !== null && price < min) matchesPrice = false;
            if (max !== null && price > max) matchesPrice = false;
          } else if (selectedPriceRange === 'under-500') {
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
  }, [products, query, selectedPriceRange, selectedSort, isSearching, appliedCustomPrice]);

  const activeFiltersCount = (selectedPriceRange !== 'all' ? 1 : 0) + (selectedSort !== 'featured' ? 1 : 0);

  return (
    <div className="home-container">
      <main className="products-section">
        {isSearching ? (
          <div className="search-page-layout">
            {/* DESKTOP AMAZON FILTER SIDEBAR (Visible only on desktop > 1024px) */}
            {!loading && (
              <aside className="desktop-amazon-filter-sidebar" aria-label="Filters">
                <div className="filter-sidebar-header">
                  <div className="filter-sidebar-title">
                    <Filter size={16} className="sidebar-filter-icon" />
                    <span>Filters</span>
                  </div>
                  {(selectedPriceRange !== 'all' || selectedSort !== 'featured') && (
                    <button
                      type="button"
                      className="filter-sidebar-clear-btn"
                      onClick={handleResetFilters}
                      title="Clear all filters"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Price Section */}
                <div className="filter-sidebar-section">
                  <h4 className="filter-sidebar-heading">Price</h4>
                  <ul className="filter-sidebar-list">
                    {PRICE_RANGES.map((range) => {
                      const isSelected = selectedPriceRange === range.id;
                      return (
                        <li key={range.id}>
                          <button
                            type="button"
                            className={`filter-sidebar-item-btn ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectPresetPrice(range.id)}
                          >
                            <span className={`filter-sidebar-radio ${isSelected ? 'checked' : ''}`}></span>
                            <span className="filter-sidebar-label">{range.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Amazon-style Custom Price Range: [ ₹ Min ] to [ ₹ Max ] [ Go ] */}
                  <form className="amazon-custom-price-form" onSubmit={handleApplyCustomPrice}>
                    <div className="custom-price-inputs-row">
                      <div className="custom-price-field">
                        <span className="custom-price-currency">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Min"
                          value={customMinPrice}
                          onChange={(e) => setCustomMinPrice(e.target.value)}
                          className="custom-price-input"
                          aria-label="Minimum price"
                        />
                      </div>
                      <span className="custom-price-separator">to</span>
                      <div className="custom-price-field">
                        <span className="custom-price-currency">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Max"
                          value={customMaxPrice}
                          onChange={(e) => setCustomMaxPrice(e.target.value)}
                          className="custom-price-input"
                          aria-label="Maximum price"
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="custom-price-go-btn"
                        title="Go"
                      >
                        Go
                      </button>
                    </div>
                  </form>
                </div>

                {/* Sort By Section */}
                <div className="filter-sidebar-section">
                  <h4 className="filter-sidebar-heading">Sort By</h4>
                  <ul className="filter-sidebar-list">
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = selectedSort === opt.id;
                      return (
                        <li key={opt.id}>
                          <button
                            type="button"
                            className={`filter-sidebar-item-btn ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedSort(opt.id)}
                          >
                            <span className={`filter-sidebar-radio ${isSelected ? 'checked' : ''}`}></span>
                            <span className="filter-sidebar-label">{opt.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Amazon Delivery Perk */}
                <div className="filter-sidebar-section">
                  <h4 className="filter-sidebar-heading">Delivery</h4>
                  <div className="filter-sidebar-delivery-perk">
                    <span className="delivery-check-mark">✓</span>
                    <span className="delivery-perk-text">Eligible for <strong>FREE Delivery</strong></span>
                  </div>
                </div>
              </aside>
            )}

            {/* MAIN SEARCH RESULTS COLUMN */}
            <div className="search-layout-main">
              {/* MOBILE & TABLET COMPACT CONTROLS BAR: Count + Filter Button (Hidden on Desktop) */}
              {!loading && (
                <div className="mobile-search-controls-bar">
                  <span className="products-count-label">
                    Found <strong>{filteredProducts.length}</strong> product{filteredProducts.length === 1 ? '' : 's'}
                  </span>

                  <button
                    type="button"
                    className={`mobile-filter-trigger-btn ${activeFiltersCount > 0 ? 'active' : ''}`}
                    onClick={() => setIsMobileFilterOpen(true)}
                    aria-label="Open filter options"
                  >
                    <Filter size={15} />
                    <span>Filter</span>
                    {activeFiltersCount > 0 && (
                      <span className="mobile-filter-count-badge">{activeFiltersCount}</span>
                    )}
                  </button>
                </div>
              )}

              {/* MOBILE / TABLET SLIDE-IN FILTER SIDEBAR DRAWER (Amazon & Flipkart style) */}
              <div className={`mobile-filter-drawer-container ${isMobileFilterOpen ? 'open' : ''}`}>
                <div 
                  className="mobile-filter-backdrop" 
                  onClick={() => setIsMobileFilterOpen(false)}
                  aria-hidden="true"
                />
                <div className="mobile-filter-sheet" role="dialog" aria-modal="true" aria-label="Filters">
                  <div className="mobile-filter-header">
                    <div className="mobile-filter-header-left">
                      <Filter size={17} className="sidebar-filter-icon" />
                      <h3>Filters</h3>
                      {activeFiltersCount > 0 && (
                        <span className="mobile-filter-active-pill">{activeFiltersCount} active</span>
                      )}
                    </div>
                    <div className="mobile-filter-header-right">
                      {activeFiltersCount > 0 && (
                        <button 
                          type="button" 
                          className="filter-sidebar-clear-btn" 
                          onClick={handleResetFilters}
                        >
                          Clear all
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="mobile-filter-close-btn" 
                        onClick={() => setIsMobileFilterOpen(false)}
                        aria-label="Close filters"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="mobile-filter-body">
                    {/* Price Section */}
                    <div className="filter-sidebar-section">
                      <h4 className="filter-sidebar-heading">Price</h4>
                      <ul className="filter-sidebar-list">
                        {PRICE_RANGES.map((range) => {
                          const isSelected = selectedPriceRange === range.id;
                          return (
                            <li key={range.id}>
                              <button
                                type="button"
                                className={`filter-sidebar-item-btn ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSelectPresetPrice(range.id)}
                              >
                                <span className={`filter-sidebar-radio ${isSelected ? 'checked' : ''}`}></span>
                                <span className="filter-sidebar-label">{range.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>

                      {/* Custom Price Range: [ ₹ Min ] to [ ₹ Max ] [ Go ] */}
                      <form className="amazon-custom-price-form" onSubmit={handleApplyCustomPrice}>
                        <div className="custom-price-inputs-row">
                          <div className="custom-price-field">
                            <span className="custom-price-currency">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="Min"
                              value={customMinPrice}
                              onChange={(e) => setCustomMinPrice(e.target.value)}
                              className="custom-price-input"
                              aria-label="Minimum price"
                            />
                          </div>
                          <span className="custom-price-separator">to</span>
                          <div className="custom-price-field">
                            <span className="custom-price-currency">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="Max"
                              value={customMaxPrice}
                              onChange={(e) => setCustomMaxPrice(e.target.value)}
                              className="custom-price-input"
                              aria-label="Maximum price"
                            />
                          </div>
                          <button type="submit" className="custom-price-go-btn" title="Go">
                            Go
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Sort By Section */}
                    <div className="filter-sidebar-section">
                      <h4 className="filter-sidebar-heading">Sort By</h4>
                      <ul className="filter-sidebar-list">
                        {SORT_OPTIONS.map((opt) => {
                          const isSelected = selectedSort === opt.id;
                          return (
                            <li key={opt.id}>
                              <button
                                type="button"
                                className={`filter-sidebar-item-btn ${isSelected ? 'selected' : ''}`}
                                onClick={() => setSelectedSort(opt.id)}
                              >
                                <span className={`filter-sidebar-radio ${isSelected ? 'checked' : ''}`}></span>
                                <span className="filter-sidebar-label">{opt.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Delivery Perk */}
                    <div className="filter-sidebar-section">
                      <h4 className="filter-sidebar-heading">Delivery</h4>
                      <div className="filter-sidebar-delivery-perk">
                        <span className="delivery-check-mark">✓</span>
                        <span className="delivery-perk-text">Eligible for <strong>FREE Delivery</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="mobile-filter-footer">
                    <button 
                      type="button" 
                      className="mobile-filter-apply-btn"
                      onClick={() => setIsMobileFilterOpen(false)}
                    >
                      View {filteredProducts.length} Results
                    </button>
                  </div>
                </div>
              </div>

              {/* DESKTOP SEARCH RESULTS TOPBAR (Results Count & Active Filters on Desktop) */}
              {!loading && (
                <div className="desktop-search-results-topbar">
                  <span className="products-count-label">
                    Found <strong>{filteredProducts.length}</strong> product{filteredProducts.length === 1 ? '' : 's'}
                  </span>
                  {(selectedPriceRange !== 'all' || selectedSort !== 'featured') && (
                    <div className="desktop-search-active-chips">
                      <span className="active-tags-title">Active Filters:</span>
                      {selectedPriceRange !== 'all' && (
                        <span className="active-filter-chip">
                          Price: {getPriceFilterLabel()}
                          <button type="button" onClick={handleClearPriceFilter} title="Remove price filter">
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
                </div>
              )}

              {/* MOBILE & TABLET ACTIVE FILTER TAGS PILLS (Existing style, hidden on desktop) */}
              {!loading && (selectedPriceRange !== 'all' || selectedSort !== 'featured') && (
                <div className="active-filter-tags-row mobile-tablet-filter-chips">
                  <span className="active-tags-title">Active Filters:</span>

                  {selectedPriceRange !== 'all' && (
                    <span className="active-filter-chip">
                      Price: {getPriceFilterLabel()}
                      <button type="button" onClick={handleClearPriceFilter} title="Remove price filter">
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

              {/* SEARCH RESULTS PRODUCT LIST / SKELETON */}
              {loading ? (
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
              ) : filteredProducts.length > 0 ? (
                <div className="search-products-list">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} layout="list" />
                  ))}
                </div>
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
            </div>
          </div>
        ) : (
          /* HOMEPAGE CATALOG (When no active search query) */
          loading ? (
            <div className="products-grid homepage-products-grid">
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
            <div className="products-grid homepage-products-grid">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} layout="grid" />
              ))}
            </div>
          ) : (
            <div className="filter-empty-state">
              <div className="empty-filter-icon-circle">
                <Sparkles size={32} />
              </div>
              <h3>No products available</h3>
              <p>Check back later for new arrivals.</p>
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default Home;
