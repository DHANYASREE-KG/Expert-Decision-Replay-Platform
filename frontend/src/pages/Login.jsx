import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    try {
            const response = await login({ email, password });
      const token = response.data.access_token;

      // Decode user info from token
      const payload = JSON.parse(atob(token.split('.')[1]));

      // Get user details
      const userResponse = await fetch(`http://127.0.0.1:8000/users/${payload.sub}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userResponse.json();
      console.log('User data:', userData);
      console.log('User role:', userData.role);
      loginUser(token, userData);

           loginUser(token, userData);

      // Redirect based on role
      const role = userData.role;
      setTimeout(() => {
        if (role === 'Administrator') navigate('/admin');
        else if (role === 'Manager') navigate('/manager');
        else navigate('/dashboard');
      }, 100);

    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Expert Decision Replay</h1>
        <h2 style={styles.subtitle}>Login</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="Enter your email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={styles.link}>
          Don't have an account?{' '}
          <span style={styles.linkText} onClick={() => navigate('/register')}>
            Register
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    width: '400px',
  },
  title: {
    textAlign: 'center',
    color: '#2C3E50',
    fontSize: '22px',
    marginBottom: '8px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: '16px',
    marginBottom: '24px',
  },
  error: {
    backgroundColor: '#fde8e8',
    color: '#c0392b',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    color: '#2C3E50',
    fontWeight: '600',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2C3E50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  link: {
    textAlign: 'center',
    marginTop: '16px',
    fontSize: '14px',
    color: '#7f8c8d',
  },
  linkText: {
    color: '#2980b9',
    cursor: 'pointer',
    fontWeight: '600',
  },
};