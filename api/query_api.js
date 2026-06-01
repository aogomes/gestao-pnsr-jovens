const http = require('http');

http.get('http://localhost:3001/trabalhos', { headers: { 'Authorization': 'Bearer test' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
}).on('error', (err) => {
  console.log('Error: ', err.message);
});
