import { Link } from 'react-router-dom';
import { Package, ChevronRight, Truck } from 'lucide-react';

const ProductCard = ({ product, layout = 'grid' }) => {
  if (!product || product.isHidden === true || product.is_hidden === true) {
    return null;
  }
  if (Array.isArray(product.features) && product.features.some(f => typeof f === 'string' && f.startsWith('__hidden__:'))) {
    return null;
  }

  const imageUrl = (Array.isArray(product.images) && product.images[0]) || 
    product.imageUrl || 
    product.image_url || 
    null;
  
  const offerPrice = Number(product.price || 0);
  const originalPrice = product.originalPrice ? Number(product.originalPrice) : null;
  const hasDiscount = originalPrice && originalPrice > offerPrice;
  const discountPercentage = product.discountPercentage || (hasDiscount ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100) : 0);

  const priceFormatted = offerPrice.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const originalFormatted = originalPrice
    ? originalPrice.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : null;

  const handleClick = () => {
    try {
      sessionStorage.setItem('home_scroll_y', String(window.scrollY || window.pageYOffset || 0));
    } catch {}
  };

  // 1. Amazon-Style List Row Layout (For Search Results: 1 product per row)
  if (layout === 'list') {
    return (
      <Link 
        to={`/product/${product.id}`} 
        className="product-card-list"
        onClick={handleClick}
        aria-label={`View details for ${product.name}`}
      >
        <div className="product-list-image-container">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={product.name} 
              className="product-list-image" 
              loading="lazy" 
              decoding="async" 
            />
          ) : (
            <div className="product-no-image-placeholder">
              <Package size={34} className="no-image-icon" />
              <span className="no-image-text">No Image</span>
            </div>
          )}
          {hasDiscount && (
            <div className="product-discount-badge list-discount-badge">
              {discountPercentage}% OFF
            </div>
          )}
        </div>

        <div className="product-list-info">
          <div className="product-list-header">
            {product.category && (
              <span className="product-list-category">{product.category}</span>
            )}
            <h3 className="product-list-name">{product.name}</h3>
          </div>

          <div className="product-list-pricing-wrap">
            <div className="product-list-price">₹{priceFormatted}</div>
            {hasDiscount && (
              <div className="product-list-original-row">
                <span className="product-list-mrp-label">M.R.P:</span>
                <span className="product-list-original-price">₹{originalFormatted}</span>
                <span className="card-discount-tag">{discountPercentage}% OFF</span>
              </div>
            )}
          </div>

          <div className="product-list-delivery">
            <Truck size={14} className="list-delivery-icon" />
            <span className="list-delivery-text">FREE Delivery</span>
          </div>

          {product.description && (
            <p className="product-list-desc">
              {product.description}
            </p>
          )}

          <div className="product-list-footer">
            <span className="view-details-btn list-view-btn">
              View Details <ChevronRight size={14} />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // 2. Standard Grid Layout (For Homepage: 2 products per row)
  return (
    <Link 
      to={`/product/${product.id}`} 
      className="product-card"
      onClick={handleClick}
      aria-label={`View details for ${product.name}`}
    >
      <div className="product-image-container">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name} 
            className="product-image" 
            loading="lazy" 
            decoding="async" 
          />
        ) : (
          <div className="product-no-image-placeholder">
            <Package size={38} className="no-image-icon" />
            <span className="no-image-text">No Image</span>
          </div>
        )}
        {hasDiscount && (
          <div className="product-discount-badge">
            {discountPercentage}% OFF
          </div>
        )}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        
        <div className="product-pricing-wrap">
          <div className="card-prices-line">
            <span className="product-price">₹{priceFormatted}</span>
            {hasDiscount && (
              <span className="product-original-price">₹{originalFormatted}</span>
            )}
          </div>
          {hasDiscount && (
            <span className="card-discount-tag">{discountPercentage}% OFF</span>
          )}
        </div>

        <span className="view-details-btn">
          View Details
        </span>
      </div>
    </Link>
  );
};

export default ProductCard;
