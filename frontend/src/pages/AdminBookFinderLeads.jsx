import React, { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getApiUrl } from '../utils/api.js';

const TYPE_LABEL = { parent: 'Parent', teacher: 'Teacher', school: 'School' };
const CLASS_LABEL = {
  early: 'Playgroup & Nursery', kg: 'LKG & UKG', primary1: 'Class 1 & 2', primary2: 'Class 3 & 4', middle: 'Class 5 & 6'
};

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function AdminBookFinderLeads({ navigate }) {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const API_URL = getApiUrl();

  const [filters, setFilters] = useState({ user_type: '', class: '', from: '', to: '' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const queryString = (f) => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString();
  };

  // Get a token, or send the person to log in again. Returns null when the page should stop.
  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently();
    } catch {
      loginWithRedirect({ appState: { returnTo: '/admin/leads' } });
      return null;
    }
  }, [getAccessTokenSilently, loginWithRedirect]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/book-finder-leads?${queryString(filters)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 403) return navigate('/');
      if (res.status === 401) return loginWithRedirect({ appState: { returnTo: '/admin/leads' } });
      if (!res.ok) throw new Error(`Could not load leads (${res.status}).`);
      setRows(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL, filters, getToken, loginWithRedirect, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // The CSV needs the login token, so fetch it and save it as a file
  const downloadCsv = async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/api/admin/book-finder-leads.csv?${queryString(filters)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) { setError(`CSV download failed (${res.status}).`); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `book-finder-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const field = { padding: '10px 12px', minHeight: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem' };

  return (
    <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px 60px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: 0 }}>Book Finder leads</h1>
          <p style={{ color: 'var(--dark-light)', margin: '4px 0 0' }}>Newest first. Showing up to 500 rows.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ minHeight: '44px' }}>← Dashboard</button>
          <button onClick={downloadCsv} className="btn btn-primary" style={{ minHeight: '44px' }}>Download CSV</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
        <label style={{ display: 'grid', gap: '4px', fontSize: '0.85rem' }}>Type
          <select value={filters.user_type} onChange={e => setFilters({ ...filters, user_type: e.target.value })} style={field}>
            <option value="">All</option>
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
            <option value="school">School</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: '4px', fontSize: '0.85rem' }}>Class
          <select value={filters.class} onChange={e => setFilters({ ...filters, class: e.target.value })} style={field}>
            <option value="">All</option>
            {Object.entries(CLASS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: '4px', fontSize: '0.85rem' }}>From
          <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} style={field} />
        </label>
        <label style={{ display: 'grid', gap: '4px', fontSize: '0.85rem' }}>To
          <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} style={field} />
        </label>
      </div>

      {error && <p role="alert" style={{ color: 'var(--error)', fontWeight: 600 }}>{error}</p>}
      {loading && <p role="status">Loading…</p>}

      {!loading && rows.length === 0 && <p>No leads match these filters yet.</p>}

      {!loading && rows.length > 0 && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                {['Date', 'Email', 'Name', 'Type', 'Classes', 'Focus', 'School', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                  <td style={{ padding: '10px' }}>{r.email}</td>
                  <td style={{ padding: '10px' }}>{r.name || '—'}</td>
                  <td style={{ padding: '10px' }}>{TYPE_LABEL[r.user_type] || r.user_type}</td>
                  <td style={{ padding: '10px' }}>{(r.class_bands || '').split(',').map(k => CLASS_LABEL[k] || k).join(', ')}</td>
                  <td style={{ padding: '10px' }}>{r.focus_areas || 'Everything'}</td>
                  <td style={{ padding: '10px' }}>
                    {r.user_type === 'school'
                      ? `${r.school_name}, ${r.school_city} · ${r.school_phone} · ${r.school_students} students`
                      : '—'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {r.unsubscribed_at ? 'Unsubscribed' : r.converted ? 'Ordered' : 'Open'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
