import { Link } from 'react-router-dom';
import { Camera } from 'lucide-react';

const ProductCard = ({ product }) => {
  const imageUrl = (Array.isArray(product.images) && product.images[0]) || 
    product.imageUrl || 
    product.image_url || 
    'https://via.placeholder.com/600x400?text=No+Image';
  
  const imagesCount = Array.isArray(product.images) ? product.images.length : 1;
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
      onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
    >
      <div className="product-image-container">
        <img 
          src={imageUrl} 
          alt={product.name} 
          className="product-image" 
          loading="lazy" 
          decoding="async" 
        />
        <div className="product-category">{product.category}</div>
        {hasDiscount && (
          <div className="product-discount-badge">
            {discountPercentage}% OFF
          </div>
        )}
        {imagesCount > 1 && (
          <div className="product-photo-count-badge" title={`${imagesCount} photos available`}>
            <Camera size={12} /> {imagesCount} Photos
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
