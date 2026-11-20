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
    if (!window.location.hash) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // Instant jump so user immediately sees the top of the product
      });
    }
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
