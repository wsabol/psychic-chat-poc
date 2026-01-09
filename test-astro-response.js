// Test to compare what /user-astrology/:userId returns for temp vs established users
// For temp user ID: zVNdNMhj9UNNgTpcKeKgv1j1m3y1
// Expected: should include moon_sign, rising_sign in astrology_data

const tempUserId = "zVNdNMhj9UNNgTpcKeKgv1j1m3y1";

fetch(`http://localhost:3000/user-astrology/${tempUserId}`, {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN_HERE' }
})
.then(r => r.json())
.then(data => {
  console.log('TEMP USER RESPONSE:');
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error('Error:', err));
