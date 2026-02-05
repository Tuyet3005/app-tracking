const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/echo', (req, res) => {
  const text = req.body.text || '';
  res.json({ text });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
