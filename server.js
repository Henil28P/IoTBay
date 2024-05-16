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
    const OrdersCollection = database.collection("Orders");

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

    // Handle login post request
    app.post('/login', async (req, res) => {
      const { username, password } = req.body;
      const user = await usersCollection.findOne({ username, password });
      if (!user) {
        res.send('Invalid username or password');
      } else {
        const loginMessage = `User logged in at ${new Date().toLocaleString()}`;
        await usersCollection.updateOne({ _id: user._id }, { $push: { activityLog: loginMessage } });
        req.session.userId = user._id;
        res.redirect('/dashboard');
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

    // Logout route
    app.get('/logout', async (req, res) => {
      try {
        const userId = req.session.userId;
        if (!userId) {
          console.error('User ID not found in session');
          res.status(400).send('User ID not found in session');
          return;
        }
        
        // Fetch user document from the database
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
          console.error('User not found');
          res.status(404).send('User not found');
          return;
        } else {
          // Add logout message to the user's activity log with timestamp
          const logoutMessage = `User logged out at ${new Date().toLocaleString()}`;
          await usersCollection.updateOne({ _id: user._id }, { $push: { activityLog: logoutMessage } });
        }

        // Clear the session data
        req.session.destroy((err) => {
          if (err) {
            console.error('Error clearing session:', err);
            res.status(500).send('Error clearing session');
            return;
          }
          // Redirect the user to the login page or any other appropriate page
          res.redirect('/login');
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

        // Check if user is logged in
        if (req.session.userId) {
          // Retrieve userId from session
          const userId = req.session.userId;

          // Update the user document in the database to add the activity log entry
          await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $push: { activityLog: `Added ${quantityToAdd} of ${product.DeviceName} to cart` } }
          );
        }

        // Redirect to index page after adding to cart
        res.redirect('/index');
      } catch (error) {
        console.error('Error in adding product to cart:', error);
        return res.status(500).send('Error in adding product to cart');
      }
    });

    // Render payment page
    app.get('/payment', function(req, res){
      try {
        // Render the payment page with products and paymentMessage
        res.render('payment', { products: products, paymentMessage: req.session.paymentMessage });
      } catch (error) {
        console.log('Error in rendering payment page:', error);
        res.status(500).send('Error in rendering payment page');
      }
    });

    // Handle processing payment and placing orders
app.post('/processPaymentAndPlaceOrder', async (req, res) => {
  try {
    const userId = req.session.userId; // Retrieve userId from session
    const orderDate = new Date();
    const orderStatus = "Pending"; // Assuming initially all orders are pending
    const paymentSuccess = true; // Assuming payment processing is successful

    // Get products and quantities from session cart
    const cart = req.session.cart || {};
    const productIds = Object.keys(cart);

    // Fetch products from database
    const orderedProducts = await ProductsCollection.find({ _id: { $in: productIds.map(id => new ObjectId(id)) } }).toArray();

    // Calculate total amount of the cart
    let totalAmount = 0;
    for (const [productId, quantity] of Object.entries(cart)) {
      const product = orderedProducts.find(prod => prod._id.toString() === productId);
      if (product) {
        totalAmount += product.DevicePrice * quantity;
      }
    }

    // Fetch user document from the database
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      console.error('User not found');
      return res.status(404).send('User not found');
    }

    // Log payment activity with timestamp and total amount
    const paymentMessage = `Payment processed at ${new Date().toLocaleString()}. Total amount: $${totalAmount.toFixed(2)}`;
    await usersCollection.updateOne({ _id: user._id }, { $push: { activityLog: paymentMessage } });

    if (paymentSuccess) {
      // Prepare order object
      const order = {
        userId: new ObjectId(userId),
        orderDate,
        orderStatus,
        products: orderedProducts.map(product => ({
          productId: product._id,
          name: product.DeviceName,
          quantity: cart[product._id.toString()], // Quantity from session cart
          price: product.DevicePrice
        }))
      };

      // Insert order into Orders collection
      const result = await OrdersCollection.insertOne(order);

      // Log order in user's order history
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $push: { orderHistory: order } }
      );

      // Clear session cart after placing order
      req.session.cart = {};

      // Set payment success message
      req.session.paymentMessage = 'Payment processed successfully!';
    } else {
      // Set payment failure message
      req.session.paymentMessage = 'Payment failed. Please try again.';
    }

    // Redirect to payment page
    res.redirect('/payment');
  } catch (error) {
    console.error('Error processing payment and placing order:', error);
    res.status(500).send('Error processing payment and placing order');
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

    // Render dashboard page
    app.get('/dashboard', async (req, res) => {
      try {
        const userId = req.session.userId; // Assuming you store user ID in session after login
        
        if (!userId) {
          // If user ID is not found in session, redirect to login page
          return res.redirect('/login');
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) }); // Find user based on ID
          
        if (!user) {
          // If user is not found in the database, display a message and redirect to login page
          req.session.errorMessage = 'User not found. Please log in again.';
          return res.redirect('/login');
        }

        // If user is found, render the dashboard page with user data
        res.render('dashboard', { user, products });
      } catch (error) {
        console.error('Error in fetching user data:', error);
        res.status(500).send('Error in fetching user data');
      }
    });
    // Define a route to render the registration page
    app.get('/registration', (req, res) => {
      try {
        res.render('registration', { errorMessage: null, registrationSuccess: null });
      } catch (error) {
        console.error('Error rendering registration page:', error);
        res.status(500).send('Error rendering registration page');
      }
    });

    // Handle user registration form submission
    app.post('/register', async (req, res) => {
      try {
        const { username, email, password, phone, deliveryAddress } = req.body;

        // Check if username or email already exists
        const existingUser = await usersCollection.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
          return res.render('registration', { errorMessage: 'Username or email already exists', registrationSuccess: null });
        }

        // Create a new user document
        const newUser = {
          username,
          email,
          password,
          phone,
          deliveryAddress,
          type: 'customer',
          orderHistory: [],
          activityLog: [`User Registered at ${new Date().toLocaleString()}`]
        };

        // Insert the new user document into the database
        const result = await usersCollection.insertOne(newUser);
        return res.render('registration', {errorMessage: '', registrationSuccess: true });
      } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Error registering user');
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