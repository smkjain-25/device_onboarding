import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { Tooltip } from 'react-tooltip';
import pincodeCoordinates from './pincodeCoordinates.json';

const STATE_CENTROIDS = {
    "Andaman and Nicobar Islands": { center: [92.65, 11.62], zoom: 4 },
    "Andhra Pradesh": { center: [79.74, 15.91], zoom: 4 },
    "Arunachal Pradesh": { center: [94.72, 28.21], zoom: 4 },
    "Assam": { center: [92.93, 26.20], zoom: 4 },
    "Bihar": { center: [85.31, 25.09], zoom: 5 },
    "Chandigarh": { center: [76.77, 30.73], zoom: 10 },
    "Chhattisgarh": { center: [81.86, 21.27], zoom: 4 },
    "Dadra and Nagar Haveli": { center: [73.01, 20.18], zoom: 8 },
    "Daman and Diu": { center: [72.83, 20.42], zoom: 8 },
    "Delhi": { center: [77.10, 28.70], zoom: 10 },
    "Goa": { center: [74.12, 15.29], zoom: 8 },
    "Gujarat": { center: [71.19, 22.25], zoom: 4 },
    "Haryana": { center: [76.08, 29.05], zoom: 5 },
    "Himachal Pradesh": { center: [77.17, 31.10], zoom: 5 },
    "Jammu and Kashmir": { center: [76.57, 33.77], zoom: 4 },
    "Jharkhand": { center: [85.32, 23.61], zoom: 5 },
    "Karnataka": { center: [75.71, 15.31], zoom: 4 },
    "Kerala": { center: [76.27, 10.85], zoom: 5 },
    "Lakshadweep": { center: [72.64, 10.57], zoom: 6 },
    "Madhya Pradesh": { center: [78.65, 22.97], zoom: 4 },
    "Maharashtra": { center: [75.71, 19.75], zoom: 4 },
    "Manipur": { center: [93.90, 24.66], zoom: 5 },
    "Meghalaya": { center: [91.36, 25.46], zoom: 5 },
    "Mizoram": { center: [92.93, 23.16], zoom: 5 },
    "Nagaland": { center: [94.56, 26.15], zoom: 5 },
    "Odisha": { center: [84.80, 20.95], zoom: 4 },
    "Puducherry": { center: [79.80, 11.94], zoom: 8 },
    "Punjab": { center: [75.34, 31.14], zoom: 5 },
    "Rajasthan": { center: [74.21, 27.02], zoom: 4 },
    "Sikkim": { center: [88.51, 27.53], zoom: 6 },
    "Tamil Nadu": { center: [78.65, 11.12], zoom: 4 },
    "Telangana": { center: [79.01, 18.11], zoom: 4 },
    "Tripura": { center: [91.98, 23.94], zoom: 6 },
    "Uttar Pradesh": { center: [80.94, 26.84], zoom: 4 },
    "Uttarakhand": { center: [79.01, 30.06], zoom: 5 },
    "West Bengal": { center: [87.85, 22.98], zoom: 4 },
    "Ladakh": { center: [77.58, 34.15], zoom: 4 }
};

const getStateFromPincode = (pincode) => {
    if (!pincode) return 'Unknown';
    const data = pincodeCoordinates[pincode];
    return data ? data.state : 'Unknown';
};

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
// Using a cleaner states-only GeoJSON source for India
const indiaStatesUrl = "https://cdn.jsdelivr.net/gh/india-in-data/india-states-2019@master/india_states.geojson";

