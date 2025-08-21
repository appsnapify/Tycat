const https = require('https');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/debug/guests?event_id=45075409-5556-499b-9a59-61b8da8af98c&limit=10',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🔍 Testando API de debug dos guests...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('\n📊 RESULTADO DA API:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.recent_guests && result.recent_guests.data) {
        console.log('\n🕐 ANÁLISE DE TIMESTAMPS:');
        result.recent_guests.data.forEach((guest, index) => {
          console.log(`\n👤 Guest ${index + 1}: ${guest.name}`);
          console.log(`   ID: ${guest.id}`);
          console.log(`   Checked In: ${guest.checked_in}`);
          console.log(`   Created At: ${guest.created_at}`);
          console.log(`   Updated At: ${guest.updated_at}`);
          console.log(`   Checked In At: ${guest.checked_in_at || 'null'}`);
          console.log(`   Check In Time: ${guest.check_in_time || 'null'}`);
          
          // Converter para horário Portugal
          if (guest.created_at) {
            const created = new Date(guest.created_at);
            console.log(`   Created (PT): ${created.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}`);
          }
          if (guest.updated_at) {
            const updated = new Date(guest.updated_at);
            console.log(`   Updated (PT): ${updated.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}`);
          }
          if (guest.checked_in_at) {
            const checkedInAt = new Date(guest.checked_in_at);
            console.log(`   CheckInAt (PT): ${checkedInAt.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}`);
          }
          if (guest.check_in_time) {
            const checkInTime = new Date(guest.check_in_time);
            console.log(`   CheckInTime (PT): ${checkInTime.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}`);
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Erro ao parsear JSON:', error);
      console.log('Response raw:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error);
});

req.end(); 