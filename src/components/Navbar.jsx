import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { getProducts } from '../services/productService';
import { 
  Search, 
  Menu, 
  X, 
  TrendingUp, 
  ChevronRight, 
  ArrowRight, 
  ArrowUpRight,
  Package 
} from 'lucide-react';

const POPULAR_SEARCHES = [
  'Speakers',
  'LED Lights',
  'Soldering Iron',
  'Digital Multimeter',
  'Torch',
  'Electronic Components'
];

const getProductThumb = (prod) => {
  return (Array.isArray(prod?.images) && prod.images[0]) || 
    prod?.imageUrl || 
    prod?.image_url || 
    (Array.isArray(prod?.colors) && prod.colors[0]?.images?.[0]) || 
    null;
};

const highlightMatch = (text, query) => {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <strong key={index} className="search-match-text">
        {part}
      </strong>
    ) : (
      part
    )
  );
};

const Navbar = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const navigate = useNavigate();
  const location = useLocation();
  const searchWrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  // Load product catalog for instant real-time suggestions
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        const res = await getProducts({ forceRefresh: true, includeHidden: false });
        if (isMounted && res.products) {
          // Filter out products hidden by admin so buyers do not see them in search suggestions
          setCatalog(res.products.filter(p => !p.isHidden && !p.is_hidden && !(Array.isArray(p.features) && p.features.some(f => typeof f === 'string' && f.startsWith('__hidden__:')))));
        }
      } catch (err) {
        console.warn('Navbar suggestion catalog load warning:', err);
      }
    };
    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Keep input in sync if URL changes externally
  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  // Close mobile menu and dropdown on page navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchFocused(false);
  }, [location.pathname]);

  // Click outside listener to dismiss suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setIsSearchFocused(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedIndex(-1);
    setIsSearchFocused(true);

    if (value.trim()) {
      navigate(`/?q=${encodeURIComponent(value.trim())}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setIsSearchFocused(false);
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/');
    }
    searchInputRef.current?.blur();
  };

  const handleSelectProduct = (productId) => {
    setIsSearchFocused(false);
    setIsMobileMenuOpen(false);
    navigate(`/product/${productId}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSelectQuery = (term) => {
    setSearchQuery(term);
    setIsSearchFocused(false);
    setIsMobileMenuOpen(false);
    navigate(`/?q=${encodeURIComponent(term)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedIndex(-1);
    navigate('/');
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsSearchFocused(false);
    }
  };

  const handleShopClick = (e) => {
    setIsMobileMenuOpen(false);
    setIsSearchFocused(false);
    setSearchQuery('');

    if (location.pathname === '/' && !location.search && !location.hash) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      e.preventDefault();
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAboutClick = (e) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    setIsSearchFocused(false);
    if (window.location.pathname === '/') {
      const el = document.getElementById('about');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/#about');
    }
  };

  const handleContactClick = (e) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    setIsSearchFocused(false);
    if (window.location.pathname === '/') {
      const el = document.getElementById('contact');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/#contact');
    }
  };

  // Derive Flipkart-style product matches
  const queryClean = searchQuery.trim().toLowerCase();

  const matchingProducts = queryClean
    ? catalog
        .filter((p) => {
          if (p.isHidden === true || p.is_hidden === true) return false;
          if (Array.isArray(p.features) && p.features.some(f => typeof f === 'string' && f.startsWith('__hidden__:'))) return false;
          const name = (p.name || '').toLowerCase();
          const cat = (p.category || '').toLowerCase();
          const desc = (p.description || '').toLowerCase();
          return name.includes(queryClean) || cat.includes(queryClean) || desc.includes(queryClean);
        })
        .sort((a, b) => {
          const aName = (a.name || '').toLowerCase();
          const bName = (b.name || '').toLowerCase();
          const aStarts = aName.startsWith(queryClean);
          const bStarts = bName.startsWith(queryClean);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;

          const aInName = aName.includes(queryClean);
          const bInName = bName.includes(queryClean);
          if (aInName && !bInName) return -1;
          if (!aInName && bInName) return 1;

          return 0;
        })
        .slice(0, 8)
    : [];

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo" onClick={handleShopClick} aria-label="Elite Electronics Home">
            <img 
              src="/logo.png" 
              alt="Elite Electronics Logo" 
              className="nav-logo-image" 
            />
          </Link>

          {/* Flipkart-Style Real-time Search Box & Suggestions */}
          <div className="search-wrapper" ref={searchWrapperRef}>
            <form className="search-form" onSubmit={handleSearchSubmit}>
              <Search className="search-icon" size={17} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products......"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={handleKeyDown}
                className="search-input"
                autoComplete="off"
                spellCheck="false"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </form>

            {/* Instant Suggestions Dropdown (Flipkart-Style Pure Product Search) */}
            {isSearchFocused && (
              <div className="search-suggestions-dropdown">
                {queryClean ? (
                  <>
                    {/* Matching Products */}
                    {matchingProducts.length > 0 ? (
                      <div className="suggestion-section">
                        <div className="suggestion-section-title">PRODUCTS</div>
                        {matchingProducts.map((prod) => {
                          const prodImg = getProductThumb(prod);
                          return (
                            <div
                              key={prod.id}
                              className="suggestion-item product-item"
                              onClick={() => handleSelectProduct(prod.id)}
                            >
                              {prodImg ? (
                                <img
                                  src={prodImg}
                                  alt={prod.name}
                                  className="suggestion-thumb"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="suggestion-thumb-fallback">
                                  <Package size={16} color="#94a3b8" />
                                </div>
                              )}
                              <div className="suggestion-info">
                                <span className="suggestion-title">
                                  {highlightMatch(prod.name, searchQuery.trim())}
                                </span>
                                <div className="suggestion-price-row">
                                  <span className="suggestion-price">
                                    ₹{Number(prod.price || 0).toLocaleString('en-IN')}
                                  </span>
                                  {prod.discountPercentage > 0 && (
                                    <span className="suggestion-discount">
                                      {prod.discountPercentage}% OFF
                                    </span>
                                  )}
                                  {prod.category && (
                                    <span className="suggestion-category-tag">in {prod.category}</span>
                                  )}
                                </div>
                              </div>
                              <ArrowUpRight size={15} className="suggestion-arrow" />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="suggestion-empty-state">
                        <Search size={22} className="empty-search-icon" />
                        <p>
                          No products matching "<strong>{searchQuery}</strong>"
                        </p>
                        <span>Try searching for speakers, LED lights, tools or audio...</span>
                      </div>
                    )}

                    {/* View All Results Button */}
                    <div
                      className="suggestion-footer-bar"
                      onClick={() => handleSelectQuery(searchQuery.trim())}
                    >
                      <span>
                        See all products for "<strong>{searchQuery.trim()}</strong>"
                      </span>
                      <ArrowRight size={15} />
                    </div>
                  </>
                ) : (
                  /* Trending Products when search input is empty (Flipkart-style) */
                  <div className="suggestion-section">
                    <div className="suggestion-section-title popular-header">
                      <TrendingUp size={14} />
                      <span>TRENDING PRODUCTS</span>
                    </div>
                    {catalog.slice(0, 5).map((prod) => {
                      const prodImg = getProductThumb(prod);
                      return (
                        <div
                          key={prod.id}
                          className="suggestion-item product-item"
                          onClick={() => handleSelectProduct(prod.id)}
                        >
                          {prodImg ? (
                            <img
                              src={prodImg}
                              alt={prod.name}
                              className="suggestion-thumb"
                              loading="lazy"
                            />
                          ) : (
                            <div className="suggestion-thumb-fallback">
                              <Package size={16} color="#94a3b8" />
                            </div>
                          )}
                          <div className="suggestion-info">
                            <span className="suggestion-title">{prod.name}</span>
                            <div className="suggestion-price-row">
                              <span className="suggestion-price">
                                ₹{Number(prod.price || 0).toLocaleString('en-IN')}
                              </span>
                              {prod.discountPercentage > 0 && (
                                <span className="suggestion-discount">
                                  {prod.discountPercentage}% OFF
                                </span>
                              )}
                              {prod.category && (
                                <span className="suggestion-category-tag">in {prod.category}</span>
                              )}
                            </div>
                          </div>
                          <ArrowUpRight size={15} className="suggestion-arrow" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <div className="nav-links">
            <Link to="/" onClick={handleShopClick} className="nav-link">Shop</Link>
            <a href="#about" onClick={handleAboutClick} className="nav-link">About Us</a>
            <a href="#contact" onClick={handleContactClick} className="nav-link">Contact Us</a>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <div className={`mobile-nav-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-nav-links">
            <Link 
              to="/" 
              className="mobile-nav-link" 
              onClick={handleShopClick}
            >
              Shop
            </Link>
            <a 
              href="#about" 
              onClick={handleAboutClick} 
              className="mobile-nav-link"
            >
              About Us
            </a>
            <a 
              href="#contact" 
              onClick={handleContactClick} 
              className="mobile-nav-link"
            >
              Contact Us
            </a>
          </div>
        </div>
      </nav>

      {/* Dimmed Backdrop when Mobile Menu is Open */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-backdrop" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}
    </>
  );
};

export default Navbar;
