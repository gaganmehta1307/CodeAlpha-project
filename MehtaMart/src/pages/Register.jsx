import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    const result = register({ name, email, password });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate('/');
  };

  return (
    <div className="container page auth-page">
      <div className="auth-card card">
        <h1>Register</h1>
        <p className="auth-sub">Join MehtaMart today</p>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block">
            Create Account
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
