import { Route, Routes } from 'react-router-dom';
import Footer from './components/Footer';
import Header from './components/Header';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Home from './pages/Home';
import Login from './pages/Login';
import OrderConfirmation from './pages/OrderConfirmation';
import ProductDetail from './pages/ProductDetail';
import Register from './pages/Register';

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
