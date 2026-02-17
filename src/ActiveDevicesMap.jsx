import React, { useState, useEffect, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { getPincodeCoordinates } from './pincodeCoordinates';
import { getStateFromPincode } from './pincodeMap';

const indiaStatesUrl = "https://cdn.jsdelivr.net/gh/india-in-data/india-states-2019@master/india_states.geojson";

const ActiveDevicesMap = ({ activeDevicesData, loading }) => {
    const activeData = useMemo(() => {
        return Object.entries(activeDevicesData || {}).map(([pincode, count]) => {
            const coords = getPincodeCoordinates(pincode);
            return { pincode, count, ...coords };
        }).filter(item => item.lat && item.lng);
    }, [activeDevicesData]);

    const stateStats = useMemo(() => {
        const stats = {};
        activeData.forEach(item => {
            const state = getStateFromPincode(item.pincode);
            stats[state] = (stats[state] || 0) + item.count;
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]);
    }, [activeData]);

    const [position, setPosition] = useState({ coordinates: [78.96, 23.59], zoom: 1 });

    return (
        <div className="active-map-container" style={{ marginTop: '2rem', background: '#0f172a', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        Live Active Devices <span className="live-indicator"></span>
                    </h2>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>Real-time activity in last 30 minutes</p>
                </div>
                {loading && <div className="mini-loader"></div>}
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Map Section */}
                <div style={{ flex: '2 1 500px', height: '500px', background: '#020617', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #1e293b' }}>
                    <ComposableMap
                        width={800}
                        height={500}
                        projectionConfig={{ scale: 1000, center: [78.96, 23.59] }}
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
                                                fill="#1e293b"
                                                stroke="#020617"
                                                strokeWidth={0.5}
                                                style={{ default: { outline: "none" } }}
                                            />
                                        ))
                                }
                            </Geographies>

                            {activeData.map(({ pincode, count, lat, lng }) => (
                                <Marker key={pincode} coordinates={[lng, lat]}>
                                    <g className="pulse-marker">
                                        <circle r={4 + Math.min(count, 10)} fill="#3b82f6" fillOpacity={0.6} className="pulse-circle" />
                                        <circle r={2} fill="#60a5fa" />
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
                        {stateStats.length > 0 ? (
                            stateStats.map(([state, count]) => (
                                <div key={state} className="source-item" style={{ marginBottom: '0.75rem', borderBottom: '1px solid #0f172a', paddingBottom: '0.5rem' }}>
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
