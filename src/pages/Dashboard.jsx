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

  // Lock Device Modal State
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockSerialNumber, setLockSerialNumber] = useState('');
  const [lockAction, setLockAction] = useState('lock'); // 'lock' or 'unlock'
  const [lockStatusMessage, setLockStatusMessage] = useState({ type: '', text: '' });

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
      try {
        // 1. Fetch main IFP details from QA
        const response = await fetch('https://app.teachmint.qa/institute-ifps/all/ifps/details');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();

        let rawData = [];
        if (result && result.obj) {
          if (Array.isArray(result.obj.data)) {
            rawData = result.obj.data;
            setCodesGeneratedToday(result.obj.codes_generated_today || 0);
          } else if (Array.isArray(result.obj)) {
            rawData = result.obj;
          }
        } else {
          throw new Error('Unexpected API response structure');
        }

        // 2. Extract unique institute IDs for batch fetch
        const instituteIds = [...new Set(rawData
          .map(item => item.institute_id)
          .filter(id => id) // remove null/undefined
        )];

        // 3. Fetch institute details from QA
        let instituteMap = {};

        if (instituteIds.length > 0) {
          try {
            const batchResponse = await fetch('https://app.teachmint.qa/institute-ifps/institute/details/batch', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ institute_ids: instituteIds })
            });

            if (batchResponse.ok) {
              const batchResult = await batchResponse.json();
              // The API returns an object keyed by ID: { "ID1": { ... }, "ID2": { ... } }
              if (batchResult && batchResult.obj) {
                instituteMap = batchResult.obj;
              }
            } else {
              console.warn('Batch institute fetch failed:', batchResponse.status);
            }
          } catch (batchErr) {
            console.warn('Batch institute fetch error:', batchErr);
          }
        }

        // Helper for normalization
        const normalizeTitleCase = (str) => {
          if (!str) return '';
          const upper = str.toUpperCase();
          if (upper === 'IN') return 'India';
          if (upper === 'USA' || upper === 'US' || upper === 'UNITED STATES OF AMERICA') return 'United States';
          if (upper === 'UK' || upper === 'UNITED KINGDOM') return 'United Kingdom';
          if (upper === 'UAE') return 'United Arab Emirates';

          return str.trim().split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        };

        console.log('API FETCHED: rawData sample:', rawData.slice(0, 2));
        console.log('INSTITUTE MAP keys sample:', Object.keys(instituteMap).slice(0, 5));

        // 4. Merge location data (pincode, country) into main data
        const mergedData = rawData.map(item => {
          // Robust ID lookup (trimming just in case)
          const instId = item.institute_id?.toString().trim();
          const instDetails = instituteMap[instId];

          if (instDetails) {
            const address = item.institute_address || {};

            let rawCountry = instDetails.country || address.country;
            let pincode = instDetails.pincode || address.pincode;

            // Heuristic for India
            if ((!rawCountry || rawCountry.toLowerCase() === 'unknown' || rawCountry.toLowerCase() === 'null') &&
              pincode && pincode.toString().length === 6) {
              rawCountry = 'India';
            }

            const country = normalizeTitleCase(rawCountry);

            return {
              ...item,
              institute_name: instDetails.name || item.institute_name,
              institute_address: {
                ...address,
                pincode: pincode,
                country: country
              },
              pincode: pincode,
              country: country,
              institute_type: instDetails.institution_type || instDetails.institute_type || item.institute_type // Merge type
            };
          }
          return item;
        });

        console.log(`MERGE SUMMARY: Total: ${mergedData.length}. Items with country: ${mergedData.filter(d => d.country).length}`);
        if (mergedData.length > 0) console.log('Merged Item sample:', mergedData.find(d => d.country) || mergedData[0]);

        setData(mergedData);
        setError(null);

      } catch (err) {
        console.error('API fetch failed:', err);
        setError('Failed to fetch from API. Showing mock data for demonstration.');

        // Mock data fallback
        const now = Date.now() / 1000;
        const adjustedMock = mockData.map((item, index) => ({
          ...item,
          c: now - (index * 3600),
          u: now - (index * 1800),
        }));
        setData(adjustedMock);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch active devices data for the second map
  useEffect(() => {
    const fetchActiveDevices = async () => {
      setActiveDevicesLoading(true);
      try {
        // 1. Fetch active devices by institute_id
        const response = await fetch('https://app.teachmint.qa/institute-ifps/active-devices-pincode-wise');
        if (!response.ok) {
          throw new Error('Active devices API failed');
        }
        const result = await response.json();

        // Response format: {"status": true, "obj": {"TEC563": 3, "EDU793": 1}}
        let activeDevicesMap = {};
        if (result && result.status && result.obj) {
          activeDevicesMap = result.obj;
        }

        console.log('ACTIVE DEVICES API:', activeDevicesMap);

        // 2. Get institute IDs and fetch their details for pincode mapping
        const instituteIds = Object.keys(activeDevicesMap);

        if (instituteIds.length > 0) {
          try {
            const batchResponse = await fetch('https://app.teachmint.qa/institute-ifps/institute/details/batch', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ institute_ids: instituteIds })
            });

            if (batchResponse.ok) {
              const batchResult = await batchResponse.json();
              const instituteMap = batchResult?.obj || {};

              // 3. Create pincode -> device count mapping
              const pincodeDeviceMap = {};

              Object.entries(activeDevicesMap).forEach(([instituteId, deviceCount]) => {
                const instDetails = instituteMap[instituteId];
                if (instDetails && instDetails.pincode) {
                  const pincode = instDetails.pincode.toString();
                  pincodeDeviceMap[pincode] = (pincodeDeviceMap[pincode] || 0) + deviceCount;
                }
              });

              console.log('ACTIVE DEVICES BY PINCODE:', pincodeDeviceMap);
              setActiveDevicesData(pincodeDeviceMap);
            }
          } catch (batchErr) {
            console.warn('Batch fetch for active devices failed:', batchErr);
          }
        }
      } catch (err) {
        console.error('Failed to fetch active devices:', err);
      } finally {
        setActiveDevicesLoading(false);
      }
    };

    fetchActiveDevices();
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
    if (!timestamp) return true; // Be permissive if no timestamp

    // Handle both seconds and milliseconds
    let ts = Number(timestamp);
    if (isNaN(ts)) return true; // Be permissive if timestamp is invalid string
    if (ts > 10000000000) ts = ts / 1000; // Likely ms, convert to s

    const date = new Date(ts * 1000);
    const start = startOfDay(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  };

  const totalRegistered = useMemo(() => {
    // Show everything by default unless deleted is specifically true
    return data.filter(item => item.deleted !== true);
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
      if (!item.is_locked) return false;
      if (item.deleted) return false;
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

  const handleDeviceLock = async () => {
    if (!lockSerialNumber) return;

    setLockStatusMessage({ type: '', text: '' });

    try {
      const isLocking = lockAction === 'lock';
      const payload = {
        serialNumber: lockSerialNumber,
        lock: isLocking
      };

      const response = await fetch('https://app.teachmint.qa/institute-ifps/lock-unlock-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      // Check for both HTTP success and API-level success (status: true)
      // Some APIs might return 200 OK but with { status: false, message: "..." }
      if (response.ok && (result.status === true || result.status === undefined) && !result.error) {
        // Update local state to reflect change immediately
        const updatedData = data.map(item => {
          // Check both serial_number and unique_device_id just in case
          if (item.serial_number === lockSerialNumber || item.unique_device_id === lockSerialNumber) {
            return { ...item, is_locked: isLocking, locked_at: isLocking ? Date.now() / 1000 : null };
          }
          return item;
        });

        setData(updatedData);
        // Don't close modal immediately, show success message
        setLockStatusMessage({
          type: 'success',
          text: `Success: Device ${lockSerialNumber} has been ${isLocking ? 'LOCKED' : 'UNLOCKED'}.`
        });
        setLockSerialNumber('');
      } else {
        console.error('Lock API Error:', result);
        // Extract error message from various possible fields
        const errorMessage = result.message || result.error || (result.obj && result.obj.message) || `Failed to ${lockAction} device.`;
        setLockStatusMessage({
          type: 'error',
          text: errorMessage
        });
      }

    } catch (error) {
      console.error('Lock Action Failed:', error);
      setLockStatusMessage({
        type: 'error',
        text: 'Network request failed. Please try again.'
      });
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

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
          <div className="card-value">{formatNumber(metrics.registered)}</div>
          <div className="card-subtext">Active (Deleted: False)</div>

          <div className="source-breakdown">
            <div className="source-item">
              <span>IFP</span>
              <span className="badge badge-ifp">{formatNumber(metrics.bySource.ifp)}</span>
            </div>
            <div className="source-item">
              <span>Web</span>
              <span className="badge badge-web">{formatNumber(metrics.bySource.web)}</span>
            </div>
            <div className="source-item">
              <span>Mobile</span>
              <span className="badge badge-mobile">{formatNumber(metrics.bySource.mobile)}</span>
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
          <div className="card-value">{formatNumber(metrics.uniqueInstitutes)}</div>
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
          <div className="card-value">{formatNumber(metrics.locked)}</div>
          <div className="card-subtext">Locked & Recently Active</div>
          <button
            onClick={() => setShowLockModal(true)}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              width: '100%'
            }}
          >
            Manage Device Lock
          </button>
        </div>

        {/* Training Tickets */}
        <div className="card">
          <div className="card-title">
            <span>Training Tickets</span>
            <LifeBuoy size={20} />
          </div>
          <div className="card-value">{formatNumber(metrics.trainingTickets)}</div>
          <div className="card-subtext">Zoho Tickets for Training</div>
        </div>
      </div>

      <GeoDistribution data={totalRegistered} />
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

      {/* Modal for Device Lock Management */}
      {
        showLockModal && (
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
            zIndex: 60
          }}>
            <div style={{
              background: '#1e293b',
              padding: '2rem',
              borderRadius: '1rem',
              border: '1px solid #334155',
              maxWidth: '450px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>Manage Device Lock</h3>
                <button
                  onClick={() => {
                    setShowLockModal(false);
                    setLockStatusMessage({ type: '', text: '' }); // Reset on close
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                >
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Serial Number Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Serial Number / Device ID</label>
                  <input
                    type="text"
                    value={lockSerialNumber}
                    onChange={(e) => setLockSerialNumber(e.target.value)}
                    placeholder="Enter Device Serial Number"
                    style={{
                      padding: '0.75rem',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                {/* Action Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Action</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div
                      onClick={() => setLockAction('lock')}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        border: `1px solid ${lockAction === 'lock' ? '#ef4444' : '#334155'}`,
                        background: lockAction === 'lock' ? 'rgba(239, 68, 68, 0.1)' : '#0f172a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        color: lockAction === 'lock' ? '#f87171' : '#94a3b8',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Lock size={18} />
                      <span style={{ fontWeight: 500 }}>Lock Device</span>
                    </div>
                    <div
                      onClick={() => setLockAction('unlock')}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        border: `1px solid ${lockAction === 'unlock' ? '#10b981' : '#334155'}`,
                        background: lockAction === 'unlock' ? 'rgba(16, 185, 129, 0.1)' : '#0f172a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        color: lockAction === 'unlock' ? '#34d399' : '#94a3b8',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Unlock size={18} />
                      <span style={{ fontWeight: 500 }}>Unlock Device</span>
                    </div>
                  </div>
                </div>

                {/* Status Message */}
                {lockStatusMessage.text && (
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    background: lockStatusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: lockStatusMessage.type === 'success' ? '#34d399' : '#f87171',
                    border: `1px solid ${lockStatusMessage.type === 'success' ? '#059669' : '#b91c1c'}`
                  }}>
                    {lockStatusMessage.text}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleDeviceLock}
                  style={{
                    padding: '0.875rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    opacity: lockSerialNumber ? 1 : 0.6,
                    pointerEvents: lockSerialNumber ? 'auto' : 'none'
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default Dashboard;
