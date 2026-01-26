// Node.js script to fetch all paginated TeamUp API data for instructors and events
// Usage: node fetch-teamup-data.js

const fs = require('fs');
const https = require('https');

const API_TOKEN = 'oSZJSqhkc9dX6eqdijpcUEBMT5VqCm';
const BASE_URL = 'https://goteamup.com/api/v2';
const HEADERS = {
  'accept': 'application/json',
  'authorization': `Token ${API_TOKEN}`,
  'user-agent': 'CenturionTestSeeder/1.0',
};

function fetchAllPages(endpoint, pageSize = 100) {
  let page = 1;
  let results = [];

  function fetchPage(resolve, reject) {
    const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}&page_size=${pageSize}`;
    https.get(url, { headers: HEADERS }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
        const json = JSON.parse(data);
        if (Array.isArray(json.results)) {
          results = results.concat(json.results);
          if (json.next) {
            page++;
            fetchPage(resolve, reject);
          } else {
            resolve(results);
          }
        } else {
          reject(new Error('Unexpected API response'));
        }
      });
    }).on('error', reject);
  }

  return new Promise(fetchPage);
}

async function main() {
  // Fetch instructors
  console.log('Fetching all instructors...');
  const instructors = await fetchAllPages('/instructors?sort=name');
  fs.writeFileSync('testing/instructors.json', JSON.stringify({ results: instructors }, null, 2));
  console.log(`Saved ${instructors.length} instructors to testing/instructors.json`);

  // Fetch all events (appointments)
  console.log('Fetching all appointments/events...');
  const events = await fetchAllPages('/events?category=&expand=instructors%2Cactive_registration_status%2Ccategory%2Coffering_type%2Coffering_type.category%2Cvenue&fields=id%2Cname%2Cmax_occupancy%2Coccupancy%2Cattending_count%2Cstarts_at%2Cends_at%2Cwaiting_count%2Cwaitlist_max_override%2Cactive_registration_status%2Ccategory.name%2Coffering_type.background_color%2Coffering_type.waitlist_max%2Coffering_type.schedule_type%2Coffering_type.category.name%2Coffering_type.max_allowed_age%2Coffering_type.min_allowed_age%2Cvenue%2Ccustomer_url%2Cdescription%2Cis_appointment%2Cis_full&instructors=&offering_types=&sort=start&starts_at_gte=2025-12-28T00%3A00%2B00%3A00&starts_at_lte=2026-01-31T23%3A59%2B00%3A00&status=active&venues=');
  fs.writeFileSync('testing/appointments.json', JSON.stringify({ results: events }, null, 2));
  console.log(`Saved ${events.length} appointments/events to testing/appointments.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