const GeoDistribution = ({ data, loading }) => {
    const [countryStats, setCountryStats] = useState({});
    const [indiaStateStats, setIndiaStateStats] = useState({});
    const [indiaCityStats, setIndiaCityStats] = useState({}); // City-based distribution
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [showIndiaMap, setShowIndiaMap] = useState(false);
    const [showChartsModal, setShowChartsModal] = useState(false);

    // State Zoom logic
    const [selectedState, setSelectedState] = useState(null);

    useEffect(() => {
        if (loading) return;

        const cStats = {};
        const iStats = {};
        const cityAgg = {}; // { cityName: { count, latSum, lngSum, numPoints, state } }

        const normalizeTitleCase = (str) => {
            if (!str) return '';
            const upper = str.toUpperCase();
            if (upper === 'IN') return 'India';
            if (upper === 'USA' || upper === 'US' || upper === 'UNITED STATES OF AMERICA') return 'United States';
            if (upper === 'UK' || upper === 'UNITED KINGDOM') return 'United Kingdom';
            if (upper === 'UAE' || upper === 'UNITED ARAB EMIRATES') return 'United Arab Emirates';

            return str.trim().split(/\s+/)
                .map((word, index) => {
                    const lower = word.toLowerCase();
                    if (index > 0 && ['and', 'of', 'the', 'in', 'on', 'at', 'to', 'for', 'by', 'with'].includes(lower)) {
                        return lower;
                    }
                    return lower.charAt(0).toUpperCase() + lower.slice(1);
                })
                .join(' ');
        };

        data.forEach(item => {
            const pincode = item.pincode || item.institute_address?.pincode;

            // Normalize country name
            let rawCountry = item.country || item.institute_address?.country;
            let country = normalizeTitleCase(rawCountry);

            // Heuristic: If country is missing but we have a 6-digit pincode, assume India
            if ((!country || country === 'Unknown') && pincode && pincode.toString().length === 6) {
                country = 'India';
            }

            if (!country) country = 'Unknown';

            cStats[country] = (cStats[country] || 0) + 1;

            if (country === 'India' && pincode) {
                const pinData = pincodeCoordinates[pincode.toString()];
                const rawState = pinData ? pinData.state : 'Unknown';
                const state = normalizeTitleCase(rawState);
                iStats[state] = (iStats[state] || 0) + 1;

                if (pinData && pinData.city) {
                    const city = pinData.city;
                    if (!cityAgg[city]) {
                        cityAgg[city] = { count: 0, latSum: 0, lngSum: 0, numPoints: 0, state: state };
                    }
                    cityAgg[city].count++;
                    cityAgg[city].latSum += pinData.lat;
                    cityAgg[city].lngSum += pinData.lng;
                    cityAgg[city].numPoints++;
                }
            }
        });

        // Convert cityAgg to a list or object of displayable cities
        const finalCityStats = {};
        Object.entries(cityAgg).forEach(([city, metrics]) => {
            finalCityStats[city] = {
                count: metrics.count,
                lat: metrics.latSum / metrics.numPoints,
                lng: metrics.lngSum / metrics.numPoints,
                state: metrics.state
            };
        });

        console.log('GEO DATA: countryStats:', cStats);
        console.log('GEO DATA: indiaStateStats:', iStats);

        setCountryStats(cStats);
        setIndiaStateStats(iStats);
        setIndiaCityStats(finalCityStats);
    }, [data, loading]);

    // Store geographies for search functionality using ref to avoid render cycle issues
    const worldGeographiesRef = useRef([]);

    // Zoom State
    const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });

    const handleZoomIn = () => setPosition(pos => ({ ...pos, zoom: Math.min(pos.zoom * 1.5, 10) }));
    const handleZoomOut = () => setPosition(pos => ({ ...pos, zoom: Math.max(pos.zoom / 1.5, 1) }));
    const handleMoveEnd = (pos) => setPosition(pos);

    const handleStateClick = (geo) => {
        const stateName = geo.properties.ST_NM || geo.properties.name;
        setSelectedState(stateName);

        const centroid = STATE_CENTROIDS[stateName];
        if (centroid) {
            setPosition({ coordinates: centroid.center, zoom: centroid.zoom });
        }
    };

    const handleBackToIndia = () => {
        setSelectedState(null);
        setPosition({ coordinates: [78.96, 22.59], zoom: 1 });
    };

    const handleBackToWorld = () => {
        setShowIndiaMap(false);
        setSelectedState(null);
        setPosition({ coordinates: [0, 0], zoom: 1 });
    };

    const [searchTerm, setSearchTerm] = useState("");

    // Auto-zoom to searched country
    useEffect(() => {
        if (!searchTerm || searchTerm.length < 2) {
            // Reset zoom when search is cleared
            if (position.zoom > 1) {
                setPosition({ coordinates: [0, 0], zoom: 1 });
            }
            return;
        }

        // Find matching country in our stats
        const searchLower = searchTerm.toLowerCase();
        const matchedCountry = Object.keys(countryStats).find(country =>
            country.toLowerCase().includes(searchLower) ||
            searchLower.includes(country.toLowerCase())
        );

        if (matchedCountry && worldGeographiesRef.current.length > 0) {
            // Find the geography for this country
            const matchedGeo = worldGeographiesRef.current.find(geo => {
                const geoName = geo.properties.name || geo.properties.name_en;
                return geoName === matchedCountry ||
                    geoName.toLowerCase().includes(searchLower) ||
                    (geoName === 'United States of America' && matchedCountry === 'United States');
            });

            if (matchedGeo) {
                // Calculate center from geometry if not provided
                let center = matchedGeo.properties.center;
                if (!center && matchedGeo.geometry && matchedGeo.geometry.coordinates) {
                    // For simple geometries, use first coordinate
                    const coords = matchedGeo.geometry.coordinates;
                    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                        center = coords[0][0]; // First point of first polygon
                    }
                }

                if (center) {
                    // Zoom to the country
                    setPosition({
                        coordinates: center,
                        zoom: 2.5
                    });
                    setSelectedCountry(matchedCountry);
                }
            }
        }
    }, [searchTerm, countryStats]);

    // Enhanced color scale for better visibility
    const maxVal = Math.max(...Object.values(countryStats), 0);
    const colorScale = scaleLinear()
        .domain([0, 1, maxVal || 1])
        .range(["#1e293b", "#10b981", "#3b82f6"]); // Dark -> Green -> Blue for better contrast

    return (
        <div style={{ marginTop: '2rem', background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', position: 'relative', minHeight: '500px' }}>
            {loading && (
                <div className="shimmer-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10,
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '1rem'
                }}>
                    <div className="shimmer" style={{ width: '100%', height: '100%', borderRadius: '1rem' }}></div>
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>Geographic Distribution</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Search Country..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '0.75rem', border: '1px solid #475569', background: '#0f172a', color: '#f8fafc', width: '240px', outline: 'none' }}
                    />
                    <button
                        onClick={() => setShowChartsModal(true)}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '0.75rem',
                            border: '1px solid #3b82f6',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                            e.target.style.borderColor = '#60a5fa';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                            e.target.style.borderColor = '#3b82f6';
                        }}
                    >
                        📊 View Charts
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                <div style={{ flex: '2 1 500px', height: '500px', border: '1px solid #334155', borderRadius: '1rem', overflow: 'hidden', background: '#020617', position: 'relative' }}>
                    <ComposableMap
                        width={800}
                        height={500}
                        projectionConfig={showIndiaMap ? { scale: 1000, center: [78.96, 22.59] } : { scale: 145, rotate: [-10, 0, 0] }}
                        projection={showIndiaMap ? "geoMercator" : "geoEqualEarth"}
                        style={{ width: "100%", height: "100%" }}
                    >
                        <ZoomableGroup zoom={position.zoom} center={position.coordinates} onMoveEnd={handleMoveEnd}>
                            {!showIndiaMap ? (
                                <Geographies geography={geoUrl}>
                                    {({ geographies }) => {
                                        // Store geographies for search functionality (using ref to avoid render issues)
                                        if (worldGeographiesRef.current.length === 0) {
                                            worldGeographiesRef.current = geographies;
                                        }

                                        return geographies
                                            .filter(geo => geo.properties?.name || geo.properties?.name_en)
                                            .map((geo) => {
                                                const geoName = geo.properties.name || geo.properties.name_en;

                                                // Try multiple name variations for matching
                                                let cur = countryStats[geoName] || 0;

                                                // Fallback matching strategies
                                                if (!cur) {
                                                    // Try normalized version
                                                    const normalized = geoName.trim().split(/\s+/)
                                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                                        .join(' ');
                                                    cur = countryStats[normalized] || 0;
                                                }

                                                if (!cur) {
                                                    // Try common variations
                                                    if (geoName === 'United States of America') cur = countryStats['United States'] || 0;
                                                    if (geoName === 'United States') cur = countryStats['United States'] || 0;
                                                    if (geoName === 'UAE' || geoName === 'United Arab Emirates') {
                                                        cur = countryStats['United Arab Emirates'] || countryStats['UAE'] || 0;
                                                    }
                                                }

                                                const isSearched = searchTerm && geoName.toLowerCase().includes(searchTerm.toLowerCase());

                                                return (
                                                    <Geography
                                                        key={geo.rsmKey}
                                                        geography={geo}
                                                        fill={isSearched ? "#fbbf24" : (cur > 0 ? colorScale(cur) : "#1e293b")}
                                                        stroke="#0f172a"
                                                        strokeWidth={0.5}
                                                        style={{
                                                            default: { outline: "none" },
                                                            hover: { fill: "#60a5fa", cursor: 'pointer', outline: "none" },
                                                            pressed: { outline: "none" }
                                                        }}
                                                        data-tooltip-id="geo-tooltip"
                                                        data-tooltip-content={`${geoName}: ${cur} devices`}
                                                        onClick={() => {
                                                            if (geoName === 'India') {
                                                                setShowIndiaMap(true);
                                                                setSelectedCountry('India');
                                                                setPosition({ coordinates: [78.96, 22.59], zoom: 1 });
                                                            } else {
                                                                setSelectedCountry(geoName);
                                                                setShowIndiaMap(false);
                                                                setPosition({ coordinates: geo.properties.center || [0, 0], zoom: 1 });
                                                            }
                                                        }}
                                                    />
                                                );
                                            });
                                    }}
                                </Geographies>
                            ) : (
                                <>
                                    <Geographies geography={indiaStatesUrl}>
                                        {({ geographies }) =>
                                            geographies
                                                .filter(geo => {
                                                    const name = geo.properties?.ST_NM || geo.properties?.name || geo.properties?.ST_NAME;
                                                    return name && name !== 'India'; // Skip the whole country feature if present
                                                })
                                                .map((geo) => {
                                                    const rawStateName = geo.properties.ST_NM || geo.properties.name || geo.properties.ST_NAME;

                                                    // Robust case-insensitive matching
                                                    const matchedStateKey = Object.keys(indiaStateStats).find(
                                                        key => key.toLowerCase() === rawStateName.toLowerCase()
                                                    );
                                                    const count = matchedStateKey ? indiaStateStats[matchedStateKey] : 0;
                                                    const isSelected = selectedState === rawStateName;

                                                    const maxStateVal = Math.max(...Object.values(indiaStateStats), 0);
                                                    const stateColorScale = scaleLinear().domain([0, maxStateVal || 1]).range(["#1e293b", "#3b82f6"]);

                                                    return (
                                                        <Geography
                                                            key={geo.rsmKey}
                                                            geography={geo}
                                                            onClick={() => handleStateClick(geo)}
                                                            fill={isSelected ? "#334155" : (count > 0 ? stateColorScale(count) : "#1e293b")}
                                                            stroke="#020617"
                                                            strokeWidth={isSelected ? 0.8 : 0.5}
                                                            style={{
                                                                default: { outline: "none" },
                                                                hover: { fill: "#60a5fa", cursor: 'pointer', outline: "none" },
                                                                pressed: { outline: "none" }
                                                            }}
                                                            data-tooltip-id="state-tooltip"
                                                            data-tooltip-content={`${rawStateName}: ${count} devices`}
                                                        />
                                                    );
                                                })
                                        }
                                    </Geographies>

                                    {/* City Markers (only visible when a state is selected) */}
                                    {selectedState && Object.entries(indiaCityStats)
                                        .filter(([city, stats]) => stats.state.toLowerCase() === selectedState.toLowerCase())
                                        .map(([city, stats]) => (
                                            <Marker key={city} coordinates={[stats.lng, stats.lat]}>
                                                <circle
                                                    r={4 / Math.max(1, position.zoom * 0.5)}
                                                    fill="#f59e0b"
                                                    stroke="#fff"
                                                    strokeWidth={1 / Math.max(1, position.zoom * 0.5)}
                                                />
                                                <title>{`${city}: ${stats.count} devices`}</title>
                                            </Marker>
                                        ))
                                    }
                                </>
                            )}
                        </ZoomableGroup>
                    </ComposableMap>

                    {showIndiaMap && (
                        <>
                            <button
                                onClick={selectedState ? handleBackToIndia : handleBackToWorld}
                                style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', padding: '0.6rem 1.2rem', background: '#1e293b', border: '1px solid #475569', borderRadius: '0.75rem', color: '#f8fafc', cursor: 'pointer', zIndex: 10 }}
                            >
                                ← {selectedState ? 'Back to India' : 'Back to World'}
                            </button>
                        </>
                    )}

                    <div style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 10 }}>
                        <button onClick={handleZoomIn} style={{ width: '36px', height: '36px', borderRadius: '0.5rem', border: '1px solid #475569', background: '#1e293b', color: 'white', cursor: 'pointer' }}>+</button>
                        <button onClick={handleZoomOut} style={{ width: '36px', height: '36px', borderRadius: '0.5rem', border: '1px solid #475569', background: '#1e293b', color: 'white', cursor: 'pointer' }}>-</button>
                    </div>

                    <Tooltip id="geo-tooltip" />
                    <Tooltip id="state-tooltip" />
                </div>

                <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ padding: '1.5rem', background: '#0f172a', borderRadius: '1rem', border: '1px solid #334155' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
                            {selectedState ? `📍 ${selectedState} Cities` : (selectedCountry === 'India' ? '🇮🇳 India Distribution' : (selectedCountry ? `📍 ${selectedCountry} Stats` : '🌍 Global Distribution'))}
                        </h3>

                        {selectedState ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '0.75rem', borderLeft: '4px solid #f59e0b' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>State Total</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{indiaStateStats[selectedState] || 0}</div>
                                </div>
                                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                    {Object.entries(indiaCityStats)
                                        .filter(([, stats]) => stats.state.toLowerCase() === selectedState.toLowerCase())
                                        .sort(([, a], [, b]) => b.count - a.count)
                                        .map(([city, stats]) => (
                                            <div key={city} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#1e293b', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                                                <span style={{ color: '#cbd5e1' }}>{city}</span>
                                                <span style={{ fontWeight: 700, color: '#f59e0b' }}>{stats.count}</span>
                                            </div>
                                        ))}
                                    {Object.entries(indiaCityStats).filter(([, stats]) => stats.state.toLowerCase() === selectedState.toLowerCase()).length === 0 && (
                                        <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>No city data found for this state.</div>
                                    )}
                                </div>
                            </div>
                        ) : selectedCountry === 'India' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '0.75rem', borderLeft: '4px solid #3b82f6' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Devices</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{countryStats['India'] || 0}</div>
                                </div>
                                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                    {Object.entries(indiaStateStats).sort(([, a], [, b]) => b - a).map(([state, count]) => (
                                        <div
                                            key={state}
                                            onClick={() => {
                                                setSelectedState(state);
                                                const centroid = STATE_CENTROIDS[state];
                                                if (centroid) setPosition({ coordinates: centroid.center, zoom: centroid.zoom });
                                            }}
                                            style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#1e293b', borderRadius: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}
                                        >
                                            <span style={{ color: '#cbd5e1' }}>{state}</span>
                                            <span style={{ fontWeight: 700, color: '#3b82f6' }}>{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : selectedCountry ? (
                            <div style={{ padding: '1.5rem', background: '#1e293b', borderRadius: '0.75rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Total Devices</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc' }}>{countryStats[selectedCountry] || 0}</div>
                            </div>
                        ) : (
                            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b', border: '2px dashed #334155', borderRadius: '1rem' }}>
                                <p>Select a country to view details.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Modal */}
            {showChartsModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 100,
                    padding: '2rem'
                }}>
                    <div style={{
                        background: '#1e293b',
                        borderRadius: '1rem',
                        border: '1px solid #334155',
                        maxWidth: '1200px',
                        width: '100%',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid #334155',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                                📊 Device Distribution Charts
                            </h3>
                            <button
                                onClick={() => setShowChartsModal(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '1.5rem',
                                    padding: '0.5rem',
                                    lineHeight: 1
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div style={{
                            padding: '1.5rem',
                            overflowY: 'auto',
                            flex: 1
                        }}>
                            {/* Country Comparison Chart */}
                            <div style={{ marginBottom: '2rem' }}>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1rem' }}>
                                    🌍 Country-wise Distribution
                                </h4>
                                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #334155' }}>
                                    {Object.entries(countryStats)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 10)
                                        .map(([country, count]) => {
                                            const maxCount = Math.max(...Object.values(countryStats));
                                            const percentage = (count / maxCount) * 100;
                                            return (
                                                <div key={country} style={{ marginBottom: '0.75rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                        <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>{country}</span>
                                                        <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.875rem' }}>{count}</span>
                                                    </div>
                                                    <div style={{ background: '#1e293b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                                                            height: '100%',
                                                            width: `${percentage}%`,
                                                            transition: 'width 0.3s ease'
                                                        }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* India State-wise Chart */}
                            <div style={{ marginBottom: '2rem' }}>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1rem' }}>
                                    🇮� India - State-wise Distribution
                                </h4>
                                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #334155' }}>
                                    {Object.entries(indiaStateStats)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 15)
                                        .map(([state, count]) => {
                                            const maxCount = Math.max(...Object.values(indiaStateStats));
                                            const percentage = (count / maxCount) * 100;
                                            return (
                                                <div key={state} style={{ marginBottom: '0.75rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                        <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>{state}</span>
                                                        <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.875rem' }}>{count}</span>
                                                    </div>
                                                    <div style={{ background: '#1e293b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                                                            height: '100%',
                                                            width: `${percentage}%`,
                                                            transition: 'width 0.3s ease'
                                                        }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* India City-wise (Pincode) Chart */}
                            <div>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1rem' }}>
                                    🏙️ India - Top Cities by Distribution
                                </h4>
                                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #334155' }}>
                                    {Object.entries(indiaCityStats)
                                        .sort((a, b) => b[1].count - a[1].count)
                                        .slice(0, 20)
                                        .map(([city, stats]) => {
                                            const maxCount = Math.max(...Object.values(indiaCityStats).map(s => s.count));
                                            const percentage = (stats.count / maxCount) * 100;
                                            return (
                                                <div key={city} style={{ marginBottom: '0.75rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                        <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
                                                            {city} <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({stats.state})</span>
                                                        </span>
                                                        <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.875rem' }}>{stats.count}</span>
                                                    </div>
                                                    <div style={{ background: '#1e293b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                                                            height: '100%',
                                                            width: `${percentage}%`,
                                                            transition: 'width 0.3s ease'
                                                        }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeoDistribution;
