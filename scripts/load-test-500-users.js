import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Counter, Trend } from 'k6/metrics';

// Métricas customizadas
export let errorRate = new Rate('errors');
export let successfulRegistrations = new Counter('successful_registrations');
export let successfulLogins = new Counter('successful_logins');
export let qrCodesGenerated = new Counter('qr_codes_generated');
export let apiResponseTime = new Trend('api_response_time');

// Configuração do teste de carga
export let options = {
  stages: [
    { duration: '1m', target: 50 },    // Aquecimento gradual
    { duration: '2m', target: 200 },   // Crescimento para 200 users
    { duration: '3m', target: 350 },   // Crescimento para 350 users
    { duration: '5m', target: 500 },   // PICO: 500 usuários simultâneos
    { duration: '5m', target: 500 },   // Sustentação do pico
    { duration: '2m', target: 200 },   // Redução gradual
    { duration: '1m', target: 50 },    // Cool down
    { duration: '1m', target: 0 },     // Finalização
  ],
  thresholds: {
    // Critérios de sucesso do teste
    'http_req_duration': ['p(95)<1000'],  // 95% das requests < 1s
    'http_req_duration{name:verify_phone}': ['p(95)<100'],  // Phone verification < 100ms
    'http_req_duration{name:queue_job}': ['p(95)<200'],     // Queue jobs < 200ms
    'errors': ['rate<0.01'],              // Taxa de erro < 1%
    'http_req_failed': ['rate<0.01'],     // Falhas HTTP < 1%
    'successful_registrations': ['count>100'],  // Pelo menos 100 registros
    'qr_codes_generated': ['count>100'],        // Pelo menos 100 QR codes
  },
  // Configurações adicionais
  noConnectionReuse: false,
  userAgent: 'K6LoadTest/1.0 (Snapify Guest System Revolution Test)',
};

// Configurações do teste
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_EVENT_ID = __ENV.EVENT_ID || 'test-event-' + Math.random().toString(36).substring(7);
const TEST_PROMOTER_ID = __ENV.PROMOTER_ID || 'test-promoter-' + Math.random().toString(36).substring(7);
const TEST_TEAM_ID = __ENV.TEAM_ID || 'test-team-' + Math.random().toString(36).substring(7);

console.log(`🚀 Starting load test against: ${BASE_URL}`);
console.log(`📊 Test Event ID: ${TEST_EVENT_ID}`);

export default function () {
  // Simular comportamento real de usuários
  const userBehavior = Math.random();
  const phone = generatePortuguesePhone();
  const isNewUser = userBehavior > 0.4; // 60% novos usuários, 40% login
  
  let testPhase = getCurrentPhase();
  
  try {
    // STEP 1: Verificar telefone (sempre executado)
    const phoneVerificationResult = verifyPhone(phone);
    
    if (!phoneVerificationResult.success) {
      errorRate.add(1);
      return;
    }
    
    const phoneExists = phoneVerificationResult.exists;
    
    // STEP 2: Decidir entre login ou registro
    if (phoneExists && !isNewUser) {
      // Fazer login
      performLogin(phone, phoneVerificationResult.user);
    } else {
      // Fazer registro
      performRegistration(phone);
    }
    
    // Simular pausa entre ações (comportamento humano)
    sleep(Math.random() * 2 + 1); // 1-3 segundos
    
  } catch (error) {
    console.error(`❌ User simulation error: ${error.message}`);
    errorRate.add(1);
  }
}

// Verificação de telefone
function verifyPhone(phone) {
  const startTime = new Date();
  
  let response = http.post(`${BASE_URL}/api/guest/verify-phone-v2`, 
    JSON.stringify({ phone }), 
    { 
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'verify_phone' }
    }
  );
  
  const responseTime = new Date() - startTime;
  apiResponseTime.add(responseTime);
  
  const success = check(response, {
    'phone verification status 200': (r) => r.status === 200,
    'phone verification response time < 100ms': (r) => r.timings.duration < 100,
    'phone verification has success field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('success');
      } catch {
        return false;
      }
    }
  });
  
  if (!success) {
    errorRate.add(1);
    return { success: false };
  }
  
  try {
    const result = JSON.parse(response.body);
    return {
      success: result.success,
      exists: result.exists,
      user: result.user,
      source: result.source
    };
  } catch (error) {
    errorRate.add(1);
    return { success: false };
  }
}

// Processo de login
function performLogin(phone, user) {
  const password = 'TestPassword123!'; // Password padrão para testes
  
  const startTime = new Date();
  
  let response = http.post(`${BASE_URL}/api/guest/login-v2`,
    JSON.stringify({
      phone,
      password,
      eventId: TEST_EVENT_ID,
      promoterId: TEST_PROMOTER_ID,
      teamId: TEST_TEAM_ID
    }),
    { 
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'queue_job', job_type: 'login' }
    }
  );
  
  const responseTime = new Date() - startTime;
  apiResponseTime.add(responseTime);
  
  const loginSuccess = check(response, {
    'login status 200': (r) => r.status === 200,
    'login response time < 200ms': (r) => r.timings.duration < 200,
    'login job id returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.jobId;
      } catch {
        return false;
      }
    }
  });
  
  if (!loginSuccess) {
    errorRate.add(1);
    return;
  }
  
  try {
    const result = JSON.parse(response.body);
    if (result.success && result.jobId) {
      successfulLogins.add(1);
      
      // Verificar status do job (polling)
      const qrCode = pollJobStatus(result.jobId, 'login');
      if (qrCode) {
        qrCodesGenerated.add(1);
      }
    }
  } catch (error) {
    errorRate.add(1);
  }
}

