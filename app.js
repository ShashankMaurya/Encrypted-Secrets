require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');

// const saltRounds = 10;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(session({
    secret: "My Big Secret.",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        // required: [true, 'Why no email?']
    },
    password: {
        type: String,
        // required: [true, 'Why no password?']
    },
    googleId: {
        type: String,
        // required: [true, 'Why no email?']
    },
    secret: {
        type: String,
        // required: [true, 'Why no email?']
    }
});


// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// compatible for all kinds of Authentication, not only Local
passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username, name: user.displayName });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);

        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));




// GET requests

app.get('/', function (req, res) {
    res.render('home');
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.get('/login', function (req, res) {
    res.render('login');
});

app.get('/logout', function (req, res) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        }
        else {
            res.redirect('/');
        }

    });

});

app.get('/register', function (req, res) {
    res.render('register');
});

app.get('/secrets', function (req, res) {

    // if (req.isAuthenticated()) {
    //     res.render('secrets');
    // }
    // else {
    //     res.redirect('/login');
    // }

    User.find({ "secret": { $ne: null } })
        .then((foundUsers) => {
            if (foundUsers) {
                res.render("secrets", { usersWithSecrets: foundUsers });
            }
        })
        .catch((err) => console.log(err));
});

app.get('/submit', function (req, res) {
    if (req.isAuthenticated()) {
        res.render('submit');
    }
    else {
        res.redirect('/login');
    }
})




// POST requests

app.post('/register', function (req, res) {

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect('/register');
        }
        else {
            // passport.authenticate('local', { successRedirect: '/secrets', failureRedirect: '/register' })(req, res);
            passport.authenticate('local')(req, res, function () {
                console.log("User registered Successfully");
                res.redirect('/secrets');
            });
        }
    });






    // bcrypt.hash(req.body.password, saltRounds, function (error, hash) {

    //     if (!error) {
    //         new User({
    //             email: req.body.username,
    //             password: hash
    //         }).save()
    //             .then(() => {
    //                 console.log('User registerd successfully');
    //                 res.render('secrets');
    //             })
    //             .catch((err) => console.log(err))
    //     }
    //     else {
    //         console.log(error);
    //     }

    // });


    // new User({
    //     email: req.body.username,
    //     // password: req.body.password
    //     password: md5(req.body.password)
    // }).save()
    //     .then(() => {
    //         console.log('User registerd successfully');
    //         res.render('secrets');
    //     })
    //     .catch((err) => console.log(err))

});

app.post('/login', function (req, res) {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        }
        else {
            passport.authenticate('local')(req, res, function () {
                res.redirect('/secrets');
            });
        }
    })






    // User.findOne({ email: req.body.username })
    //     .then((foundUser) => {
    //         // if (foundUser.password === req.body.password) {
    //         // if (foundUser.password === md5(req.body.password)) {
    //         bcrypt.compare(req.body.password, foundUser.password, function (err, result) {
    //             if (result) {
    //                 res.render('secrets');
    //             }
    //             else {
    //                 console.log("Incorrect Password");
    //             }
    //         });
    //     })
    //     .catch((err) => console.log(err));

});

app.post('/submit', function (req, res) {
    // console.log(req.user);
    User.findById(req.user.id)
        .then((foundUser) => {
            foundUser.secret = req.body.secret;
            foundUser.save()
                .then(() => res.redirect('/secrets'));
            console.log("Secret saved successfully");
        })
        .catch((err) => console.log(err));
});




// LISTENER set-up

app.listen(3000, function () {
    console.log('server started on port 3000...');
});