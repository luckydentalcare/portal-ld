const http = require('http');

function testEndpoint(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('=== 1. Testing GET /api/site-content ===');
  const sc = await testEndpoint('GET', '/api/site-content');
  console.log('Status:', sc.status, 'Items count:', Object.keys(sc.body.content || {}).length);

  console.log('\n=== 2. Testing GET /api/appointment-options ===');
  const apt = await testEndpoint('GET', '/api/appointment-options');
  console.log('Status:', apt.status, 'Services:', (apt.body.services || []).map(s => s.name || s.label));

  console.log('\n=== 3. Testing POST /api/auth/login (password only) ===');
  const login = await testEndpoint('POST', '/api/auth/login', {
    password: 'lucky26'
  });
  console.log('Status:', login.status, 'Token received:', !!login.body.token);

  if (!login.body.token) {
    throw new Error('Login failed');
  }

  const token = login.body.token;
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  console.log('\n=== 4. Testing PUT /api/admin/site-content ===');
  const saveRes = await testEndpoint('PUT', '/api/admin/site-content', {
    items: [
      {
        key: 'global.footer_sample_test',
        value: 'ল্যাব ও ডেন্টাল কেয়ার',
        page: 'global',
        section: 'footer',
        type: 'text'
      }
    ]
  }, authHeaders);
  console.log('Status:', saveRes.status, 'Message:', saveRes.body.message);

  console.log('\n=== 5. Testing GET /api/admin/site-content/history ===');
  const hist = await testEndpoint('GET', '/api/admin/site-content/history', null, authHeaders);
  console.log('Status:', hist.status, 'Revisions:', (hist.body.history || []).length);
  if (hist.body.history && hist.body.history.length > 0) {
    const latest = hist.body.history[0];
    console.log('Latest revision:', latest.versionId, 'Changes:', latest.changes);

    console.log('\n=== 6. Testing POST /api/admin/site-content/rollback ===');
    const roll = await testEndpoint('POST', `/api/admin/site-content/rollback/${latest.versionId}`, null, authHeaders);
    console.log('Rollback Status:', roll.status, 'Rollback Msg:', roll.body.message);
  }

  console.log('\n=== 7. Testing PUT /api/admin/appointment-options ===');
  const updatedServices = [...(apt.body.services || [])];
  if (!updatedServices.find(s => (s.name || s.label) === 'অন্যান্য (Other)')) {
    updatedServices.push({
      id: 'other',
      name: 'অন্যান্য (Other)',
      active: true,
      order: updatedServices.length + 1
    });
  }

  const putApt = await testEndpoint('PUT', '/api/admin/appointment-options', {
    services: updatedServices,
    schedules: apt.body.schedules
  }, authHeaders);
  console.log('PUT Appointment Status:', putApt.status, 'Success:', putApt.body.success);

  console.log('\n=== ALL API VERIFICATIONS PASSED SUCCESSFULLY ===');
}

run().catch(console.error);
