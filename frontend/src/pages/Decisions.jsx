import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDecisions, deleteDecision, submitDecision } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Decisions() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      const response = await getDecisions();
      setDecisions(response.data);
    } catch (err) {
      setError('Failed to load decisions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this decision?')) return;
    try {
      await deleteDecision(id);
      setDecisions(decisions.filter(d => d.id !== id));
    } catch (err) {
      alert('Failed to delete decision');
    }
  };

  const handleSubmit = async (id) => {
    if (!window.confirm('Submit this decision for review?')) return;
    try {
      await submitDecision(id);
      fetchDecisions();
      alert('Decision submitted for review!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit decision');
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': '#f39c12',
      'Under Review': '#3498db',
      'Approved': '#27ae60',
      'Rejected': '#e74c3c',
      'Archived': '#95a5a6',
    };
    return colors[status] || '#95a5a6';
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
        <div style={styles.header}>
          <h2 style={styles.title}>My Decisions</h2>
          <button style={styles.createBtn} onClick={() => navigate('/decisions/create')}>
            + Create Decision
          </button>
        </div>

        {loading && <div style={styles.center}>Loading decisions...</div>}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && !error && decisions.length === 0 && (
          <div style={styles.empty}>
            <p>No decisions found.</p>
            <button style={styles.createBtn} onClick={() => navigate('/decisions/create')}>
              Create your first decision
            </button>
          </div>
        )}

        {!loading && decisions.length > 0 && (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((decision) => (
                  <tr key={decision.id} style={styles.tableRow}>
                    <td style={styles.td}>{decision.id}</td>
                    <td style={styles.td}>{decision.title}</td>
                    <td style={styles.td}>{decision.category}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: getStatusColor(decision.status)
                      }}>
                        {decision.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {new Date(decision.created_at).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionBtns}>
                        <button style={styles.viewBtn}
                          onClick={() => navigate(`/decisions/${decision.id}`)}>
                          View
                        </button>
                        {decision.status === 'Draft' && (
                          <>
                            <button style={styles.editBtn}
                              onClick={() => navigate(`/decisions/${decision.id}/edit`)}>
                              Edit
                            </button>
                            <button style={styles.submitBtn}
                              onClick={() => handleSubmit(decision.id)}>
                              Submit
                            </button>
                            <button style={styles.deleteBtn}
                              onClick={() => handleDelete(decision.id)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  content: { padding: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { color: '#2C3E50', fontSize: '24px', margin: 0 },
  createBtn: {
    padding: '10px 20px', backgroundColor: '#2C3E50',
    color: 'white', border: 'none', borderRadius: '6px',
    cursor: 'pointer', fontSize: '14px'
  },
  tableContainer: {
    backgroundColor: 'white', borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden'
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { backgroundColor: '#f8f9fa' },
  th: { padding: '14px 16px', textAlign: 'left', color: '#7f8c8d', fontSize: '13px', fontWeight: '600' },
  tableRow: { borderBottom: '1px solid #eee' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#2C3E50' },
  badge: {
    padding: '4px 10px', borderRadius: '20px',
    color: 'white', fontSize: '12px', fontWeight: '600'
  },
  actionBtns: { display: 'flex', gap: '8px' },
  viewBtn: { padding: '6px 12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  editBtn: { padding: '6px 12px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  submitBtn: { padding: '6px 12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  deleteBtn: { padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  error: { backgroundColor: '#fde8e8', color: '#c0392b', padding: '16px', borderRadius: '8px' },
  empty: { textAlign: 'center', padding: '60px', color: '#7f8c8d' },
  center: { textAlign: 'center', padding: '60px', color: '#7f8c8d' },
};