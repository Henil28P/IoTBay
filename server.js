require("dotenv").config();

const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const passport = require("passport");
const initializePassport = require("./passport-config");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override");

initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
);

const users = [];

app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));

app.get('/landing', (req, res) => {
    res.render("landing.ejs");
});

app.get('/', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/landing');
    }

    const name = req.query.name === 'guest' ? 'Guest' : req.user ? req.user.name : '';
    res.render("index.ejs", { name });
});

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render("login.ejs");
});

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render("register.ejs");
});

app.get('/guest', (req, res) => {
    res.render("index.ejs", { name: 'Guest' });
});

app.post("/login", checkNotAuthenticated, passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}));

app.post("/register", checkNotAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
        })
        console.log(users);
        res.redirect("/login")

    } catch (e) {
        console.log(e);
        res.redirect("/register")
    }
});

app.delete("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect("/landing"); // or handle the error as needed
        }
        res.redirect("/landing");
    });
});

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }
    res.redirect("/login")
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect("/")
    }
    next()
}

app.listen(3000, () => {
    console.log("Server running on port 3000")
});
