/*
Filename: server.js
Description: This file sets up a basic web server using Express.js with user authentication features using Passport.js and bcrypt for password hashing.
It handles user registration, login, logout, and session management.
*/

// load environment variables from a '.env' file into 'process.env'
require("dotenv").config();

const express = require("express"); // "express" is a web framework for Node.js
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt"); // "bcrypt" is a library for hashing passwords
const passport = require("passport"); // "passport" is authentication middle for Node.js
// make a custom function "initializePassport" for initializing Passport.js with local strategy
const initializePassport = require("./passport-config");
const flash = require("express-flash"); // "flash" is a middleware for displaying flash messages.
const session = require("express-session"); // "session" is a middleware for managing user sessions.
const methodOverride = require("method-override"); // "methodOverride" is a middleware for HTTP method overriding
const User = require('./models/users');
const Product = require('./models/products');
const Payment = require('./models/payments');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const axios = require('axios');

app.use(session({ // Session middleware
    secret: '123',
    resave: false,
    saveUninitialized: true
}));
app.use((req, res, next) => { // Middleware to make session cart available globally
  res.locals.cart = req.session.cart || {};
  next();
});

// const express = require("express");
// const router = express.Router();
// // const bodyParser = require("body-parser");
// const bcrypt = require("bcrypt"); // "bcrypt" is a library for hashing passwords
// const User = require('../models/users');
// const Product = require('../models/products');
// const mongoose = require("mongoose");
// const session = require('express-session');
// const cookieParser = require('cookie-parser');
// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const axios = require('axios');

// router.use(session({ // Session middleware
//     secret: '123',
//     resave: false,
//     saveUninitialized: true
// }));
// router.use((req, res, next) => { // Middleware to make session cart available globally
//   res.locals.cart = req.session.cart || {};
//   next();
// });

const MONGOURL = process.env.MONGO_URL;

// middlewares
app.use(express.urlencoded({extended: false}))
app.use(express.json());

app.use((req,res,next) => {
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended:true
}))

// set template engine
app.set("view engine", "ejs");

// Connect to MongoDB IoTBay Database
// mongoose.connect("mongodb://localhost:27017/IoTBay");
mongoose.connect("mongodb+srv://Henil:sXtC0W0zAt5ZBPJc@iotbay.w6qgafn.mongodb.net/"); // use the above if this one does not work

const db = mongoose.connection;



// User Schema
// const userSchema = new mongoose.Schema({
//     email: { type: String, unique: true },
//     password: String
// });

// const User = mongoose.model('User', userSchema);

// handle any errors while connection to db is failed
db.on('error',()=>console.log("Error in connecting to database"));
db.once('open',()=>console.log("Connected to Database"));

// initialize Passport.js with a local authentication strategy.
// It takes Passport instance, a function to find a user by email, and a function to find a user by "id"
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
);

// create an empty array "users" to store user information. 
// Each user object includes an id, name, email, and hashed password
const users = [];

