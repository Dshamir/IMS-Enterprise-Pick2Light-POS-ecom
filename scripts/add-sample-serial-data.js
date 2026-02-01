#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Connect to database
const dbPath = path.join(__dirname, '..', 'data', 'inventory.db');
const db = new Database(dbPath);

// Sample data with EXACT format specified by user
const sampleData = [
  {
    // Serial: "RTPCR25PIV-RTPCR-V5W-00001"
    model: 'RTPCR25',
    num_wells: 'PIV',
    kind: 'RTPCR',
    version: 'V5',
    color_code: 'W',
    counter: 1,
    production_year: 250709,
    use_case: 'LAB',
    application: 'Laboratory Testing',
    machine_name: 'RTPCR-LAB-001',
    note: 'Sample data for testing'
  },
  {
    // Serial: "RTPCR25PIV-RTPCR-V5W-00002"
    model: 'RTPCR25',
    num_wells: 'PIV',
    kind: 'RTPCR',
    version: 'V5',
    color_code: 'W',
    counter: 2,
    production_year: 250709,
    use_case: 'NEX',
    application: 'Research',
    machine_name: 'RTPCR-NEX-002',
    note: 'Sample data for testing'
  },
  {
    // Serial: "RTPCR25PIV-RTPCR-V5W-00003"
    model: 'RTPCR25',
    num_wells: 'PIV',
    kind: 'RTPCR',
    version: 'V5',
    color_code: 'W',
    counter: 3,
    production_year: 250709,
    use_case: 'MIT',
    application: 'Academic Research',
    machine_name: 'RTPCR-MIT-003',
    note: 'Sample data for testing'
  },
  {
    // Serial: "RTPCR25PIV-RTPCR-V5W-00004"
    model: 'RTPCR25',
    num_wells: 'PIV',
    kind: 'RTPCR',
    version: 'V5',
    color_code: 'W',
    counter: 4,
    production_year: 250709,
    use_case: 'CAE',
    application: 'Clinical Analysis',
    machine_name: 'RTPCR-CAE-004',
    note: 'Sample data for testing'
  },
  {
    // Serial: "RTPCR25PIV-RTPCR-V5W-00005"
    model: 'RTPCR25',
    num_wells: 'PIV',
    kind: 'RTPCR',
    version: 'V5',
    color_code: 'W',
    counter: 5,
    production_year: 250709,
    use_case: 'ARMY',
    application: 'Military Testing',
    machine_name: 'RTPCR-ARMY-005',
    note: 'Sample data for testing'
  }
];

// Function to generate serial number with EXACT format
function generateSerialNumber(data) {
  // Format: MODEL+NUMWELLS-KIND-VERSION+COLORCODE-COUNTER
  // Example: "RTPCR25PIV-RTPCR-V5W-00001"
  const { model, num_wells, kind, version, color_code, counter } = data;
  return `${model}${num_wells}-${kind}-${version}${color_code}-${counter.toString().padStart(5, '0')}`;
}

console.log('🚀 Adding sample serial number data...');

// Clear existing data (optional)
const clearExisting = process.argv.includes('--clear');
if (clearExisting) {
  console.log('🧹 Clearing existing serial number data...');
  db.prepare('DELETE FROM serial_number_registry').run();
}

// Insert sample data
const insertStmt = db.prepare(`
  INSERT INTO serial_number_registry (
    id, serial_number, counter, model, kind, use_case, version, production_year,
    num_wells, application, machine_name, note, input_specs, color_code, color,
    self_test_by, calibrated_by, used_by, calibration_date, recalibration_date,
    status, imported_from_excel, created_by, updated_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let insertedCount = 0;

for (const data of sampleData) {
  const serialNumber = generateSerialNumber(data);
  
  console.log(`📝 Creating serial: ${serialNumber}`);
  
  try {
    const id = uuidv4();
    insertStmt.run(
      id, serialNumber, data.counter, data.model, data.kind, data.use_case, 
      data.version, data.production_year, data.num_wells, data.application, 
      data.machine_name, data.note, '', data.color_code, '',
      '', '', '', '', '', 'active', 0, 'sample_data', 'sample_data'
    );
    insertedCount++;
  } catch (error) {
    console.error(`❌ Error inserting ${serialNumber}:`, error.message);
  }
}

// Verify the data
console.log('\n🔍 Verifying inserted data...');
const verifyStmt = db.prepare('SELECT serial_number, counter, model, kind, use_case FROM serial_number_registry ORDER BY counter');
const results = verifyStmt.all();

results.forEach(row => {
  console.log(`✅ Counter ${row.counter.toString().padStart(5, '0')}: ${row.serial_number} (${row.use_case})`);
});

console.log(`\n🎉 Successfully inserted ${insertedCount} sample serial numbers!`);
console.log(`📊 Total records in database: ${results.length}`);

// Close database
db.close();