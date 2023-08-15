require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('view engine', 'ejs');

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Why no email?']
    },
    password: {
        type: String,
        required: [true, 'Why no password?']
    }
});


userSchema.plugin(encrypt, {secret: process.env.SECRET , encryptedFields: ['password']});

const User = new mongoose.model('User', userSchema);


// GET requests

app.get('/', function (req, res) {
    res.render('home');
});

app.get('/login', function (req, res) {
    res.render('login');
});

app.get('/register', function (req, res) {
    res.render('register');
});



// POST requests

app.post('/register', function (req, res) {

    new User({
        email: req.body.username,
        password: req.body.password
    }).save()
        .then(() => {
            console.log('User registerd successfully');
            res.render('secrets');
        })
        .catch((err) => console.log(err))

});

app.post('/login', function (req, res) {

    User.findOne({ email: req.body.username })
        .then((foundUser) => {
            if (foundUser.password === req.body.password) {
                res.render('secrets');
            }
            else{
                console.log("Incorrect password");
            }
        })
        .catch((err) => console.log(err));

});


// LISTENER set-up

app.listen(3000, function () {
    console.log('server started on port 3000...');
});