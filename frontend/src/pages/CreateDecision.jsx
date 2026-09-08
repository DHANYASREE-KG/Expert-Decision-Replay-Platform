import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDecision } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CreateDecision() {
  const [formData, setFormData] = useState({
    title: '',
    problem_statement: '',
    category: '',
    rationale: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.problem_statement || !formData.category) {
      setError('Title, problem statement and category are required');
      return;
    }

    setLoading(true);
    try {
      const response = await createDecision(formData);
      navigate(`/decisions/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create decision');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.navTitle}>Expert Decision Replay</h1>
        <div style={styles.navLinks}>
          <span style={styles.navLink} onClick={() => navigate('/dashboard')}>Dashboard</span>
          <span style={styles.navLink} onClick={() => navigate('/decisions')}>My Decisions</span>
          <span style={styles.navLink} onClick={() => navigate('/decisions/create')}>Create Decision</span>
          <span style={styles.navLink} onClick={() => navigate('/reports')}>Reports</span>
          <span style={styles.navLink} onClick={handleLogout}>Logout</span>
        </div>
      </nav>

      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.title}>Create New Decision</h2>
            <button style={styles.backBtn} onClick={() => navigate('/decisions')}>
              ← Back
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>Decision Title *</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                style={styles.input}
                placeholder="Enter decision title"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">Select Category</option>
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="HR">HR</option>
                <option value="Marketing">Marketing</option>
                <option value="Strategy">Strategy</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Problem Statement *</label>
              <textarea
                name="problem_statement"
                value={formData.problem_statement}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Describe the problem that needs to be solved"
                rows={4}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Rationale</label>
              <textarea
                name="rationale"
                value={formData.rationale}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Explain the rationale behind this decision"
                rows={3}
              />
            </div>

            <div style={styles.buttons}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => navigate('/decisions')}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={styles.submitBtn}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Decision'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f0f2f5' },
  navbar: {
    backgroundColor: '#2C3E50', padding: '16px 32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  navTitle: { color: 'white', fontSize: '20px', margin: 0 },
  navLinks: { display: 'flex', gap: '24px' },
  navLink: { color: 'white', cursor: 'pointer', fontSize: '14px' },
  content: { padding: '32px', maxWidth: '800px', margin: '0 auto' },
  card: {
    backgroundColor: 'white', padding: '32px',
    borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '24px'
  },
  title: { color: '#2C3E50', fontSize: '22px', margin: 0 },
  backBtn: {
    padding: '8px 16px', backgroundColor: '#ecf0f1',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'
  },
  error: {
    backgroundColor: '#fde8e8', color: '#c0392b',
    padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px'
  },
  field: { marginBottom: '20px' },
  label: {
    display: 'block', marginBottom: '6px',
    color: '#2C3E50', fontWeight: '600', fontSize: '14px'
  },
  input: {
    width: '100%', padding: '10px', borderRadius: '6px',
    border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box'
  },
  textarea: {
    width: '100%', padding: '10px', borderRadius: '6px',
    border: '1px solid #ddd', fontSize: '14px',
    boxSizing: 'border-box', resize: 'vertical'
  },
  buttons: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  cancelBtn: {
    padding: '10px 24px', backgroundColor: '#ecf0f1',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'
  },
  submitBtn: {
    padding: '10px 24px', backgroundColor: '#2C3E50',
    color: 'white', border: 'none', borderRadius: '6px',
    cursor: 'pointer', fontSize: '14px'
  },
};