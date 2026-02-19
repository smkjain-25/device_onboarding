import React, { useState, useEffect, useMemo } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import {
  LayoutDashboard,
  Monitor,
  Smartphone,
  Tv,
  Trash2,
  Link,
  Calendar,
  AlertCircle,
  LifeBuoy,
  Building2,
  Eye,
  X,
  Search,
  Lock,
  Unlock
} from 'lucide-react';
import { mockData } from '../dataMock';
import './Dashboard.css';

import GeoDistribution from '../GeoDistribution';
import ActiveDevicesMap from '../ActiveDevicesMap';

const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
};

// Simple Shimmer Component
const Shimmer = ({ width = '100%', height = '2rem' }) => (
  <div className="shimmer" style={{ width, height, borderRadius: '0.25rem' }}></div>
);

function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(new Date('2020-01-01'));
  const [endDate, setEndDate] = useState(new Date());
  const [highVolumeInstitutes, setHighVolumeInstitutes] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Org Type Modal State
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [selectedOrgType, setSelectedOrgType] = useState('');
  const [selectedOrgList, setSelectedOrgList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [codesGeneratedToday, setCodesGeneratedToday] = useState(0);

  // Active devices state (for second map)
  const [activeDevicesData, setActiveDevicesData] = useState({});
  const [activeDevicesLoading, setActiveDevicesLoading] = useState(true);

  // Linking/Delinking stats state
  const [delinkingStats, setDelinkingStats] = useState({ delinking_count: 0, linking_count: 0 });
  const [delinkingStatsLoading, setDelinkingStatsLoading] = useState(false);

  // Metrics state
  const [metrics, setMetrics] = useState({
    registered: 0,
    delinked: 0,
    generated: 0,
    uniqueInstitutes: 0,
    locked: 0,
    trainingTickets: 0,
    orgTypes: {
      counts: { school: 0, coaching: 0, college: 0, corporate: 0, others: 0 },
      lists: { school: [], coaching: [], college: [], corporate: [], others: [] }
    },
    bySource: {
      ifp: 0,
      web: 0,
      mobile: 0,
      other: 0
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setActiveDevicesLoading(true);

      try {
        // 1. Fetch IFP details and Active Devices in parallel
        const [ifpResponse, activeResponse] = await Promise.all([
          fetch('https://app.teachmint.qa/institute-ifps/all/ifps/details'),
          fetch('https://app.teachmint.qa/institute-ifps/active-devices-pincode-wise')
        ]);

        if (!ifpResponse.ok) throw new Error('IFP API failed');
        if (!activeResponse.ok) console.warn('Active devices API failed');

        const ifpResult = await ifpResponse.json();
        const activeResult = activeResponse.ok ? await activeResponse.json() : { obj: {} };

        // Process IFP Data
        let rawData = [];
        if (ifpResult && ifpResult.obj) {
          if (Array.isArray(ifpResult.obj.data)) {
            rawData = ifpResult.obj.data;
            setCodesGeneratedToday(ifpResult.obj.codes_generated_today || 0);
          } else if (Array.isArray(ifpResult.obj)) {
            rawData = ifpResult.obj;
          }
        }

        // Filter out TEST devices (serial number contains "test" case-insensitive)
        rawData = rawData.filter(item => {
          const serial = item.device_serial_no;
          if (serial && typeof serial === 'string') {
            return !serial.toLowerCase().includes('test');
          }
          return true;
        });

        // Process Active Devices Data
        let activeDevicesMap = {};
        if (activeResult && activeResult.status && activeResult.obj) {
          activeDevicesMap = activeResult.obj;
        }
        console.log('ACTIVE DEVICES API:', activeDevicesMap);

        // 2. Extract unique institute IDs from BOTH sources
        const ifpInstituteIds = rawData.map(item => item.institute_id).filter(id => id);
        const activeInstituteIds = Object.keys(activeDevicesMap);
        const allInstituteIds = [...new Set([...ifpInstituteIds, ...activeInstituteIds])];

        // 3. Fetch institute details (SINGLE BATCH CALL)
        let instituteMap = {};
        if (allInstituteIds.length > 0) {
          try {
            const batchResponse = await fetch('https://app.teachmint.qa/institute-ifps/institute/details/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ institute_ids: allInstituteIds })
            });

            if (batchResponse.ok) {
              const batchResult = await batchResponse.json();
              if (batchResult && batchResult.obj) {
                instituteMap = batchResult.obj;
              }
            } else {
              console.warn('Batch institute fetch failed');
            }
          } catch (e) {
            console.warn('Batch fetch error:', e);
          }
        }

        // Helper
        const normalizeTitleCase = (str) => {
          if (!str) return '';
          const upper = str.toUpperCase();
          if (upper === 'IN') return 'India';
          if (upper === 'USA' || upper === 'US' || upper === 'UNITED STATES OF AMERICA') return 'United States';
          if (upper === 'UK' || upper === 'UNITED KINGDOM') return 'United Kingdom';
          if (upper === 'UAE') return 'United Arab Emirates';
          return str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        };

        // 4. Merge Data for Dashboard Metrics/Geo Map
        const mergedData = rawData.map(item => {
          const instId = item.institute_id?.toString().trim();
          const instDetails = instituteMap[instId];
          if (instDetails) {
            const address = item.institute_address || {};
            let rawCountry = instDetails.country || address.country;
            let pincode = instDetails.pincode || address.pincode;

            if ((!rawCountry || rawCountry.toLowerCase() === 'unknown' || rawCountry.toLowerCase() === 'null') &&
              pincode && pincode.toString().length === 6) {
              rawCountry = 'India';
            }
            const country = normalizeTitleCase(rawCountry);

            return {
              ...item,
              institute_name: instDetails.name || item.institute_name,
              institute_address: { ...address, pincode, country },
              pincode,
              country,
              institute_type: instDetails.institution_type || instDetails.institute_type || item.institute_type
            };
          }
          return item;
        });

        // 5. Create Active Devices Pincode Map
        const pincodeDeviceMap = {};
        console.log('Processing Active Devices Map keys:', Object.keys(activeDevicesMap));

        Object.entries(activeDevicesMap).forEach(([key, deviceCount]) => {
          const cleanKey = key.toString().trim(); // Normalize key

          // Check if key is a 6-digit pincode
          if (/^\d{6}$/.test(cleanKey)) {
            pincodeDeviceMap[cleanKey] = (pincodeDeviceMap[cleanKey] || 0) + deviceCount;
          } else {
            // Fallback to existing logic (lookup by institute ID)
            // Try direct lookup first
            let instDetails = instituteMap[cleanKey];

            // If not found, try looking up case-insensitive/trimmed in instituteMap keys
            if (!instDetails) {
              const foundKey = Object.keys(instituteMap).find(k => k.toString().trim() === cleanKey);
              if (foundKey) instDetails = instituteMap[foundKey];
            }

            if (instDetails && instDetails.pincode) {
              const pincode = instDetails.pincode.toString();
              pincodeDeviceMap[pincode] = (pincodeDeviceMap[pincode] || 0) + deviceCount;
            } else {
              console.warn(`Institute details not found for key: "${cleanKey}" (original: "${key}")`);
            }
          }
        });

        setData(mergedData);
        setActiveDevicesData(pincodeDeviceMap);
        setError(null);

      } catch (err) {
        console.error('API Chain Failed:', err);
        setError('Failed to fetch data');
        // Fallback or error handling
      } finally {
        setLoading(false);
        setActiveDevicesLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch linking/delinking stats
  useEffect(() => {
    const fetchDelinkingStats = async () => {
      setDelinkingStatsLoading(true);
      try {
        const startTs = startOfDay(startDate).getTime() / 1000;
        const endTs = new Date(endDate);
        endTs.setHours(23, 59, 59, 999);
        const endTimestamp = endTs.getTime() / 1000;

        const response = await fetch(`https://app.teachmint.qa/institute-ifps/linking-delinking-stats?start_timestamp=${startTs}&end_timestamp=${endTimestamp}`);
        if (!response.ok) throw new Error('Stats API failed');
        const result = await response.json();

        if (result && result.status && result.obj) {
          setDelinkingStats(result.obj);
        }
      } catch (err) {
        console.error('Failed to fetch delinking stats:', err);
      } finally {
        setDelinkingStatsLoading(false);
      }
    };

    fetchDelinkingStats();
  }, [startDate, endDate]);

  // Helper to check if timestamp (in seconds) is within range
  const isWithinRange = (timestamp) => {
    if (!timestamp) return false; // STRICT: Must have a timestamp

    // Handle both seconds and milliseconds
    let ts = Number(timestamp);
    if (isNaN(ts)) return false; // STRICT: Must be a valid number
    if (ts > 10000000000) ts = ts / 1000; // Likely ms, convert to s

    const date = new Date(ts * 1000);
    const start = startOfDay(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  };

  const totalRegistered = useMemo(() => {
    // Show everything by default unless deleted is specifically true
    // AND strictly check for onboarding_setup as per user requirement
    return data.filter(item => item.deleted !== true && item.onboarding_setup === true);
  }, [data]);

  const filteredRegistered = useMemo(() => {
    return totalRegistered.filter(item => isWithinRange(item.c));
  }, [totalRegistered, startDate, endDate]);

  const filteredDelinked = useMemo(() => {
    return data.filter(item => {
      if (!item.deleted) return false;
      return isWithinRange(item.u || item.c);
    });
  }, [data, startDate, endDate]);

  const filteredGenerated = useMemo(() => {
    return data.filter(item => isWithinRange(item.c));
  }, [data, startDate, endDate]);

  const sourceStats = useMemo(() => {
    const stats = { ifp: 0, web: 0, mobile: 0, other: 0 };
    filteredRegistered.forEach(item => {
      const src = item.linking_source;
      if (src === 'IFP') stats.ifp++;
      else if (src === 'ADMIN_WEB') stats.web++;
      else if (src === 'CUSTOMER_ONBOARD_MOBILE') stats.mobile++;
      else stats.other++;
    });
    return stats;
  }, [filteredRegistered]);

  const instituteMetrics = useMemo(() => {
    const stats = {};
    filteredRegistered.forEach(item => {
      if (item.institute_id) {
        if (!stats[item.institute_id]) {
          stats[item.institute_id] = { count: 0, name: item.institute_name || 'Unknown' };
        }
        stats[item.institute_id].count++;
      }
    });

    const unique = Object.keys(stats).length;

    // Threshold updated to 50
    const highVol = Object.entries(stats)
      .map(([id, data]) => ({ id, ...data }))
      .filter(inst => inst.count > 50);

    return { unique, highVol };
  }, [filteredRegistered]);

  const lockedMetrics = useMemo(() => {
    const filtered = data.filter(item => {
      // Strict user requirement: is_locked: true (handle boolean or string)
      const isLocked = item.is_locked === true || item.is_locked === 'true';
      if (!isLocked) return false;

      // Strict user requirement: locked_at in date range
      // Device MUST have a locked_at timestamp
      return isWithinRange(item.locked_at);
    });
    return new Set(filtered.map(item => item.unique_device_id || item._id)).size;
  }, [data, startDate, endDate]);

  const trainingTicketsCount = useMemo(() => {
    return filteredRegistered.filter(item => {
      const isRequired = item.training_required || item.meta?.training_required || item.meta?.is_training_required;
      return isRequired === true || isRequired === 'true';
    }).length;
  }, [filteredRegistered]);

  const orgTypeStats = useMemo(() => {
    // Store array of {id, name, count} instead of just counts
    const stats = { school: [], coaching: [], college: [], corporate: [], others: [] };

    // Helper to track counts per category
    const categoryMaps = {
      school: new Map(),
      coaching: new Map(),
      college: new Map(),
      corporate: new Map(),
      others: new Map()
    };

    const categoryCounts = { school: 0, coaching: 0, college: 0, corporate: 0, others: 0 };

    filteredRegistered.forEach(item => {
      const type = (item.institute_type || '').toLowerCase();
      let cat = 'others';

      if (type.includes('school')) cat = 'school';
      else if (type.includes('coaching') || type.includes('tuition')) cat = 'coaching';
      else if (type.includes('college') || type.includes('university')) cat = 'college';
      else if (['personal', 'home', 'others', 'corporate', 'business'].some(keyword => type.includes(keyword))) cat = 'corporate';

      // Increment device count for the category (for the main card badge)
      categoryCounts[cat]++;

      // Track institute-level counts
      if (item.institute_id) {
        const map = categoryMaps[cat];
        if (!map.has(item.institute_id)) {
          map.set(item.institute_id, {
            id: item.institute_id,
            name: item.institute_name || 'Unknown',
            count: 0
          });
        }
        const entry = map.get(item.institute_id);
        entry.count++;
      }
    });

    // Convert Maps to Arrays
    Object.keys(categoryMaps).forEach(key => {
      stats[key] = Array.from(categoryMaps[key].values());
    });

    return { counts: categoryCounts, lists: stats };
  }, [filteredRegistered]);

  useEffect(() => {
    setHighVolumeInstitutes(instituteMetrics.highVol);
    setMetrics({
      registered: filteredRegistered.length, // Now respects date filter again
      delinked: delinkingStats.delinking_count,
      generated: delinkingStats.linking_count,
      uniqueInstitutes: instituteMetrics.unique,
      locked: lockedMetrics,
      trainingTickets: trainingTicketsCount,
      orgTypes: orgTypeStats,
      bySource: sourceStats
    });
  }, [totalRegistered, filteredRegistered, instituteMetrics, lockedMetrics, trainingTicketsCount, orgTypeStats, sourceStats, delinkingStats, startDate, endDate]);

  const handleStartDateChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : new Date();
    setStartDate(date);
  };

  const handleEndDateChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : new Date();
    setEndDate(date);
  };



  return (
    <div className="container">
      <header className="header">
        <h1>
          <span style={{ color: 'var(--accent)' }}>Device</span> Onboarding
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>From:</span>
            <input
              type="date"
              className="date-picker"
              value={format(startDate, 'yyyy-MM-dd')}
              onChange={handleStartDateChange}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>To:</span>
            <input
              type="date"
              className="date-picker"
              value={format(endDate, 'yyyy-MM-dd')}
              onChange={handleEndDateChange}
            />
          </div>
        </div>
      </header>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--danger)',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <AlertCircle size={20} color="var(--danger)" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid">
        {/* Total Devices Registered */}
        <div className="card">
          <div className="card-title">
            <span>Devices Registered</span>
            <Monitor size={20} />
          </div>
          {loading ? (
            <Shimmer width="60%" height="2.5rem" />
          ) : (
            <div className="card-value">{formatNumber(metrics.registered)}</div>
          )}
          <div className="card-subtext">Active (Deleted: False)</div>

          <div className="source-breakdown">
            <div className="source-item">
              <span>IFP</span>
              {loading ? <Shimmer width="40px" height="1.5rem" /> : <span className="badge badge-ifp">{formatNumber(metrics.bySource.ifp)}</span>}
            </div>
            <div className="source-item">
              <span>Web</span>
              {loading ? <Shimmer width="40px" height="1.5rem" /> : <span className="badge badge-web">{formatNumber(metrics.bySource.web)}</span>}
            </div>
            <div className="source-item">
              <span>Mobile</span>
              {loading ? <Shimmer width="40px" height="1.5rem" /> : <span className="badge badge-mobile">{formatNumber(metrics.bySource.mobile)}</span>}
            </div>
          </div>
        </div>

        {/* Organization Type */}
        <div className="card">
          <div className="card-title">
            <span>Organization Type</span>
            <Building2 size={20} />
          </div>
          <div className="source-breakdown" style={{ marginTop: '1rem' }}>
            {[
              { key: 'school', label: 'School', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.2)' },
              { key: 'coaching', label: 'Coaching/Tuition', color: '#34d399', bg: 'rgba(16, 185, 129, 0.2)' },
              { key: 'college', label: 'College', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.2)' },
              { key: 'corporate', label: 'Corporate/Business', color: '#a78bfa', bg: 'rgba(139, 92, 246, 0.2)' },
              { key: 'others', label: 'Others', color: '#94a3b8', bg: 'rgba(100, 116, 139, 0.2)' }
            ].map((type) => (
              <div key={type.key} className="source-item" style={{ fontSize: '1rem' }}>
                <span>{type.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {loading ? (
                    <Shimmer width="40px" height="1.5rem" />
                  ) : (
                    <>
                      <span className="badge" style={{ background: type.bg, color: type.color, fontSize: '0.9rem' }}>
                        {formatNumber(metrics.orgTypes.counts[type.key])}
                      </span>
                      <button
                        className="icon-button"
                        onClick={() => {
                          setSelectedOrgType(type.label);
                          setSelectedOrgList(metrics.orgTypes.lists[type.key]);
                          setSearchTerm(''); // Reset search
                          setShowOrgModal(true);
                        }}
                        title="View Institute List"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
                      >
                        <Eye size={16} color="var(--text-secondary)" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Combined Delinked & Generated */}
        <div className="card">
          <div className="card-title">
            <span>System Activity</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Trash2 size={16} color="var(--danger)" />
              <Link size={16} color="var(--accent)" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Devices Delinked</div>
              {delinkingStatsLoading ? (
                <div className="shimmer" style={{ height: '1.5rem', width: '60%' }}></div>
              ) : (
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatNumber(metrics.delinked)}</div>
              )}
            </div>
            <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Codes Generated</div>
              {delinkingStatsLoading ? (
                <div className="shimmer" style={{ height: '1.5rem', width: '60%' }}></div>
              ) : (
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatNumber(metrics.generated)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Total Institutes Onboarded */}
        <div className="card">
          <div className="card-title">
            <span>Institutes Onboarded</span>
            <Monitor size={20} />
          </div>
          {loading ? (
            <Shimmer width="60%" height="2.5rem" />
          ) : (
            <div className="card-value">{formatNumber(metrics.uniqueInstitutes)}</div>
          )}
          <div className="card-subtext">Unique Institutes (≥1 Device)</div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              width: '100%'
            }}
          >
            View High Volume ({formatNumber(highVolumeInstitutes.length)})
          </button>
        </div>

        {/* Locked Devices */}
        <div className="card">
          <div className="card-title">
            <span>Locked Devices</span>
            <div style={{ position: 'relative' }}>
              <Monitor size={20} />
              <div style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                background: '#ef4444',
                borderRadius: '50%'
              }} />
            </div>
          </div>
          {loading ? (
            <Shimmer width="60%" height="2.5rem" />
          ) : (
            <div className="card-value">{formatNumber(metrics.locked)}</div>
          )}
          <div className="card-subtext">Locked & Recently Active</div>
        </div>

        {/* Training Tickets */}
        <div className="card">
          <div className="card-title">
            <span>Training Tickets</span>
            <LifeBuoy size={20} />
          </div>
          {loading ? (
            <Shimmer width="60%" height="2.5rem" />
          ) : (
            <div className="card-value">{formatNumber(metrics.trainingTickets)}</div>
          )}
          <div className="card-subtext">Zoho Tickets for Training</div>
        </div>
      </div>

      <GeoDistribution data={totalRegistered} loading={loading} />
      <ActiveDevicesMap activeDevicesData={activeDevicesData} loading={activeDevicesLoading} />

      {/* Modal for High Volume Institutes */}
      {
        showModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 50
          }}>
            <div style={{
              background: '#1e293b',
              padding: '2rem',
              borderRadius: '1rem',
              border: '1px solid #334155',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>
                  High Volume Institutes
                  <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem' }}>
                    ({highVolumeInstitutes.length})
                  </span>
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                >
                  <X size={24} />
                </button>
              </div>

              <div style={{ overflowY: 'auto' }}>
                {highVolumeInstitutes.length > 0 ? (
                  highVolumeInstitutes.sort((a, b) => b.count - a.count).map(inst => (
                    <div key={inst.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderBottom: '1px solid #334155'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#fff', fontWeight: 500 }}>{inst.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {inst.id}</span>
                      </div>
                      <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                        {formatNumber(inst.count)} Devices
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#94a3b8', textAlign: 'center' }}>No institutes with &gt; 50 devices found.</p>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Modal for Org Details */}
      {
        showOrgModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 55
          }}>
            <div style={{
              background: '#1e293b',
              padding: '2rem',
              borderRadius: '1rem',
              border: '1px solid #334155',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>
                  {selectedOrgType}
                  <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem' }}>
                    ({selectedOrgList.length})
                  </span>
                </h3>
                <button
                  onClick={() => setShowOrgModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ marginBottom: '1rem', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search by ID or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ overflowY: 'auto' }}>
                {
                  (() => {
                    const filtered = selectedOrgList.filter(item =>
                      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.id.toLowerCase().includes(searchTerm.toLowerCase())
                    );

                    if (filtered.length === 0) {
                      return <p style={{ color: '#94a3b8', textAlign: 'center' }}>No institutes found.</p>;
                    }

                    return filtered.sort((a, b) => b.count - a.count).map(inst => (
                      <div key={inst.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        borderBottom: '1px solid #334155'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#fff', fontWeight: 500 }}>{inst.name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {inst.id}</span>
                        </div>
                        <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }}>
                          {inst.count} Devices
                        </span>
                      </div>
                    ));
                  })()
                }
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default Dashboard;
