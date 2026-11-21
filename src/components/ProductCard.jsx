import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

const ProductCard = ({ product }) => {
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

  return (
    <Link 
      to={`/product/${product.id}`} 
      className="product-card"
      onClick={() => {
        try {
          sessionStorage.setItem('home_scroll_y', String(window.scrollY || window.pageYOffset || 0));
        } catch {}
      }}
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
        <div className="product-category">{product.category}</div>
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
