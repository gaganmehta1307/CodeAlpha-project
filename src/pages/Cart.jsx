import { Link } from 'react-router-dom';
import { formatPrice } from '../data/products';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { items, updateQuantity, removeFromCart, cartTotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="container page cart-page">
        <h1>Your Cart</h1>
        <p className="empty-state">Your cart is empty. Start shopping!</p>
        <Link to="/" className="btn btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container page cart-page">
      <h1>Your Cart</h1>
      <div className="cart-layout">
        <ul className="cart-list">
          {items.map((item) => (
            <li key={item.productId} className="cart-item">
              <img src={item.image} alt="" />
              <div className="cart-item-info">
                <Link to={`/product/${item.productId}`}>{item.name}</Link>
                <p>{formatPrice(item.price)} each</p>
              </div>
              <div className="qty-controls">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => updateQuantity(item.productId, -1)}
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => updateQuantity(item.productId, 1)}
                >
                  +
                </button>
              </div>
              <p className="line-total">{formatPrice(item.price * item.quantity)}</p>
              <button
                type="button"
                className="btn-remove"
                onClick={() => removeFromCart(item.productId)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <aside className="cart-summary">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(cartTotal)}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatPrice(cartTotal)}</span>
          </div>
          <Link to="/checkout" className="btn btn-primary btn-block">
            Proceed to Checkout
          </Link>
          <Link to="/" className="btn btn-ghost btn-block">
            Continue Shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
