import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice } from '../data/products';
import { useCart } from '../context/CartContext';

const PAYMENT_METHODS = ['Cash on Delivery', 'UPI', 'Credit / Debit Card', 'Net Banking'];

export default function Checkout() {
  const { items, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    payment: PAYMENT_METHODS[0],
  });
  const [error, setError] = useState('');

  if (items.length === 0) {
    return (
      <div className="container page">
        <h1>Checkout</h1>
        <p className="empty-state">Your cart is empty.</p>
        <Link to="/" className="btn btn-primary">
          Go to Home
        </Link>
      </div>
    );
  }

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Please fill in name, phone, and address.');
      return;
    }
    const orderId = `MM${Date.now().toString().slice(-8)}`;
    const order = {
      orderId,
      ...form,
      items: [...items],
      total: cartTotal,
      placedAt: new Date().toISOString(),
    };
    sessionStorage.setItem('mehtamart-last-order', JSON.stringify(order));
    clearCart();
    navigate('/order-confirmation', { state: { order } });
  };

  return (
    <div className="container page checkout-page">
      <h1>Checkout</h1>
      <div className="checkout-layout">
        <form className="checkout-form card" onSubmit={handleSubmit}>
          <h2>Delivery details</h2>
          {error && <p className="form-error">{error}</p>}
          <label>
            Full name
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            Phone number
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Delivery address
            <textarea
              name="address"
              rows={4}
              value={form.address}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Payment method
            <select name="payment" value={form.payment} onChange={handleChange}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary btn-block">
            Place Order
          </button>
        </form>
        <aside className="checkout-summary card">
          <h2>Your order</h2>
          <ul className="checkout-items">
            {items.map((i) => (
              <li key={i.productId}>
                <span>
                  {i.name} × {i.quantity}
                </span>
                <span>{formatPrice(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatPrice(cartTotal)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
