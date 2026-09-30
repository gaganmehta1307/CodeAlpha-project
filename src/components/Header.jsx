import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { cartCount } = useCart();
  const { user, logout } = useAuth();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          <span className="logo-icon" aria-hidden="true">
            M
          </span>
          <span className="logo-text">MehtaMart</span>
        </Link>

        <nav className="main-nav" aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/cart">
            Cart
            {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
          </NavLink>
          {user ? (
            <>
              <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>
              <button type="button" className="btn-link" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register" className="nav-cta">
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
