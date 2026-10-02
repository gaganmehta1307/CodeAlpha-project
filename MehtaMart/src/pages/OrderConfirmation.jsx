import { Link, useLocation } from 'react-router-dom';
import { formatPrice } from '../data/products';

export default function OrderConfirmation() {
  const { state } = useLocation();
  let order = state?.order;
  if (!order) {
    try {
      const raw = sessionStorage.getItem('mehtamart-last-order');
      order = raw ? JSON.parse(raw) : null;
    } catch {
      order = null;
    }
  }

  if (!order) {
    return (
      <div className="container page">
        <p className="empty-state">No order found.</p>
        <Link to="/" className="btn btn-primary">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container page confirmation-page">
      <div className="confirmation-card card">
        <div className="confirmation-icon" aria-hidden="true">
          ✓
        </div>
        <h1>Order Placed!</h1>
        <p>Thank you, {order.name}. Your order has been received.</p>
        <p className="order-id">
          Order ID: <strong>{order.orderId}</strong>
        </p>
        <ul className="confirmation-details">
          <li>
            <span>Phone</span>
            <span>{order.phone}</span>
          </li>
          <li>
            <span>Address</span>
            <span>{order.address}</span>
          </li>
          <li>
            <span>Payment</span>
            <span>{order.payment}</span>
          </li>
          <li>
            <span>Total paid</span>
            <span>{formatPrice(order.total)}</span>
          </li>
        </ul>
        <Link to="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
