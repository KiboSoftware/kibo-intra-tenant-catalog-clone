import express from 'express';
const app = express();
app.all('/', (req, res) => {
  console.log( new Date().toISOString() + ' ' + req.method + ' ' + req.url );
  res.send('Hello, world!');
});
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});


