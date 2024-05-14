// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Create Express application
const app = express();

// MongoDB connection string
const uri = "mongodb+srv://Juhil:LOcRO08NWfCAoGib@iotbay.w6qgafn.mongodb.net/?retryWrites=true&w=majority&appName=IoTBay";

// Create a new MongoClient instance
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to MongoDB
async function connectToDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    // Access database and collections
    const database = client.db("test");
    const usersCollection = database.collection("users");
    const ProductsCollection = database.collection("products");

    // Configure Express settings
    app.set('view engine', 'ejs'); // Set EJS as the view engine
    app.use(express.static('public')); // Serve static files from 'public' directory
    app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
    app.use(cookieParser()); // Parse cookies
    app.use(session({ // Session middleware
        secret: '123',
        resave: false,
        saveUninitialized: true
    }));
    app.use((req, res, next) => { // Middleware to make session cart available globally
      res.locals.cart = req.session.cart || {};
      next();
    });
    app.use(bodyParser.urlencoded({ extended: false })); // Parse JSON bodies
    app.use(bodyParser.json());

    // Fetch all products
    const products = await ProductsCollection.find({}).toArray();

    // Routes definition

    // Render index page with products
    app.get('/', (req, res) => {
      try {
        res.render('index', { products });
      } catch (error) {
        console.log('Error in fetching products:', error);
        res.status(500).send('Error in fetching products');
      }
    });

    // Alias route for index
    app.get('/index', (req, res) => {
      try {
        res.render('index', { products });
      } catch (error) {
        console.log('Error in fetching products:', error);
        res.status(500).send('Error in fetching products');
      }
    });

    // Render login page
    app.get('/login', function(req, res){
      try {
        res.render('login');
      } catch (error) {
        console.log('Error in login loading:', error);
        res.status(500).send('Error in login loading');
      }
    });

    // Render cart page with session cart data
    app.get('/cart', function(req, res){
      try {
        res.render('cart', { cart: req.session.cart, products: products });
      } catch (error) {
        console.log('Error in cart loading:', error);
        res.status(500).send('Error in cart loading');
      }
    });

    // Handle login post request
    app.post('/login', async (req, res) => {
      const { username, password } = req.body;
      const user = await usersCollection.findOne({ username, password });
      if (!user) {
        res.send('Invalid username or password');
      } else {
        res.render('dashboard', {
          username: user.username
        });
      }
    });

    // Logout route
    app.get('/logout', (req, res) => {
      try {
        // Clear the session data
        req.session.destroy((err) => {
          if (err) {
            console.error('Error clearing session:', err);
            res.status(500).send('Error clearing session');
          } else {
            // Redirect the user to the login page or any other appropriate page
            res.redirect('/login');
          }
        });
      } catch (error) {
        console.error('Error in logout:', error);
        res.status(500).send('Error in logout');
      }
    });

    // Handle adding products to cart
    app.post('/addToCart', async (req, res) => {
      try {
        const productId = req.body.productId;
        let quantityToAdd = parseInt(req.body.quantity); // Parse quantity to integer
        
        // Aggregate query to retrieve the product details
        const productAggregate = await ProductsCollection.aggregate([
          { $match: { _id: new ObjectId(productId) } }
        ]).toArray();
        
        // Check if product exists
        if (productAggregate.length === 0) {
          return res.status(404).send('Product not found');
        }
        
        // Extract the product from the array
        const product = productAggregate[0];
        
        // Set the maximum quantity to the available stock (DeviceStock)
        const maxQuantity = product.DeviceStock;
        
        // Initialize cart in session if not already exists
        req.session.cart = req.session.cart || {};
        
        // Calculate the total quantity of the product in the cart
        const currentQuantity = req.session.cart[productId] || 0;
        const totalQuantity = currentQuantity + quantityToAdd;
        
        // Check if adding the quantity exceeds the maximum allowed quantity
        if (totalQuantity > maxQuantity) {
          // Calculate the quantity that can be added without exceeding the limit
          quantityToAdd = maxQuantity - currentQuantity;
        }
        
        // Add quantity of the product to the cart
        req.session.cart[productId] = (req.session.cart[productId] || 0) + quantityToAdd;
      } catch (error) {
        console.error('Error in adding product to cart:', error);
        return res.status(500).send('Error in adding product to cart');
      }
      res.redirect('/index');
    });    

    // Handle removing products from cart
    app.post('/removeFromCart', async (req, res) => {
      try {
        const productId = req.body.productId;
        
        // Remove the product from the cart
        delete req.session.cart[productId];
      } catch (error) {
        console.error('Error in removing product from cart:', error);
        return res.status(500).send('Error in removing product from cart');
      }
      res.redirect('/cart');
    });

    app.get('/payment', (req, res) => {
      try {
          const paymentMessage = req.session.paymentMessage;
          delete req.session.paymentMessage; // Clear the payment message after displaying it
          res.render('payment', { cart: req.session.cart, products, paymentMessage });
      } catch (error) {
          console.log('Error rendering payment page:', error);
          res.status(500).send('Error rendering payment page');
      }
  });

  app.post('/processPayment', async (req, res) => {
    try {
    const paymentSuccess = true;
    if (paymentSuccess) {
        // Reduce stock from MongoDB for each product in the cart
        const cart = req.session.cart;
        for (const productId in cart) {
            const quantity = cart[productId];
            const product = await ProductsCollection.findOne({ _id: new ObjectId(productId) });
            if (product) {
                const updatedStock = product.DeviceStock - quantity;
                await ProductsCollection.updateOne({ _id: new ObjectId(productId) }, { $set: { DeviceStock: updatedStock } });
            }
        }
        req.session.cart = {}; // Clear the cart
        req.session.paymentMessage = 'Payment processed successfully!';
    } else {
        req.session.paymentMessage = 'Payment failed. Please try again.';
    }
    res.redirect('/payment');
  }catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).send('Error processing payment');
  }
  });
// Add a route for handling search queries
  app.get('/search', async (req, res) => {
    try {
      const searchTerm = req.query.search;
      const searchResults = await ProductsCollection.find({ DeviceName: new RegExp(searchTerm, 'i') }).toArray();
      res.render('search', { searchResults });
    } catch (error) {
      console.error('Error in search:', error);
      res.status(500).send('Error in search');
    }
  });

    // Start server
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

// Call the function to connect to the database
connectToDB();