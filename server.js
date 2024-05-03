/*
Filename: server.js
Description: This file sets up a basic web server using Express.js with user authentication features using Passport.js and bcrypt for password hashing.
It handles user registration, login, logout, and session management.
*/

// load environment variables from a '.env' file into 'process.env'
require("dotenv").config();

const express = require("express"); // "express" is a web framework for Node.js
const app = express();
app.set('view engine', 'ejs');
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt"); // "bcrypt" is a library for hashing passwords
const passport = require("passport"); // "passport" is authentication middle for Node.js
// make a custom function "initializePassport" for initializing Passport.js with local strategy
const initializePassport = require("./passport-config");
const flash = require("express-flash"); // "flash" is a middleware for displaying flash messages.
const session = require("express-session"); // "session" is a middleware for managing user sessions.
const methodOverride = require("method-override"); // "methodOverride" is a middleware for HTTP method overriding

const MONGOURL = process.env.MONGO_URL;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended:true
}))

// Connect to MongoDB IoTBay Database
mongoose.connect("mongodb://localhost:27017/IoTBay");

const db = mongoose.connection;

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model('User', userSchema);

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

// GET route to render the landing page
app.get('/landing', (req, res) => {
    res.render("landing.ejs");
});

// GET route to render the login page.
app.get('/', (req, res) => {
    // Redurect to '/landing' if the user is not authenticated
    if (!req.isAuthenticated()) {
        return res.redirect('/landing');
    }

    // use ternary operation
    const name = req.query.name === 'guest' ? 'Guest' : req.user ? req.user.name : '';
    res.render("index.ejs", { name });
});

// GET route to render the login page. Redirect to '/' if the user is already authenticated.
app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render("login.ejs");
});

// GET route to render the registration page. Redirect to '/' if the user is already authenticated
app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render("register.ejs");
});

// GET route to render the main page with a 'Guest' name
app.get('/guest', (req, res) => {
    res.render("index.ejs", { name: 'Guest' });
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

    var data = {
        "name": name,
        "email": email,
        "password": password
    }

    db.collection('Users').insertOne(data,(err,collection)=>{
        if(err)
        {
            throw err;
        }
        console.log("Record inserted successfully");
    });

    res.redirect('/login'); // once data is inserted into the mongodb, redirect user to index.ejs page
});

// verify login
app.post("/login", async (req, res) => {

    // var name = req.body.name;
    // const { email, password } = req.body;
    // const user = await User.findOne({ email });
    // if (!user) return res.status(400).send("Invalid email or password");

    // const validPassword = await bcrypt.compare(password, user.password);
    // if (!validPassword) return res.status(400).send("Invalid email or password");

    // Assuming successful login, generate JWT token:
    // res.render('view/index');
    const { email, password } = req.body;
    const check = await collection.findOne({ email });
    
    try {
        // console.log(check);
        if (!check)
        {
            // res.render('index.ejs');
            return res.send("Incorrect email")
        }
        else {
            res.send("Incorrect Password, please try again!");
        }
        // if(!check)
        // {
        //     res.send("user name not found");
        // }
        const isPasswordMatch = await bcrypt.compare(password, check.password);
        if (isPasswordMatch)
        {
            res.render("index");
        }
        else
        {
            req.send("wrong password");
        }
    }
    catch (error) {
        return res.send("Wrong Details provided");
    }

    // db.collection('Users').insertOne(data,(err,collection)=>{
    //     if(err)
    //     {
    //         throw err;
    //     }
    //     console.log("Record inserted successfully");
    // });

    // res.redirect('/login'); // once data is inserted into the mongodb, redirect user to index.ejs page
});

// DELETE route to log out the user and destroy the session
app.delete("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect("/landing"); // or handle the error as needed
        }
        res.redirect("/landing");
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
    console.log("Server running on port 3000") // log a message once the Express server is running on port 3000
});