app.use(express.urlencoded({ extended: false })); // middleware to parse URL-endoded request bodies
app.use(flash()); // middleware for displying flash messages
app.use(session({ // middleware for managing user sessions
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize()); // middleware to initialize Passport
app.use(passport.session()); // middleware to handle Passport sessions
app.use(methodOverride("_method")); // middleware for HTTP method overriding

// app.get('/', (req,res) => {
//     res.render("landing", {title: "Henil"});
// })

// route prefix middleware
// app.use("", require('./routes/routes'));

// GET route to render the landing page
// app.get('/landing', (req, res) => {
//     res.render("landing.ejs");
// });

// GET route to render the login page.
// app.get('/', (req, res) => {
//     // Redurect to '/landing' if the user is not authenticated
//     if (!req.isAuthenticated()) {
//         return res.redirect('/landing');
//     }

//     // use ternary operation
//     const name = req.query.name === 'guest' ? 'Guest' : req.user ? req.user.name : '';
//     res.render("index.ejs", { name });
// });

app.get("/", (req, res) => {
    res.render("landing");
    // User.find().exec((err, users) => {
    //     if(err) {
    //         res.json({ message: err.message });
    //     }
    //     else {
    //         res.render("landing", {
    //             users: users,
    //         })
    //     }
    // })
});

// GET route to render the main page with a 'Guest' name
app.get("/guest", async(req, res) => {

    const client = new MongoClient("mongodb+srv://Henil:sXtC0W0zAt5ZBPJc@iotbay.w6qgafn.mongodb.net/");
    const cursor = client.db("test").collection("Products").find({});
    const products = await cursor.toArray();

    res.render("index", {userName: "Guest", products: products, DeviceCategory: products.DeviceName, DeviceDescription: products.DeviceDescription, DeviceStock: products.DeviceStock, DevicePrice: products.DevicePrice});
});

// GET route to render the registration page
app.get("/register", (req,res) => {
    res.render("register");
});

// GET route to render the login page.
app.get("/login", (req,res) => {
    res.render("login", {userName: req.body.user});
});

app.get("/landing", async(req,res) => {
    // Fetch all products
    const products = await db.collection('Products').find({}).toArray();

    try {
        res.render('index', { products });
    } catch (error) {
        console.log('Error in fetching products:', error);
        res.status(500).send('Error in fetching products');
    }
    // res.render("landing", { products });
});

// // GET route to render the login page. Redirect to '/' if the user is already authenticated.
// app.get('/login', checkNotAuthenticated, (req, res) => {
//     res.render("login.ejs");
// });

// // GET route to render the registration page. Redirect to '/' if the user is already authenticated
// app.get('/register', checkNotAuthenticated, (req, res) => {
//     res.render("register.ejs");
// });


// Render cart page with session cart data
app.get('/cart', async(req, res) => {

    const products = await db.collection('Products').find({}).toArray();

    try {
      res.render('cart', { cart: req.session.cart, products: products });
    } catch (error) {
      console.log('Error in cart loading:', error);
      res.status(500).send('Error in cart loading');
    }
});

// route for "search"
app.get('/search', async (req, res) => {
    try {
      const searchTerm = req.query.search;
      const searchResults = await db.collection('Products').find({ DeviceName: new RegExp(searchTerm, 'i') }).toArray();
      res.render('search', { searchResults });
    } catch (error) {
      console.error('Error in search:', error);
      res.status(500).send('Error in search');
    }
});

app.get("/index", async (req,res) => {
    try {
        const userId = req.session.userId; // Assuming you store user ID in session after login
        const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) });; // Find user based on ID
        const products = await db.collection('Products').find({}).toArray();

        // if (!user) {
        //     res.status(404).send('User not found');
        //     return;
        // }
        console.log("Retrieved userId:", req.session.userId);
        res.render('index', { userName: user.name, products: products, products: products, DeviceCategory: products.DeviceName, DeviceDescription: products.DeviceDescription, DeviceStock: products.DeviceStock, DevicePrice: products.DevicePrice }); // Pass user object to the template
    } catch (error) {
        console.error('Error in fetching user data:', error);
        res.status(500).send('Error in fetching user data');
    }
});

app.get("/users", async (req,res) => {

    const client = new MongoClient("mongodb+srv://Henil:sXtC0W0zAt5ZBPJc@iotbay.w6qgafn.mongodb.net/");
    const cursor = client.db("test").collection("Users").find({});
    const results = await cursor.toArray();

    res.render("viewUsers", {users: results});
});


app.post("/login", async (req, res) => {

    const client = new MongoClient("mongodb+srv://Henil:sXtC0W0zAt5ZBPJc@iotbay.w6qgafn.mongodb.net/");
    const cursor = client.db("test").collection("Products").find({});
    const products = await cursor.toArray();
    // const products = await db.collection('Products').find({}).toArray();

    // Assuming successful login, generate JWT token:
    // res.render('view/index');
    const { userName, email, password } = req.body;
    const check = await db.collection('Users').findOne({ email, password });
    const user = await db.collection('Users').findOne({ userName });
    
    try {
        // console.log(check);
        if (!check)
        {
            // res.render('index.ejs');
            return res.send("Incorrect email");
        }

        // 03/05 - This additional check is causing it to not proceed any further
        // Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
        // else {
        //     res.send("Incorrect Password, please try again!");
        // }
        
        const isPasswordMatch = await bcrypt.compare(password, check.hashed);

        if (isPasswordMatch)
        {
            if (email === "admin@iotbay.com") {
                // res.render("adminPage", { userID: check._id, userName: check.name, email: check.email, address: check.address, contact: check.contact });
                res.render("adminPage", { userID: check._id, userName: check.name, email: check.email, address: check.address, contact: check.contact });
            }
            else {
                req.session.userId = check._id;
                // res.render({userName: user}, '/index');
                console.log("Storing userId:", check._id);
                res.render("index", { userName: check.name, products: products, DeviceCategory: products.DeviceName, DeviceDescription: products.DeviceDescription, DeviceStock: products.DeviceStock, DevicePrice: products.DevicePrice });
            }

        }
        else
        {
            res.send("wrong password");
        }

    }
    catch (error) {
        console.log(error)
        return res.send("Wrong Details provided");
    }
});

