import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../services/productService';
import { ArrowLeft, MessageCircle, Tag, ChevronLeft, ChevronRight, Camera, Zap } from 'lucide-react';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveImageIndex(0);
    let isMounted = true;
    const loadProduct = async () => {
      setLoading(true);
      try {
        const { product: data } = await getProductById(id);
        if (isMounted) {
          setProduct(data);
          setActiveImageIndex(0);
          window.scrollTo(0, 0);
        }
      } catch (err) {
        console.error('Error loading product details:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="product-detail-container">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={20} /> Back to Shop
        </button>

        <div className="product-detail-grid skeleton-detail-grid">
          <div className="detail-image-section">
            <div className="detail-main-image-wrapper skeleton-shimmer-box">
              <div className="skeleton-detail-photo shimmer"></div>
            </div>
            <div className="detail-thumbnails-strip">
              {[1, 2, 3].map((n) => (
                <div key={n} className="detail-thumbnail-item skeleton-thumb-slot shimmer"></div>
              ))}
            </div>
          </div>

          <div className="detail-info-section">
            <div className="skeleton-line shimmer badge-pill"></div>
            <div className="skeleton-line shimmer title-main"></div>
            <div className="skeleton-line shimmer title-sub"></div>
            <div className="skeleton-pricing-card shimmer"></div>
            <div className="skeleton-line shimmer text-block"></div>
            <div className="skeleton-line shimmer text-block short"></div>
            <div className="skeleton-buy-btn shimmer"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="not-found">
        <h2>Product not found</h2>
        <button onClick={() => navigate('/')} className="back-btn" style={{ marginTop: '1rem' }}>
          Go back home
        </button>
      </div>
    );
  }

  const features = Array.isArray(product.features) ? product.features : [];
  
  // Multi-image gallery list (up to 5 images)
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.imageUrl || product.image_url || 'https://via.placeholder.com/800x600?text=No+Image'];

  const currentImageUrl = images[activeImageIndex] || images[0];

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Pricing calculations
  const offerPrice = Number(product.price || 0);
  const originalPrice = product.originalPrice ? Number(product.originalPrice) : null;
  const hasDiscount = originalPrice && originalPrice > offerPrice;
  const discountPercentage = product.discountPercentage || (hasDiscount ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100) : 0);
  const savings = hasDiscount ? (originalPrice - offerPrice) : 0;

  const offerPriceFormatted = offerPrice.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const originalPriceFormatted = originalPrice
    ? originalPrice.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : null;
  const savingsFormatted = savings.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const handleBuyNow = () => {
    const whatsappNumber = '9447210273';
    const priceDescription = hasDiscount
      ? `₹${offerPriceFormatted} (Original MRP: ₹${originalPriceFormatted} - ${discountPercentage}% OFF)`
      : `₹${offerPriceFormatted}`;

    const message = `Hello! I'm interested in buying the following product:

*Name:* ${product.name}
*Price:* ${priceDescription}
*Category:* ${product.category}

*Features:*
${features.map(f => `- ${f}`).join('\n')}

*Product Link & Images:*
${images.map((img, i) => `Photo ${i + 1}: ${img}`).join('\n')}

Is this item currently available?`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="product-detail-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ArrowLeft size={20} /> Back to Shop
      </button>

      <div className="product-detail-grid">
        {/* Flipkart / Amazon Style Gallery */}
        <div className="detail-image-section">
          <div className="detail-main-image-wrapper">
            <img 
              src={currentImageUrl} 
              alt={`${product.name} - View ${activeImageIndex + 1}`} 
              className="detail-image" 
              fetchPriority="high"
              decoding="async"
            />

            {images.length > 1 && (
              <>
                <button 
                  type="button" 
                  className="gallery-nav-btn prev" 
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={22} />
                </button>
                <button 
                  type="button" 
                  className="gallery-nav-btn next" 
                  onClick={handleNextImage}
                  aria-label="Next image"
                >
                  <ChevronRight size={22} />
                </button>
                <div className="gallery-counter-badge">
                  <Camera size={13} /> {activeImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Preview Strip (up to 5 images) */}
          {images.length > 1 && (
            <div className="detail-thumbnails-strip">
              {images.map((imgUrl, index) => (
                <button
                  key={index}
                  type="button"
                  className={`detail-thumbnail-item ${activeImageIndex === index ? 'active' : ''}`}
                  onClick={() => setActiveImageIndex(index)}
                  onMouseEnter={() => setActiveImageIndex(index)}
                  title={`View image ${index + 1}`}
                >
                  <img 
                    src={imgUrl} 
                    alt={`${product.name} thumbnail ${index + 1}`} 
                    loading="lazy" 
                    decoding="async" 
                  />
                  <span className="thumbnail-num-tag">{index + 1}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info-section">
          <div className="category-badge">{product.category}</div>

          <h1 className="detail-title">{product.name}</h1>

          {/* Pricing area with Actual Price, Offer Price & Calculated Percentage */}
          <div className="detail-pricing-card">
            <div className="detail-price-breakdown">
              <div className="price-item-col offer-price-col">
                <span className="price-type-label">Offer Price</span>
                <span className="detail-offer-price">₹{offerPriceFormatted}</span>
              </div>

              {hasDiscount && (
                <div className="price-item-col actual-price-col">
                  <span className="price-type-label">Actual Price (MRP)</span>
                  <span className="detail-original-price">₹{originalPriceFormatted}</span>
                </div>
              )}

              {hasDiscount && (
                <div className="price-item-col discount-badge-col">
                  <span className="detail-discount-tag">
                    <Tag size={14} /> {discountPercentage}% OFF
                  </span>
                </div>
              )}
            </div>

            {hasDiscount && (
              <p className="detail-savings-text">
                🎉 Special Deal! You save <strong>₹{savingsFormatted}</strong> ({discountPercentage}% OFF MRP)
              </p>
            )}
          </div>

          <div className="detail-description">
            <h3>Description</h3>
            <p>{product.description}</p>
          </div>

          {features.length > 0 && (
            <div className="detail-ingredients">
              <h3>Key Features</h3>
              <ul className="ingredients-list">
                {features.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Non-Scrollable WhatsApp Buy Bar (Only One Button - Active on All Display Devices) */}
      <div className="fixed-sticky-buy-bar">
        <div className="sticky-buy-bar-inner">
          <div className="sticky-product-summary">
            <img 
              src={currentImageUrl} 
              alt={product.name} 
              className="sticky-product-thumb" 
            />
            <div className="sticky-details">
              <span className="sticky-product-name">{product.name}</span>
              <div className="sticky-price-row">
                <span className="sticky-offer-price">₹{offerPriceFormatted}</span>
                {hasDiscount && (
                  <>
                    <span className="sticky-actual-price">₹{originalPriceFormatted}</span>
                    <span className="sticky-discount-pill">{discountPercentage}% OFF</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button className="whatsapp-buy-now-sticky-btn" onClick={handleBuyNow} type="button">
            <MessageCircle size={22} className="wa-icon" />
            <span>Buy Now via WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
