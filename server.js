const express = require('express');
const path = require('path');

const app = express();

// Set the view directory
app.set('views', path.join(__dirname, 'views'));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Serve static files from the public directory (optional)
app.use(express.static(path.join(__dirname, 'public')));

// Route to render the index.ejs file
app.get('/', (req, res) => {
  res.render('index');
});

// Start the server and listen on port 8080
app.listen(8080, () => {
  console.log('Server listening on port 8080');
});