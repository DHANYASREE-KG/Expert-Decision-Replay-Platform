import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getDecision, getAlternatives, getVersions,
  getHistory, submitDecision, compareAlternatives,
  getThreads
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DecisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  const [decision, setDecision] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [versions, setVersions] = useState([]);
  const [history, setHistory] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      const [decRes, altRes, verRes, hisRes, thrRes] = await Promise.all([
        getDecision(id),
        getAlternatives(id),
        getVersions(id),
        getHistory(id),
        getThreads(id),
      ]);
      setDecision(decRes.data);
      setAlternatives(altRes.data);
      setVersions(verRes.data);
      setHistory(hisRes.data.history || []);
      setThreads(thrRes.data);
    } catch (err) {
      setError('Failed to load decision details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit this decision for review?')) return;
    try {
      await submitDecision(id);
      fetchAll();
      alert('Decision submitted for review!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit');
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': '#f39c12', 'Under Review': '#3498db',
      'Approved': '#27ae60', 'Rejected': '#e74c3c', 'Archived': '#95a5a6',
    };
    return colors[status] || '#95a5a6';
  };

  if (loading) return <div style={styles.center}>Loading decision...</div>;
  if (error) return <div style={styles.center}>{error}</div>;

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
        {/* Header */}
        <div style={styles.header}>
          <div>
            <button style={styles.backBtn} onClick={() => navigate('/decisions')}>← Back</button>
            <h2 style={styles.title}>{decision?.title}</h2>
            <span style={{...styles.badge, backgroundColor: getStatusColor(decision?.status)}}>
              {decision?.status}
            </span>
          </div>
          <div style={styles.headerActions}>
            {decision?.status === 'Draft' && (
              <>
                <button style={styles.editBtn}
                  onClick={() => navigate(`/decisions/${id}/edit`)}>
                  Edit
                </button>
                <button style={styles.submitBtn} onClick={handleSubmit}>
                  Submit for Review
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['info', 'alternatives', 'discussions', 'versions', 'history'].map(tab => (
            <button
              key={tab}
              style={{...styles.tab, ...(activeTab === tab ? styles.activeTab : {})}}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={styles.tabContent}>

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div style={styles.card}>
              <h3 style={styles.sectionTitle}>Decision Information</h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Category</span>
                  <span style={styles.infoValue}>{decision?.category}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Status</span>
                  <span style={styles.infoValue}>{decision?.status}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Created By</span>
                  <span style={styles.infoValue}>User #{decision?.created_by}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Created At</span>
                  <span style={styles.infoValue}>
                    {new Date(decision?.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div style={styles.field}>
                <span style={styles.infoLabel}>Problem Statement</span>
                <p style={styles.infoText}>{decision?.problem_statement}</p>
              </div>
              {decision?.rationale && (
                <div style={styles.field}>
                  <span style={styles.infoLabel}>Rationale</span>
                  <p style={styles.infoText}>{decision?.rationale}</p>
                </div>
              )}
            </div>
          )}

          {/* Alternatives Tab */}
          {activeTab === 'alternatives' && (
            <div style={styles.card}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Alternatives ({alternatives.length})</h3>
                <button style={styles.addBtn}
                  onClick={() => navigate(`/decisions/${id}/alternatives/create`)}>
                  + Add Alternative
                </button>
              </div>
              {alternatives.length === 0 ? (
                <p style={styles.empty}>No alternatives added yet.</p>
              ) : (
                <div style={styles.alternativeGrid}>
                  {alternatives.map(alt => (
                    <div key={alt.id} style={styles.altCard}>
                      <h4 style={styles.altTitle}>{alt.name}</h4>
                      <p style={styles.altDesc}>{alt.description}</p>
                      <div style={styles.altStats}>
                        <span style={styles.altStat}>
                          Cost: ${alt.estimated_cost}
                        </span>
                        <span style={styles.altStat}>
                          Feasibility: {alt.feasibility_score}/5
                        </span>
                        <span style={{
                          ...styles.altStat,
                          color: alt.risk_level === 'Low' ? '#27ae60' :
                            alt.risk_level === 'Medium' ? '#f39c12' : '#e74c3c'
                        }}>
                          Risk: {alt.risk_level}
                        </span>
                      </div>
                      <div style={styles.altPros}>
                        <strong>Pros:</strong> {alt.pros}
                      </div>
                      <div style={styles.altCons}>
                        <strong>Cons:</strong> {alt.cons}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Discussions Tab */}
          {activeTab === 'discussions' && (
            <div style={styles.card}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Discussions ({threads.length})</h3>
                <button style={styles.addBtn}
                  onClick={() => navigate(`/decisions/${id}/discussions`)}>
                  + Add Discussion
                </button>
              </div>
              {threads.length === 0 ? (
                <p style={styles.empty}>No discussions yet.</p>
              ) : (
                threads.map(thread => (
                  <div key={thread.id} style={styles.threadCard}>
                    <h4 style={styles.threadTitle}>{thread.title}</h4>
                    <p style={styles.threadContent}>{thread.content}</p>
                    <span style={styles.threadDate}>
                      {new Date(thread.created_at).toLocaleDateString()}
                    </span>
                    <button style={styles.viewCommentsBtn}
                      onClick={() => navigate(`/decisions/${id}/discussions`)}>
                      View Comments
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Versions Tab */}
          {activeTab === 'versions' && (
            <div style={styles.card}>
              <h3 style={styles.sectionTitle}>Version History ({versions.length})</h3>
              {versions.length === 0 ? (
                <p style={styles.empty}>No versions created yet.</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Version</th>
                      <th style={styles.th}>Title</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map(ver => (
                      <tr key={ver.id}>
                        <td style={styles.td}>v{ver.version_number}</td>
                        <td style={styles.td}>{ver.title}</td>
                        <td style={styles.td}>{ver.status}</td>
                        <td style={styles.td}>
                          {new Date(ver.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div style={styles.card}>
              <h3 style={styles.sectionTitle}>Decision Timeline</h3>
              {history.length === 0 ? (
                <p style={styles.empty}>No history available.</p>
              ) : (
                <div style={styles.timeline}>
                  {history.map((item, index) => (
                    <div key={index} style={styles.timelineItem}>
                      <div style={styles.timelineDot} />
                      <div style={styles.timelineContent}>
                        <strong>{item.event}</strong>
                        <p style={styles.timelineDesc}>{item.description}</p>
                        <span style={styles.timelineDate}>
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
  content: { padding: '32px' },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '24px'
  },
  headerActions: { display: 'flex', gap: '12px' },
  backBtn: {
    padding: '6px 14px', backgroundColor: '#ecf0f1',
    border: 'none', borderRadius: '6px', cursor: 'pointer',
    fontSize: '13px', marginBottom: '8px', display: 'block'
  },
  title: { color: '#2C3E50', fontSize: '24px', margin: '8px 0' },
  badge: {
    padding: '4px 12px', borderRadius: '20px',
    color: 'white', fontSize: '12px', fontWeight: '600'
  },
  editBtn: {
    padding: '10px 20px', backgroundColor: '#f39c12',
    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
  },
  submitBtn: {
    padding: '10px 20px', backgroundColor: '#27ae60',
    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
  },
  tabs: { display: 'flex', gap: '4px', marginBottom: '20px' },
  tab: {
    padding: '10px 20px', border: 'none', borderRadius: '6px',
    cursor: 'pointer', backgroundColor: '#ecf0f1',
    color: '#7f8c8d', fontSize: '14px'
  },
  activeTab: { backgroundColor: '#2C3E50', color: 'white' },
  tabContent: {},
  card: {
    backgroundColor: 'white', padding: '24px',
    borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  sectionTitle: { color: '#2C3E50', fontSize: '18px', marginBottom: '16px' },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '16px'
  },
  infoGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px', marginBottom: '20px'
  },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  infoLabel: { color: '#7f8c8d', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { color: '#2C3E50', fontSize: '14px', fontWeight: '500' },
  infoText: { color: '#2C3E50', fontSize: '14px', lineHeight: '1.6', marginTop: '8px' },
  field: { marginBottom: '16px' },
  alternativeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  altCard: {
    border: '1px solid #eee', borderRadius: '8px',
    padding: '16px', backgroundColor: '#f8f9fa'
  },
  altTitle: { color: '#2C3E50', fontSize: '16px', marginBottom: '8px' },
  altDesc: { color: '#7f8c8d', fontSize: '13px', marginBottom: '12px' },
  altStats: { display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' },
  altStat: { fontSize: '12px', fontWeight: '600', color: '#2C3E50' },
  altPros: { fontSize: '13px', color: '#27ae60', marginBottom: '4px' },
  altCons: { fontSize: '13px', color: '#e74c3c' },
  addBtn: {
    padding: '8px 16px', backgroundColor: '#2C3E50',
    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
  },
  threadCard: {
    border: '1px solid #eee', borderRadius: '8px',
    padding: '16px', marginBottom: '12px'
  },
  threadTitle: { color: '#2C3E50', fontSize: '16px', marginBottom: '8px' },
  threadContent: { color: '#7f8c8d', fontSize: '14px', marginBottom: '8px' },
  threadDate: { color: '#95a5a6', fontSize: '12px' },
  viewCommentsBtn: {
    marginLeft: '12px', padding: '4px 12px', backgroundColor: '#3498db',
    color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px', textAlign: 'left', borderBottom: '2px solid #eee', color: '#7f8c8d', fontSize: '13px' },
  td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px' },
  timeline: { position: 'relative', paddingLeft: '24px' },
  timelineItem: { display: 'flex', gap: '16px', marginBottom: '20px', position: 'relative' },
  timelineDot: {
    width: '12px', height: '12px', borderRadius: '50%',
    backgroundColor: '#2C3E50', flexShrink: 0, marginTop: '4px'
  },
  timelineContent: { flex: 1 },
  timelineDesc: { color: '#7f8c8d', fontSize: '13px', margin: '4px 0' },
  timelineDate: { color: '#95a5a6', fontSize: '12px' },
  empty: { color: '#7f8c8d', fontStyle: 'italic', textAlign: 'center', padding: '20px' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' },
};