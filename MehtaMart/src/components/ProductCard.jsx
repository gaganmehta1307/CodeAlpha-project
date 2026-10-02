import { Link } from 'react-router-dom';
import { formatPrice } from '../data/products';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  const handleAdd = (e) => {
    e.preventDefault();
    addToCart(product);
  };

  return (
    <article className="product-card">
      <Link to={`/product/${product.id}`} className="product-card-link">
        <div className="product-image-wrap">
          <img src={product.image} alt={product.name} loading="lazy" />
          <span className="product-category">{product.category}</span>
        </div>
        <div className="product-body">
          <h3>{product.name}</h3>
          <p className="product-price">{formatPrice(product.price)}</p>
        </div>
      </Link>
      <button type="button" className="btn btn-primary btn-block" onClick={handleAdd}>
        Add to Cart
      </button>
    </article>
  );
}
