import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/api';

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Employee',
    employee_id: '',
    department: '',
    designation: '',
    phone_number: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.full_name || !formData.email || !formData.password) {
      setError('Full name, email and password are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!formData.employee_id || !formData.department || !formData.designation || !formData.phone_number) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      await register(submitData);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Expert Decision Replay</h1>
        <h2 style={styles.subtitle}>Register</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name *</label>
              <input name="full_name" value={formData.full_name}
                onChange={handleChange} style={styles.input}
                placeholder="Full Name" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email *</label>
              <input name="email" type="email" value={formData.email}
                onChange={handleChange} style={styles.input}
                placeholder="Email" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password *</label>
              <input name="password" type="password" value={formData.password}
                onChange={handleChange} style={styles.input}
                placeholder="Password (min 8 chars)" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Confirm Password *</label>
              <input name="confirmPassword" type="password" value={formData.confirmPassword}
                onChange={handleChange} style={styles.input}
                placeholder="Confirm Password" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Role *</label>
              <select name="role" value={formData.role}
                onChange={handleChange} style={styles.input}>
                <option value="Employee">Employee</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Manager">Manager</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Employee ID *</label>
              <input name="employee_id" value={formData.employee_id}
                onChange={handleChange} style={styles.input}
                placeholder="Employee ID" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Department *</label>
              <input name="department" value={formData.department}
                onChange={handleChange} style={styles.input}
                placeholder="Department" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Designation *</label>
              <input name="designation" value={formData.designation}
                onChange={handleChange} style={styles.input}
                placeholder="Designation" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Phone Number *</label>
              <input name="phone_number" value={formData.phone_number}
                onChange={handleChange} style={styles.input}
                placeholder="Phone Number" />
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p style={styles.link}>
          Already have an account?{' '}
          <span style={styles.linkText} onClick={() => navigate('/login')}>
            Login
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
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '600px',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  field: {
    marginBottom: '4px',
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
    marginTop: '16px',
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