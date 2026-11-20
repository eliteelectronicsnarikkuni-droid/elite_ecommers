import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';

const Home = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(query.toLowerCase()) || 
    (product.description && product.description.toLowerCase().includes(query.toLowerCase())) ||
    (product.category && product.category.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="home-container">
      <main className="products-section">
        <div className="section-header">
          <h2>{query ? `Search Results for "${query}"` : 'Premium Selection'}</h2>
          <div className="header-underline"></div>
        </div>

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
          <div className="no-results" style={{ textAlign: 'center', padding: '4rem' }}>
            <h3>No products found matching your search.</h3>
            <p style={{ color: 'var(--color-text-light)', marginTop: '0.5rem' }}>Try different keywords or browse our categories.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
