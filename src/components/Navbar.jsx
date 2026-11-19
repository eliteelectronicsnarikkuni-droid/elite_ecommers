import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Search, Zap, Menu, X } from 'lucide-react';

const Navbar = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Keep input in sync if URL changes externally
  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  // Close mobile menu on page transition
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim()) {
      navigate(`/?q=${encodeURIComponent(value.trim())}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  const handleAboutClick = (e) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
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
    if (window.location.pathname === '/') {
      const el = document.getElementById('contact');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/#contact');
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="logo-icon-container">
              <Zap className="logo-icon-svg" size={20} strokeWidth={2.5} />
            </div>
            <div className="logo-text">
              <span className="logo-text-elite">Elite</span>
              <span className="logo-text-electronics">Electronics</span>
            </div>
          </Link>

          <form className="search-form" onSubmit={handleSearchSubmit}>
            <Search className="search-icon" size={17} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
          </form>

          {/* Desktop Navigation Links */}
          <div className="nav-links">
            <Link to="/" className="nav-link">Shop</Link>
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
              onClick={() => setIsMobileMenuOpen(false)}
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
