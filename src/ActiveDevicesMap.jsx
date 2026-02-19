import React, { useState, useEffect, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import pincodeCoordinates from './pincodeCoordinates.json';

const indiaStatesUrl = "https://cdn.jsdelivr.net/gh/india-in-data/india-states-2019@master/india_states.geojson";

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

const ActiveDevicesMap = ({ activeDevicesData, loading }) => {
    const activeData = useMemo(() => {
        return Object.entries(activeDevicesData || {}).map(([pincode, count]) => {
            const data = pincodeCoordinates[pincode];
            if (data) {
                return { pincode, count, lat: data.lat, lng: data.lng, state: data.state };
            }
            return null;
        }).filter(item => item !== null);
    }, [activeDevicesData]);

    const stateStats = useMemo(() => {
        const stats = {};
        activeData.forEach(item => {
            const state = item.state || 'Unknown';
            stats[state] = (stats[state] || 0) + item.count;
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]);
    }, [activeData]);

    const [position, setPosition] = useState({ coordinates: [78.96, 22.59], zoom: 1 });
    const [selectedState, setSelectedState] = useState(null);

    const handleStateClick = (geo) => {
        const stateName = geo.properties.ST_NM;
        const stateData = STATE_CENTROIDS[stateName];

        if (stateData) {
            setPosition({ coordinates: stateData.center, zoom: stateData.zoom });
            setSelectedState(stateName);
        } else {
            console.warn(`No centroid data for state: ${stateName}`);
        }
    };

    const handleResetZoom = () => {
        setPosition({ coordinates: [78.96, 22.59], zoom: 1 });
        setSelectedState(null);
    };

    return (
        <div className="active-map-container" style={{ marginTop: '2rem', background: '#0f172a', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        Live Active Devices <span className="live-indicator"></span>
                    </h2>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>Real-time activity in last 30 minutes</p>
                </div>
                {selectedState && (
                    <button
                        onClick={handleResetZoom}
                        style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 600
                        }}
                    >
                        ← Back to India
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', position: 'relative' }}>
                {loading && (
                    <div className="shimmer-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 10,
                        background: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(2px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: '0.75rem'
                    }}>
                        <div className="shimmer" style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}></div>
                    </div>
                )}

                {/* Map Section */}
                <div style={{ flex: '2 1 500px', height: '500px', background: '#020617', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #1e293b' }}>
                    <ComposableMap
                        width={800}
                        height={500}
                        projection="geoMercator"
                        projectionConfig={{
                            scale: 1200,
                            center: [78.96, 22.59]
                        }}
                        style={{ width: "100%", height: "100%" }}
                    >
                        <ZoomableGroup zoom={position.zoom} center={position.coordinates} onMoveEnd={(pos) => setPosition(pos)}>
                            <Geographies geography={indiaStatesUrl}>
                                {({ geographies }) =>
                                    geographies
                                        .filter(geo => geo.properties?.ST_NM !== 'India')
                                        .map((geo) => (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                onClick={() => handleStateClick(geo)}
                                                fill={selectedState === geo.properties.ST_NM ? "#334155" : "#1e293b"}
                                                stroke="#475569"
                                                strokeWidth={0.8 / position.zoom}
                                                style={{
                                                    default: { outline: "none", cursor: 'pointer' },
                                                    hover: { fill: "#334155", outline: "none", cursor: 'pointer' },
                                                    pressed: { outline: "none" }
                                                }}
                                            />
                                        ))
                                }
                            </Geographies>

                            {!loading && activeData.map(({ pincode, count, lat, lng }) => (
                                <Marker key={pincode} coordinates={[lng, lat]}>
                                    <g className="pulse-marker">
                                        <circle
                                            r={(4 + Math.min(count, 10)) / Math.max(1, position.zoom * 0.5)}
                                            fill="#3b82f6"
                                            fillOpacity={0.6}
                                            className="pulse-circle"
                                        />
                                        <circle r={2 / Math.max(1, position.zoom * 0.5)} fill="#60a5fa" />
                                    </g>
                                    <title>{`Pincode: ${pincode} | Active: ${count}`}</title>
                                </Marker>
                            ))}
                        </ZoomableGroup>
                    </ComposableMap>
                </div>

                {/* State Statistics Panel */}
                <div style={{ flex: '1 1 250px', background: '#020617', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #1e293b', maxHeight: '500px', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem', marginBottom: '1rem' }}>Active by State</h3>
                    <div className="source-breakdown" style={{ marginTop: '0' }}>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="shimmer" style={{ height: '2rem', borderRadius: '0.5rem' }}></div>
                                ))}
                            </div>
                        ) : stateStats.length > 0 ? (
                            stateStats.map(([state, count]) => (
                                <div
                                    key={state}
                                    className="source-item"
                                    onClick={() => {
                                        const stubGeo = { properties: { ST_NM: state } };
                                        handleStateClick(stubGeo);
                                    }}
                                    style={{
                                        marginBottom: '0.75rem',
                                        borderBottom: '1px solid #0f172a',
                                        paddingBottom: '0.5rem',
                                        cursor: 'pointer',
                                        backgroundColor: selectedState === state ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                        borderRadius: '0.25rem',
                                        padding: '0.25rem'
                                    }}
                                >
                                    <span style={{ color: '#cbd5e1' }}>{state}</span>
                                    <span style={{ fontWeight: 600, color: '#3b82f6' }}>{count} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>devices</span></span>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', color: '#475569', marginTop: '2rem' }}>No live activity detected</div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></div> Low Activity
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6' }}></div> High Activity
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActiveDevicesMap;
