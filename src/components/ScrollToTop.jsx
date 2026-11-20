import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Ensures that navigating between routes in React Router (like Home -> Product Details)
 * always resets the scroll position to the top of the new page, preventing the page
 * from opening at the bottom.
 */
const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // If returning to Home with a saved scroll position from clicking a product,
    // do NOT force scroll to top so the exact same position is preserved!
    if (pathname === '/' && sessionStorage.getItem('home_scroll_y') !== null) {
      return;
    }

    if (!window.location.hash) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // Instant jump so user immediately sees the top of the new page
      });
    }
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
