const fs = require('fs');
const path = require('path');

// Local CSV file path
const CSV_FILE = path.join(__dirname, '../pincodes-final.csv.csv');
const TARGET_FILE = path.join(__dirname, '../src/pincodeCoordinates.json');

console.log(`Reading pincode data from ${CSV_FILE}...`);

try {
    const data = fs.readFileSync(CSV_FILE, 'utf8');
    console.log(`Data read. Size: ${(data.length / 1024).toFixed(2)} KB. Parsing...`);

    const lines = data.split('\n');
    let updates = {};
    let count = 0;
    let skipped = 0;

    // Read existing file first to merge
    let existingData = {};
    if (fs.existsSync(TARGET_FILE)) {
        try {
            existingData = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'));
            console.log(`Read ${Object.keys(existingData).length} existing pincodes.`);
        } catch (e) {
            console.log('Could not read existing file or it was empty.');
        }
    }

    // Parse new data
    // CSV Header: circlename,regionname,divisionname,officename,pincode,officetype,delivery,district,statename,latitude,longitude
    // Indices: pincode=4, statename=8, latitude=9, longitude=10

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Use a regex to handle potential commas in quoted fields, though this dataset looks simple
        // For now, simple split is likely sufficient based on the head output
        const parts = line.split(',');

        if (parts.length < 11) {
            skipped++;
            continue;
        }

        const pincode = parts[4].trim();
        const city = parts[7].trim(); // district
        const state = parts[8].trim();
        const latStr = parts[9].trim();
        const lngStr = parts[10].trim();

        // Validate pincode (6 digits)
        if (pincode && /^\d{6}$/.test(pincode)) {
            // Check for valid lat/lng (not "NA" and is a number)
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);

            if (!isNaN(lat) && !isNaN(lng) && latStr !== 'NA' && lngStr !== 'NA') {
                // If the pincode already exists in updates (duplicate in CSV), 
                // we can just overwrite or skip. Overwriting is fine.
                updates[pincode] = {
                    lat: lat,
                    lng: lng,
                    state: state,
                    city: city
                };
                count++;
            } else {
                skipped++;
            }
        } else {
            skipped++;
        }
    }

    console.log(`Parsed ${count} valid pincodes from CSV.`);
    console.log(`Skipped ${skipped} lines (invalid format, NA lat/lng, or duplicates handled implicitly).`);

    // Merge: New data should probably take precedence for accuracy if the user provided it
    // But we also want to keep existing data if the new file doesn't cover it.
    const mergedData = { ...existingData, ...updates };
    const finalCount = Object.keys(mergedData).length;

    console.log(`Final dataset size: ${finalCount} pincodes.`);

    fs.writeFileSync(TARGET_FILE, JSON.stringify(mergedData, null, 2));
    console.log(`Successfully updated ${TARGET_FILE}`);

} catch (err) {
    console.error('Error processing data:', err.message);
}
