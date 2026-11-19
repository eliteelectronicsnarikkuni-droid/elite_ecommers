import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../services/productService';
import { ArrowLeft, MessageCircle } from 'lucide-react';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadProduct = async () => {
      setLoading(true);
      try {
        const { product: data } = await getProductById(id);
        if (isMounted) {
          setProduct(data);
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
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading product details...</p>
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
  const priceFormatted = Number(product.price || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const imageUrl = product.imageUrl || product.image_url || 'https://via.placeholder.com/800x600?text=No+Image';

  const handleBuyNow = () => {
    const whatsappNumber = '9447210273';
    const message = `Hello! I'm interested in buying the following product:

*Name:* ${product.name}
*Price:* ₹${priceFormatted}
*Category:* ${product.category}

*Features:*
${features.map(f => `- ${f}`).join('\n')}

*Image:* ${imageUrl}

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
        <div className="detail-image-section">
          <img src={imageUrl} alt={product.name} className="detail-image" />
        </div>

        <div className="detail-info-section">
          <div className="category-badge">{product.category}</div>
          <h1 className="detail-title">{product.name}</h1>
          <p className="detail-price">₹{priceFormatted}</p>

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

          <button className="buy-now-btn" onClick={handleBuyNow}>
            <MessageCircle size={20} /> Buy Now via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
