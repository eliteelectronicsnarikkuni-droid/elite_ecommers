import { Link } from 'react-router-dom';

const ProductCard = ({ product }) => {
  const imageUrl = product.imageUrl || product.image_url || 'https://via.placeholder.com/600x400?text=No+Image';
  const price = Number(product.price || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-image-container">
        <img src={imageUrl} alt={product.name} className="product-image" loading="lazy" />
        <div className="product-category">{product.category}</div>
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-price">₹{price}</p>
        <span className="view-details-btn">
          View Details
        </span>
      </div>
    </Link>
  );
};

export default ProductCard;
