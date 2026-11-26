import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Truck } from 'lucide-react';

const ProductCard = ({ product, layout = 'grid' }) => {
  if (!product || product.isHidden === true || product.is_hidden === true) {
    return null;
  }
  if (Array.isArray(product.features) && product.features.some(f => typeof f === 'string' && f.startsWith('__hidden__:'))) {
    return null;
  }

  // Filter valid color variants
  const colors = Array.isArray(product.colors) 
    ? product.colors.filter(c => c && (c.name || c.colorCode || (Array.isArray(c.images) && c.images.length > 0)))
    : [];
  
  // STRICT RULE: Only show colors if product has MULTIPLE colors (> 1)
  // Single color or no color products must NOT show color options/swatches
  const hasMultipleColors = colors.length > 1;

  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  const selectedColor = hasMultipleColors ? colors[selectedColorIdx] || colors[0] : null;

  const colorImageUrl = selectedColor && Array.isArray(selectedColor.images) && selectedColor.images.length > 0 
    ? selectedColor.images[0] 
    : null;

  const baseImageUrl = (Array.isArray(product.images) && product.images[0]) || 
    product.imageUrl || 
    product.image_url || 
    null;

  const displayImageUrl = colorImageUrl || baseImageUrl;

  const targetUrl = hasMultipleColors && selectedColorIdx > 0
    ? `/product/${product.id}?colorIndex=${selectedColorIdx}`
    : `/product/${product.id}`;

  const offerPrice = Number(product.price || 0);
  const originalPrice = product.originalPrice ? Number(product.originalPrice) : null;
  const hasDiscount = originalPrice && originalPrice > offerPrice;
  const discountPercentage = product.discountPercentage || (hasDiscount ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100) : 0);

  // Remove unnecessary decimal places when the price is a whole number
  const formatPrice = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '';
    const n = Number(val);
    return n % 1 === 0
      ? n.toLocaleString('en-IN')
      : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const priceFormatted = formatPrice(offerPrice);
  const originalFormatted = originalPrice ? formatPrice(originalPrice) : null;

  // Stock availability indicator using existing stock data
  const isOutOfStock = product.inStock === false || product.stock === 0 || product.stock_quantity === 0 || product.inventory === 0;
  const isLowStock = !isOutOfStock && ((product.stock !== undefined && product.stock !== null && product.stock <= 5) || (product.stock_quantity !== undefined && product.stock_quantity !== null && product.stock_quantity <= 5));
  const stockCount = product.stock ?? product.stock_quantity;

  const handleClick = () => {
    try {
      sessionStorage.setItem('home_scroll_y', String(window.scrollY || window.pageYOffset || 0));
    } catch {}
  };

  // 1. Amazon-Style List Row Layout (For Search Results: 1 product per row)
  if (layout === 'list') {
    return (
      <Link 
        to={targetUrl} 
        className="product-card-list"
        onClick={handleClick}
        aria-label={`View details for ${product.name}`}
      >
        <div className="product-list-image-container">
          {hasDiscount && (
            <span className="product-discount-badge list-discount-badge">{discountPercentage}% OFF</span>
          )}
          {displayImageUrl ? (
            <img 
              src={displayImageUrl} 
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
        </div>

        <div className="product-list-info">
          <div className="product-list-header">
            {product.category && (
              <span className="product-list-category">{product.category}</span>
            )}
            <h3 className="product-list-name">{product.name}</h3>
          </div>

          {/* Color Options: ONLY rendered if multiple colors (> 1) are available */}
          {hasMultipleColors && (
            <div className="product-card-colors-section">
              <div className="product-card-swatches-row">
                {colors.map((c, idx) => {
                  const isSelected = selectedColorIdx === idx;
                  const firstImg = Array.isArray(c.images) && c.images.length > 0 ? c.images[0] : null;

                  return (
                    <button
                      key={c.id || idx}
                      type="button"
                      className={`card-color-swatch-btn ${isSelected ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedColorIdx(idx);
                      }}
                      title={c.name || `Color ${idx + 1}`}
                      aria-label={`Select color ${c.name || idx + 1}`}
                    >
                      {firstImg ? (
                        <img 
                          src={firstImg} 
                          alt={c.name || 'Color'} 
                          className="card-swatch-img" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <span 
                        className="card-swatch-dot" 
                        style={{ 
                          backgroundColor: c.colorCode || '#2563eb',
                          display: firstImg ? 'none' : 'block' 
                        }} 
                      />
                    </button>
                  );
                })}
              </div>
              <span className="card-colors-text-label">
                {colors.length} colors{selectedColor?.name ? ` • ${selectedColor.name}` : ''}
              </span>
            </div>
          )}

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

          <div className="product-list-delivery-row">
            <div className="product-list-delivery">
              <Truck size={14} className="list-delivery-icon" />
              <span className="list-delivery-text">FREE Delivery</span>
            </div>

            <div className="product-card-stock-row list-stock-inline">
              {isOutOfStock ? (
                <span className="stock-badge out-of-stock">
                  <span className="stock-dot"></span> Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="stock-badge low-stock">
                  <span className="stock-dot"></span> Only {stockCount} left
                </span>
              ) : (
                <span className="stock-badge in-stock">
                  <span className="stock-dot"></span> In Stock
                </span>
              )}
            </div>
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

  // 2. Standard Grid Layout (For Homepage Catalog)
  return (
    <Link 
      to={targetUrl} 
      className="product-card"
      onClick={handleClick}
      aria-label={`View details for ${product.name}`}
    >
      <div className="product-image-container">
        {hasDiscount && (
          <span className="product-discount-badge">{discountPercentage}% OFF</span>
        )}
        {displayImageUrl ? (
          <img 
            src={displayImageUrl} 
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
      </div>

      <div className="product-info">
        <h3 className="product-name" title={product.name}>{product.name}</h3>

        {/* Color Options: Swatches if multiple colors (> 1), or reserved height slot for row alignment */}
        <div className="product-card-colors-container">
          {hasMultipleColors ? (
            <div className="product-card-colors-section product-grid-colors-section">
              <div className="product-card-swatches-row">
                {colors.slice(0, 4).map((c, idx) => {
                  const isSelected = selectedColorIdx === idx;
                  const firstImg = Array.isArray(c.images) && c.images.length > 0 ? c.images[0] : null;

                  return (
                    <button
                      key={c.id || idx}
                      type="button"
                      className={`card-color-swatch-btn ${isSelected ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedColorIdx(idx);
                      }}
                      title={c.name || `Color ${idx + 1}`}
                      aria-label={`Select color ${c.name || idx + 1}`}
                    >
                      {firstImg ? (
                        <img 
                          src={firstImg} 
                          alt={c.name || 'Color'} 
                          className="card-swatch-img" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <span 
                        className="card-swatch-dot" 
                        style={{ 
                          backgroundColor: c.colorCode || '#2563eb',
                          display: firstImg ? 'none' : 'block' 
                        }} 
                      />
                    </button>
                  );
                })}
                {colors.length > 4 && (
                  <span className="card-colors-more-pill">+{colors.length - 4}</span>
                )}
              </div>
              <span className="card-colors-text-label">
                {colors.length} colors
              </span>
            </div>
          ) : (
            <div className="card-colors-empty-slot" aria-hidden="true" />
          )}
        </div>
        
        {/* Pricing Wrap - Consistent height across cards */}
        <div className="product-pricing-wrap">
          <div className="card-prices-line">
            <span className="product-price">₹{priceFormatted}</span>
            {hasDiscount && (
              <span className="product-original-price">₹{originalFormatted}</span>
            )}
          </div>
        </div>

        {/* Stock Availability Indicator */}
        <div className="product-card-stock-row">
          {isOutOfStock ? (
            <span className="stock-badge out-of-stock">
              <span className="stock-dot"></span> Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="stock-badge low-stock">
              <span className="stock-dot"></span> Only {stockCount} left
            </span>
          ) : (
            <span className="stock-badge in-stock">
              <span className="stock-dot"></span> In Stock
            </span>
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