// Handle adding products to cart
app.post('/addToCart', async (req, res) => {
    try {
      const productId = req.body.productId;
      let quantityToAdd = parseInt(req.body.quantity); // Parse quantity to integer
      
      // Aggregate query to retrieve the product details
      const productAggregate = await db.collection('Products').aggregate([
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

// Render payment page
app.get('/payment', async(req, res) => {

    const products = await db.collection('Products').find({}).toArray();

    try {
      // Render the payment page with products and paymentMessage
      res.render('payment', { products: products, paymentMessage: req.session.paymentMessage, user: req.session.userId });
    } catch (error) {
      console.log('Error in rendering payment page:', error);
      res.status(500).send('Error in rendering payment page');
    }
});

// Handle processing payment and placing orders
app.post('/createPayment', async (req, res) => {
    try {
      const userId = req.session.userId; // Retrieve userId from session
      const orderDate = new Date();
      const orderStatus = "Pending"; // Assuming initially all orders are pending
      const paymentSuccess = true; // Assuming payment processing is successful
  
      // Get products and quantities from session cart
      const cart = req.session.cart || {};
      const productIds = Object.keys(cart);
  
      // Fetch products from database
      const orderedProducts = await db.collection("Products").find({ _id: { $in: productIds.map(id => new ObjectId(id)) } }).toArray();
  
      // Calculate total amount of the cart
      let totalAmount = 0;
      for (const [productId, quantity] of Object.entries(cart)) {
        const product = orderedProducts.find(prod => prod._id.toString() === productId);
        if (product) {
          totalAmount += product.DevicePrice * quantity;
        }
      }
  
      // Fetch user document from the database
      const user = await db.collection("Users").findOne({ _id: new ObjectId(userId) });
      if (!user) {
        console.error('User not found');
        return res.status(404).send('User not found');
      }
  
      // Log payment activity with timestamp and total amount
      const paymentMessage = `Payment processed at ${new Date().toLocaleString()}. Total amount: $${totalAmount.toFixed(2)}`;
      await db.collection("Users").updateOne({ _id: user._id }, { $push: { activityLog: paymentMessage } });
  
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
        const result = await db.collection("orders").insertOne(order);
  
        // Log order in user's order history
        await db.collection("Users").updateOne(
          { _id: new ObjectId(userId) },
          { $push: { orderHistory: order } }
        );
        
  
        // Update product stock
        for (const productId in cart) {
          const quantity = cart[productId];
          const product = await db.collection("Products").findOne({ _id: new ObjectId(productId) });
          if (product) {
              const updatedStock = product.DeviceStock - quantity;
              await db.collection("Products").updateOne({ _id: new ObjectId(productId) }, { $set: { DeviceStock: updatedStock } });
          }
      }
        // Clear session cart after placing order
        req.session.cart = {};
  
        // Set payment success message
        req.session.paymentMessage = 'Payment processed successfully!';
      } else {
        // Set payment failure message
        req.session.paymentMessage = 'Payment failed. Please try again.';
      }
  
      // Redirect to payment page
      res.redirect(302, '/paymentConfirm');
    } catch (error) {
      console.error('Error processing payment and placing order:', error);
      res.status(500).send('Error processing payment and placing order');
    }
});



// POST route for user login. Uses Passport's local authentication strategy.
// app.post("/login", checkNotAuthenticated, passport.authenticate("local", {
//     successRedirect: "/",
//     failureRedirect: "/login",
//     failureFlash: true
// }));

// POST route for user registration. Hashes the password before storing it in the 'users' array
// app.post("/register", checkNotAuthenticated, async (req, res) => {
//     // try {
//     //     const hashedPassword = await bcrypt.hash(req.body.password, 10)
//     //     users.push({
//     //         id: Date.now().toString(),
//     //         name: req.body.name,
//     //         email: req.body.email,
//     //         password: hashedPassword,
//     //     })
//     //     console.log(users);
//     //     res.redirect("/login")

//     // } catch (e) {
//     //     console.log(e);
//     //     res.redirect("/register")
//     // }

//     var name = req.body.name,
//     var email = req.body.email,
//     var password = req.body.password;
// });

app.post("/register", (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    
    // 03/05 - bcrypt.compare converts plaintext to hash, hence we have to store the hashed 
    //         password into the database and use it to compare
    bcrypt.hash(password, 10, function(err, hash) {
        if (err) { throw (err); }
        var data = {
            "name": name,
            "email": email,
            "password": password,
            "hashed": hash
        }
        
        db.collection('Users').insertOne(data,(err,collection)=>{
            if(err)
            {
                throw err;
            }
            console.log("Record inserted successfully");
        });
    });

    res.redirect('/login'); // once data is inserted into the mongodb, redirect user to index.ejs page
});

// verify login
// app.post("/login", async (req, res) => {

//     // var name = req.body.name;
//     // const { email, password } = req.body;
//     // const user = await User.findOne({ email });
//     // if (!user) return res.status(400).send("Invalid email or password");

//     // const validPassword = await bcrypt.compare(password, user.password);
//     // if (!validPassword) return res.status(400).send("Invalid email or password");

//     // Assuming successful login, generate JWT token:
//     // res.render('view/index');
//     const { email, password } = req.body;
//     const check = await db.collection('Users').findOne({ email });
//     // const name = await db.collection('Users').findOne({ userName });
    
//     try {
//         // console.log(check);
//         if (!check)
//         {
//             // res.render('index.ejs');
//             return res.send("Incorrect email");
//         }

//         // 03/05 - This additional check is causing it to not proceed any further
//         // Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
//         // else {
//         //     res.send("Incorrect Password, please try again!");
//         // }
        
//         const isPasswordMatch = await bcrypt.compare(password, check.hashed);

//         if (isPasswordMatch)
//         {
//             if (check === "admin@iotbay.com") {
//                 res.render("adminPage");
//             }
//             else {
//                 res.render("index", { userName: name });
//             }
//         }
//         else
//         {
//             res.send("wrong password");
//         }

//     }
//     catch (error) {
//         console.log(error)
//         return res.send("Wrong Details provided");
//     }

//     // db.collection('Users').insertOne(data,(err,collection)=>{
//     //     if(err)
//     //     {
//     //         throw err;
//     //     }
//     //     console.log("Record inserted successfully");
//     // });

//     // res.redirect('/login'); // once data is inserted into the mongodb, redirect user to index.ejs page
// });
app.get('/viewSaved', async (req, res) => {
  const userId = req.session.userId; // Assuming you store user ID in session after login
  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) }); // Find user based on ID 
  try {
    if (!userId) {
      // If user ID is not found in session, redirect to login page
      return res.redirect(302, '/login');
    }
    

    if (!user) {
      // If user is not found in the database, display a message and redirect to login page
      req.session.errorMessage = 'User not found. Please log in again.';
      return res.redirect(302, '/login');
    }
    
    console.log("Retrieved userId:", req.session.userId);
    res.render('viewSaved', { userName: user.name, email: user.email, phoneNumber: user.phoneNumber, shippingAddress: user.shippingAddress});  
  } catch (error) {
    console.log('Error in fetching user details:', error);
    res.status(500).send('Error in fetching user details');
  } 
});


app.get("/paymentConfirm", (req,res) => {
  res.render("paymentConfirm");
});

app.post("/orders", (req,res) => {
    res.render("orders");
});

// DELETE route to log out the user and destroy the session
app.delete("/logout", (req, res) => {
    req.session.destroy((err) => {
        // if (err) {
        //     res.redirect("/landing"); // or handle the error as needed
        // }
        res.redirect("/");
    });
});

// middleware checkAuthenticated() function to check if the user is authenticated.
// function checkAuthenticated(req, res, next) {
//     if (req.isAuthenticated()) {
//         return next()
//     }
//     res.redirect("/login") // Redirect to '/login' if not authenticated
// }

// middleware checkNotAuthenticated() function to check if the user is not authenticated.
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect("/") // Redirect to '/' if authenticated
    }
    next()
}

// start the Express server on port 3000
app.listen(3000, () => {
    console.log("Server running on port 3000"); // log a message once the Express server is running on port 3000
});