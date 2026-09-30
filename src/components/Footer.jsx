export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <p className="footer-brand">MehtaMart</p>
          <p className="footer-tagline">
            Your trusted online store for electronics, fashion, grocery, and more.
          </p>
        </div>
        <div>
          <h3>About</h3>
          <ul>
            <li>
              <a href="#about">Our Story</a>
            </li>
            <li>
              <a href="#about">Careers</a>
            </li>
            <li>
              <a href="#about">Privacy Policy</a>
            </li>
          </ul>
        </div>
        <div>
          <h3>Contact</h3>
          <ul>
            <li>
              <a href="mailto:support@mehtamart.com">support@mehtamart.com</a>
            </li>
            <li>
              <a href="tel:+919876543210">+91 98765 43210</a>
            </li>
            <li>Mumbai, India</li>
          </ul>
        </div>
        <div>
          <h3>Follow us</h3>
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noreferrer">
              Facebook
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer">
              Twitter
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <p>© {new Date().getFullYear()} MehtaMart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