// Processo de registro
function performRegistration(phone) {
  const userData = generateUserData(phone);
  
  const startTime = new Date();
  
  let response = http.post(`${BASE_URL}/api/guest/register-v2`,
    JSON.stringify({
      ...userData,
      eventId: TEST_EVENT_ID,
      promoterId: TEST_PROMOTER_ID,
      teamId: TEST_TEAM_ID
    }),
    { 
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'queue_job', job_type: 'register' }
    }
  );
  
  const responseTime = new Date() - startTime;
  apiResponseTime.add(responseTime);
  
  const registerSuccess = check(response, {
    'register status 200': (r) => r.status === 200,
    'register response time < 200ms': (r) => r.timings.duration < 200,
    'register job id returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.jobId;
      } catch {
        return false;
      }
    }
  });
  
  if (!registerSuccess) {
    errorRate.add(1);
    return;
  }
  
  try {
    const result = JSON.parse(response.body);
    if (result.success && result.jobId) {
      successfulRegistrations.add(1);
      
      // Verificar status do job (polling)
      const qrCode = pollJobStatus(result.jobId, 'register');
      if (qrCode) {
        qrCodesGenerated.add(1);
      }
    }
  } catch (error) {
    errorRate.add(1);
  }
}

// Polling do status do job
function pollJobStatus(jobId, jobType) {
  const maxAttempts = 15; // 15 segundos máximo
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    let statusResponse = http.get(`${BASE_URL}/api/guest/status/${jobId}`, {
      tags: { name: 'job_status', job_type: jobType }
    });
    
    if (statusResponse.status === 200) {
      try {
        const status = JSON.parse(statusResponse.body);
        
        if (status.status === 'completed' && status.result) {
          const success = check(statusResponse, {
            'job completed successfully': (r) => {
              const body = JSON.parse(r.body);
              return body.result && body.result.success;
            },
            'qr code generated': (r) => {
              const body = JSON.parse(r.body);
              return body.result && body.result.qr_code;
            }
          });
          
          if (success && status.result.qr_code) {
            return status.result.qr_code;
          }
          break;
          
        } else if (status.status === 'failed') {
          errorRate.add(1);
          break;
        }
        
      } catch (error) {
        // Continue polling
      }
    }
    
    sleep(1); // Aguardar 1 segundo antes da próxima tentativa
  }
  
  return null;
}

// Utilitários
function generatePortuguesePhone() {
  const prefixes = ['91', '92', '93', '96', '25', '26'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 9000000) + 1000000;
  return `+351${prefix}${number}`;
}

function generateUserData(phone) {
  const firstNames = ['João', 'Maria', 'António', 'Ana', 'Carlos', 'Catarina', 'Miguel', 'Sofia', 'Pedro', 'Inês'];
  const lastNames = ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Jesus', 'Sousa'];
  const cities = ['Lisboa', 'Porto', 'Braga', 'Coimbra', 'Aveiro', 'Faro', 'Setúbal', 'Évora', 'Leiria', 'Viseu'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  
  return {
    phone,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@test.com`,
    password: 'TestPassword123!',
    city,
    gender: Math.random() > 0.5 ? 'M' : 'F',
    birthDate: '1990-01-01'
  };
}

function getCurrentPhase() {
  // Determinar fase atual baseada no número de usuários virtuais
  const currentVUs = __VU;
  if (currentVUs <= 50) return 'warmup';
  if (currentVUs <= 200) return 'rampup';
  if (currentVUs <= 350) return 'growth';
  if (currentVUs <= 500) return 'peak';
  return 'cooldown';
}

// Função executada no final do teste
export function teardown(data) {
  console.log('🏁 Load test completed!');
  console.log('📊 Final Results Summary:');
  console.log(`   - Successful Registrations: ${successfulRegistrations.count || 0}`);
  console.log(`   - Successful Logins: ${successfulLogins.count || 0}`);
  console.log(`   - QR Codes Generated: ${qrCodesGenerated.count || 0}`);
  console.log(`   - Error Rate: ${(errorRate.rate * 100).toFixed(2)}%`);
}

// Função executada no início do teste
export function setup() {
  console.log('🎯 Setting up load test environment...');
  console.log(`📈 Target: 500 concurrent users`);
  console.log(`⏱️  Duration: ~20 minutes`);
  console.log(`🎯 Success criteria:`);
  console.log(`   - 95% of requests < 1s`);
  console.log(`   - Phone verification < 100ms`);
  console.log(`   - Error rate < 1%`);
  console.log(`   - At least 100 successful operations`);
  
  return { startTime: new Date() };
}
