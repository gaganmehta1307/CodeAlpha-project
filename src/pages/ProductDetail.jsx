import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatPrice, getProductById } from '../data/products';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const product = getProductById(id);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  if (!product) {
    return (
      <div className="container page">
        <p className="empty-state">Product not found.</p>
        <Link to="/" className="btn btn-secondary">
          Back to Home
        </Link>
      </div>
    );
  }

  const handleAdd = () => addToCart(product);

  const handleBuyNow = () => {
    addToCart(product);
    navigate('/cart');
  };

  return (
    <div className="container page product-detail">
      <Link to="/" className="back-link">
        ← Back to shop
      </Link>
      <div className="detail-layout">
        <div className="detail-image">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="detail-info">
          <span className="product-category">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p className="detail-desc">{product.description}</p>
          <div className="detail-actions">
            <button type="button" className="btn btn-primary" onClick={handleAdd}>
              Add to Cart
            </button>
            <button type="button" className="btn btn-outline" onClick={handleBuyNow}>
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
