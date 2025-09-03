// ✅ ENHANCED: Load testing com business metrics
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics para business intelligence
const loginSuccessRate = new Rate('login_success_rate');
const registerSuccessRate = new Rate('register_success_rate');
const qrGenerationTime = new Trend('qr_generation_time');
const totalFlowTime = new Trend('total_flow_time');

// ✅ CONFIGURAÇÃO REALISTA SUPABASE PRO
export let options = {
  stages: [
    { duration: '1m', target: 10 },  // Warm-up
    { duration: '2m', target: 30 },  // Ramp-up
    { duration: '3m', target: 60 },  // Target load (Supabase Pro limit)
    { duration: '2m', target: 40 },  // Sustain
    { duration: '1m', target: 0 }    // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'],     // 95% requests <100ms
    http_req_failed: ['rate<0.02'],       // <2% failure rate
    checks: ['rate>0.98'],                // >98% success rate
    login_success_rate: ['rate>0.95'],    // >95% login success
    register_success_rate: ['rate>0.90'], // >90% register success
    qr_generation_time: ['p(95)<50'],     // 95% QR generation <50ms
    total_flow_time: ['p(95)<200']        // 95% total flow <200ms
  }
};

// Dados de teste realistas
const testUsers = [
  { phone: '+351911000001', firstName: 'João', lastName: 'Silva', email: 'joao1@test.com' },
  { phone: '+351911000002', firstName: 'Maria', lastName: 'Santos', email: 'maria1@test.com' },
  { phone: '+351911000003', firstName: 'Pedro', lastName: 'Costa', email: 'pedro1@test.com' },
  { phone: '+351911000004', firstName: 'Ana', lastName: 'Oliveira', email: 'ana1@test.com' },
  { phone: '+351911000005', firstName: 'Carlos', lastName: 'Ferreira', email: 'carlos1@test.com' }
];

const eventId = '985280fa-b0fb-4f7d-aa16-ecbbdadd554a'; // Event real
const baseUrl = 'http://localhost:3000';

export default function() {
  const flowStartTime = new Date();
  
  // Selecionar user aleatório
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const uniquePhone = user.phone.replace('000000', String(Math.floor(Math.random() * 999999)).padStart(6, '0'));
  const uniqueEmail = user.email.replace('@test.com', `${Math.floor(Math.random() * 10000)}@test.com`);
  
  // 1. Verificar telefone
  const phoneCheckResponse = http.post(`${baseUrl}/api/guest/verify-phone`, JSON.stringify({
    phone: uniquePhone
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(phoneCheckResponse, {
    'phone check status 200': (r) => r.status === 200,
    'phone check response time <50ms': (r) => r.timings.duration < 50
  });
  
  const phoneResult = JSON.parse(phoneCheckResponse.body);
  
  if (phoneResult.exists) {
    // 2A. Login flow (enhanced)
    const loginResponse = http.post(`${baseUrl}/api/guest/login-enhanced`, JSON.stringify({
      phone: uniquePhone,
      password: 'TestPass123',
      eventId: eventId,
      promoterId: null,
      teamId: null
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const loginSuccess = check(loginResponse, {
      'login status 200 or 401': (r) => r.status === 200 || r.status === 401,
      'login response time <100ms': (r) => r.timings.duration < 100,
      'login has structured response': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('success') && body.hasOwnProperty('error_type');
        } catch { return false; }
      }
    });
    
    loginSuccessRate.add(loginResponse.status === 200);
    
    if (loginResponse.status === 200) {
      const loginResult = JSON.parse(loginResponse.body);
      if (loginResult.performance?.total_duration_ms) {
        qrGenerationTime.add(loginResult.performance.total_duration_ms);
      }
    }
    
  } else {
    // 2B. Register flow (enhanced)
    const registerResponse = http.post(`${baseUrl}/api/guest/register-enhanced`, JSON.stringify({
      phone: uniquePhone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: uniqueEmail,
      password: 'TestPass123',
      eventId: eventId,
      promoterId: null,
      teamId: null,
      birthDate: '1990-01-01',
      gender: 'M',
      city: 'Lisboa'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const registerSuccess = check(registerResponse, {
      'register status 200 or 400': (r) => r.status === 200 || r.status === 400,
      'register response time <150ms': (r) => r.timings.duration < 150,
      'register has structured response': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('success') && body.hasOwnProperty('error_type');
        } catch { return false; }
      }
    });
    
    registerSuccessRate.add(registerResponse.status === 200);
    
    if (registerResponse.status === 200) {
      const registerResult = JSON.parse(registerResponse.body);
      if (registerResult.performance?.total_duration_ms) {
        qrGenerationTime.add(registerResult.performance.total_duration_ms);
      }
    }
  }
  
  // 3. Health check
  const healthResponse = http.get(`${baseUrl}/api/guest/health`);
  check(healthResponse, {
    'health check available': (r) => r.status === 200 || r.status === 503,
    'health check response time <25ms': (r) => r.timings.duration < 25
  });
  
  // Calculate total flow time
  const flowEndTime = new Date();
  const totalFlowDuration = flowEndTime.getTime() - flowStartTime.getTime();
  totalFlowTime.add(totalFlowDuration);
  
  // Simulate realistic user behavior
  sleep(Math.random() * 2 + 1); // 1-3 seconds between requests
}

// ✅ ENHANCED: Setup e teardown functions
export function setup() {
  console.log('🚀 Starting enhanced load test...');
  console.log('📊 Testing endpoints:');
  console.log('   - /api/guest/verify-phone');
  console.log('   - /api/guest/login-enhanced');
  console.log('   - /api/guest/register-enhanced');
  console.log('   - /api/guest/health');
  console.log('🎯 Target: 60 concurrent users (Supabase Pro limit)');
}

export function teardown(data) {
  console.log('✅ Load test completed');
  console.log('📈 Check metrics in K6 output for:');
  console.log('   - login_success_rate');
  console.log('   - register_success_rate');
  console.log('   - qr_generation_time');
  console.log('   - total_flow_time');
}
