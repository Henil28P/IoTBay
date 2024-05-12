const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const User = require('./models/user');

const app = express();

// MongoDB connection string
const uri = "mongodb+srv://Juhil:LOcRO08NWfCAoGib@iotbay.w6qgafn.mongodb.net/?retryWrites=true&w=majority&appName=IoTBay";

// Create a new MongoClient
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Connect to MongoDB
async function connectToDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const database = client.db("test");
    const usersCollection = database.collection("users");
    
    // Set EJS as the view engine
    app.set('view engine', 'ejs');

    // Body parser middleware
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    // Routes
    app.get('/', (req, res) => {
      res.render('login');
    });

    app.post('/login', async (req, res) => {
      const { username, password } = req.body;
      const user = await usersCollection.findOne({ username, password });
      if (!user) {
        res.send('Invalid username or password');
      } else {
        res.render('dashboard', { username: user.username });
      }
    });

    // Start server
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

connectToDB();