// Mapping of Indian pincodes to coordinates (lat, lng)
// This is a sample mapping for common pincodes. Expand as needed.
export const PINCODE_COORDINATES = {
    // Delhi
    '110001': { lat: 28.6139, lng: 77.2090 },
    '110002': { lat: 28.6469, lng: 77.2167 },
    '110003': { lat: 28.6692, lng: 77.2297 },
    '110005': { lat: 28.6431, lng: 77.2197 },
    '110006': { lat: 28.6358, lng: 77.2245 },

    // Mumbai
    '400001': { lat: 18.9388, lng: 72.8354 },
    '400002': { lat: 18.9570, lng: 72.8124 },
    '400003': { lat: 18.9520, lng: 72.8337 },
    '400004': { lat: 18.9544, lng: 72.8186 },
    '400051': { lat: 19.0596, lng: 72.8295 },

    // Bangalore
    '560001': { lat: 12.9716, lng: 77.5946 },
    '560002': { lat: 12.9634, lng: 77.5855 },
    '560003': { lat: 12.9698, lng: 77.6025 },
    '560004': { lat: 12.9539, lng: 77.5937 },
    '560005': { lat: 12.9591, lng: 77.6089 },

    // Chennai
    '600001': { lat: 13.0827, lng: 80.2707 },
    '600002': { lat: 13.0569, lng: 80.2425 },
    '600003': { lat: 13.0732, lng: 80.2609 },
    '600004': { lat: 13.0381, lng: 80.2509 },
    '600005': { lat: 13.0732, lng: 80.2384 },

    // Kolkata
    '700001': { lat: 22.5726, lng: 88.3639 },
    '700002': { lat: 22.5448, lng: 88.3426 },
    '700003': { lat: 22.5354, lng: 88.3832 },
    '700004': { lat: 22.5354, lng: 88.3832 },
    '700005': { lat: 22.5448, lng: 88.3426 },

    // Hyderabad
    '500001': { lat: 17.3850, lng: 78.4867 },
    '500002': { lat: 17.4065, lng: 78.4691 },
    '500003': { lat: 17.3753, lng: 78.4983 },
    '500004': { lat: 17.3616, lng: 78.4747 },
    '500005': { lat: 17.4239, lng: 78.4738 },

    // Pune
    '411001': { lat: 18.5204, lng: 73.8567 },
    '411002': { lat: 18.5362, lng: 73.8697 },
    '411003': { lat: 18.5089, lng: 73.8553 },
    '411004': { lat: 18.5314, lng: 73.8446 },
    '411005': { lat: 18.5089, lng: 73.8553 },

    // Ahmedabad
    '380001': { lat: 23.0225, lng: 72.5714 },
    '380002': { lat: 23.0315, lng: 72.5797 },
    '380003': { lat: 23.0204, lng: 72.5797 },
    '380004': { lat: 23.0315, lng: 72.5797 },
    '380005': { lat: 23.0204, lng: 72.5797 },

    // Jaipur
    '302001': { lat: 26.9124, lng: 75.7873 },
    '302002': { lat: 26.9239, lng: 75.8267 },
    '302003': { lat: 26.9239, lng: 75.8267 },
    '302004': { lat: 26.9239, lng: 75.8267 },
    '302005': { lat: 26.9239, lng: 75.8267 },

    // Lucknow / Uttar Pradesh
    '226001': { lat: 26.8467, lng: 80.9462 },
    '226023': { lat: 26.8467, lng: 80.9462 },

    // Test/Mock pincodes
    '123456': { lat: 28.7041, lng: 77.1025 }, // Generic Delhi area
};

// Fallback: Estimate coordinates based on pincode prefix (state-level approximation)
const STATE_CENTERS = {
    '11': { lat: 28.6139, lng: 77.2090 }, // Delhi
    '12': { lat: 29.0588, lng: 76.0856 }, // Haryana
    '13': { lat: 29.0588, lng: 76.0856 }, // Haryana
    '14': { lat: 30.7333, lng: 76.7794 }, // Punjab
    '15': { lat: 30.7333, lng: 76.7794 }, // Punjab
    '17': { lat: 31.1048, lng: 77.1734 }, // Himachal Pradesh
    '20': { lat: 26.8467, lng: 80.9462 }, // Uttar Pradesh (Lucknow center)
    '21': { lat: 26.8467, lng: 80.9462 }, // Uttar Pradesh
    '22': { lat: 26.8467, lng: 80.9462 }, // Uttar Pradesh
    '23': { lat: 26.8467, lng: 80.9462 }, // Uttar Pradesh
    '24': { lat: 26.8467, lng: 80.9462 }, // Uttar Pradesh
    '25': { lat: 26.8467, lng: 80.9462 }, // Uttar Pradesh
    '26': { lat: 26.8467, lng: 80.9462 }, // Uttar Pradesh
    '27': { lat: 26.8467, lng: 80.9462 }, // Uttar Pradesh
    '28': { lat: 26.8467, lng: 80.9462 }, // Uttar Pradesh
    '30': { lat: 26.9124, lng: 75.7873 }, // Rajasthan
    '40': { lat: 19.0760, lng: 72.8777 }, // Maharashtra
    '50': { lat: 17.3850, lng: 78.4867 }, // Telangana
    '56': { lat: 12.9716, lng: 77.5946 }, // Karnataka
    '60': { lat: 13.0827, lng: 80.2707 }, // Tamil Nadu
    '70': { lat: 22.5726, lng: 88.3639 }, // West Bengal
};

export const getPincodeCoordinates = (pincode) => {
    if (!pincode) return null;

    const pincodeStr = pincode.toString().trim();

    // Try exact match first
    if (PINCODE_COORDINATES[pincodeStr]) {
        return PINCODE_COORDINATES[pincodeStr];
    }

    // Fallback to state-level approximation
    const prefix = pincodeStr.substring(0, 2);
    if (STATE_CENTERS[prefix]) {
        // Add small random offset to avoid all markers stacking
        const offset = 0.1;
        return {
            lat: STATE_CENTERS[prefix].lat + (Math.random() - 0.5) * offset,
            lng: STATE_CENTERS[prefix].lng + (Math.random() - 0.5) * offset
        };
    }

    // Default to center of India if unknown
    return { lat: 20.5937, lng: 78.9629 };
};
