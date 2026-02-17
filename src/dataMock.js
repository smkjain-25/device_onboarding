const now = Date.now() / 1000;
const day = 86400;

// Helper to generate many devices
const generateDevices = (count, startId, instituteId, isLocked = false) => {
    // Diverse pincodes across India for realistic visualization
    const pincodes = [
        '110001', '110002', '110005', // Delhi
        '400001', '400051', '400002', // Mumbai
        '560001', '560002', '560003', // Bangalore
        '600001', '600002', '600003', // Chennai
        '700001', '700002', '700003', // Kolkata
        '500001', '500002', '500003', // Hyderabad
        '411001', '411002', '411003', // Pune
        '380001', '380002', '380003', // Ahmedabad
        '302001', '302002', '302003', // Jaipur
    ];

    return Array.from({ length: count }, (_, i) => {
        const pincode = pincodes[i % pincodes.length];
        const types = ['School', 'Coaching Center', 'Degree College', 'Private Business', 'Personal Home', 'Others', 'Non-Profit Organization', 'Government Office'];
        const instituteType = types[i % types.length];
        return {
            "_id": `mock_id_${startId + i}`,
            "c": now - (Math.random() * day * 10), // Random creation in last 10 days
            "u": now - (Math.random() * day * 5),
            "deleted": false,
            "unique_device_id": `dev_${startId + i}`,
            "device_serial_no": `SN${startId + i}`,
            "device_name": `Device ${i}`,
            "linking_code": `LC${startId + i}`,
            "institute_id": instituteId,
            "institute_type": instituteType,
            "user_id": `user_${i}`,
            "last_used_details": {},
            "linking_source": "IFP",
            "guest_class_id": null,
            "linking_progress": {
                "customer_onboarding": true,
                "device_setup": true,
                "room_setup": true
            },
            // Locked status
            "is_locked": isLocked,
            "locked_at": isLocked ? (now - (Math.random() * day * 2)) : null, // Locked recently
            "device_images": {},
            "meta": {
                "is_training_required": true,
                "installation_date": "02/06/2025"
            },
            "installation_date": null,
            "manual_serial_num": false,
            "app_id": null,
            "device_ip_address": null,
            "customer_onboard_flow": false,
            "cctv_reports": {},
            "cctv_fcm_token": null,
            "bypass_data": {},
            "institute_name": `Institute ${instituteId}`,
            "institute_address": {
                "country": "India",
                "pincode": pincode
            },
            "country": "India",
            "pincode": pincode
        };
    });
};

const baseData = [
    {
        "_id": "683dab9560a4880bf9830bde",
        "c": now - (2 * 3600), // Today
        "u": now - (1 * 3600),
        "deleted": false,
        "unique_device_id": "rw20",
        "device_serial_no": "128901",
        "device_name": "Room A",
        "linking_code": "LEK16Q",
        "institute_id": "HOM833",
        "user_id": null,
        "last_used_details": {},
        "linking_source": "IFP",
        "guest_class_id": null,
        "linking_progress": {
            "customer_onboarding": true,
            "device_setup": true,
            "room_setup": true
        },
        "is_locked": false,
        "locked_at": null,
        "device_images": {
            "front_upload": "https://tmx-whiteboard-dev.storage.googleapis.com/whiteboard/9ef023d3-439b-4876-9cd1-12ded3f94c62.pdf"
        },
        "meta": {
            "is_training_required": true,
            "installation_date": "02/06/2025"
        },
        "installation_date": null,
        "manual_serial_num": false,
        "app_id": null,
        "device_ip_address": null,
        "customer_onboard_flow": false,
        "cctv_reports": {},
        "cctv_fcm_token": null,
        "bypass_data": {},
        "institute_name": "Home",
        "institute_address": {
            "country": "India",
            "pincode": "123456"
        },
        "country": "India",
        "pincode": "123456"
    },
    {
        "_id": "683dab9560a4880bf9830bdd",
        "c": now - (day * 2), // 2 days ago
        "u": now - (day * 1), // 1 day ago (Delinked yesterday)
        "deleted": true,
        "linking_source": "ADMIN_WEB",
        "linking_progress": {
            "customer_onboarding": true,
            "device_setup": true,
            "room_setup": true
        },
        "is_locked": false,
        "locked_at": null
    },
    {
        "_id": "683dab9560a4880bf9830bdc",
        "c": now - (day * 5), // 5 days ago
        "u": now - (day * 5),
        "deleted": false,
        "linking_source": "CUSTOMER_ONBOARD_MOBILE",
        "linking_progress": {
            "customer_onboarding": true,
            "device_setup": true,
            "room_setup": true
        },
        "is_locked": true,
        "locked_at": now - (3600 * 5), // Locked 5 hours ago (Today)
        "linking_code": "TESTLC123"
    }
];

// Add a High Volume Institute (120 devices)
const highVolDevices = generateDevices(120, 1000, "BIG_INST_1");
// Add a Normal Institute (50 devices)
const normalDevices = generateDevices(50, 2000, "MED_INST_1");
// Add some locked devices in another institute
const lockedDevices = generateDevices(10, 3000, "LOCKED_INST_1", true);

export const mockData = [...baseData, ...highVolDevices, ...normalDevices, ...lockedDevices];
