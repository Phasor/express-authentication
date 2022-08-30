const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
require('dotenv').config();

const mongoDb = process.env.DB_URL;
mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));

// set up Mongoose Schema
const User = mongoose.model(
    "User",
    new Schema({
      username: { type: String, required: true },
      password: { type: String, required: true }
    })
  );

const app = express();
// set up view engine
app.set("views", __dirname);
app.set("view engine", "ejs");

// set up other middleware
app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
// Next 3 functions are needed by Passport.js for authentication. We don't call them directly
passport.use( 
    new LocalStrategy((username, password, done) => {
      User.findOne({ username: username }, (err, user) => {
        if (err) { 
          return done(err);
        }
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
      });
    })
  );
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
  
app.use(passport.initialize());
app.use(passport.session());

/*
If you insert this code somewhere between where you instantiate the passport middleware 
and before you render your views, you will have access to the currentUser variable in all 
of your views, and you won’t have to manually pass it into all of the controllers in 
which you need it.
*/
app.use(function(req, res, next) {
    res.locals.currentUser = req.user;
    next();
  });

app.use(express.urlencoded({ extended: false }));
app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/"
  })
);

// define routes
app.get("/", (req, res) => {
    // send back the user object if logged in
    res.render("index", { user: req.user });
  });
app.get("/sign-up", (req, res) => res.render("sign-up-form"));

app.get("/log-out", (req, res) => {
    req.logout(function (err) { // logout function from Passport.js
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });

// simple post route, WE SHOULD BE SANITISING THE INPUTS!
app.post("/sign-up", (req, res, next) => {
    const user  = new User({
        username: req.body.username,
        password: req.body.password
    }).save(err => {
        if(err) {
            return next(err);
        }
        res.redirect("/");
    })
})
app.post(
    "/log-in",
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/"
    })
  );

app.listen(3000, () => console.log("app listening on port 3000!"));

