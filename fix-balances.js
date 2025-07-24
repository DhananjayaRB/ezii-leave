// Run this in browser console to fix Sunil Kumar P's missing balance
fetch('/api/fix-missing-balances', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Org-Id': '18'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Balance fix result:', data);
})
.catch(error => {
  console.error('Error:', error);
});