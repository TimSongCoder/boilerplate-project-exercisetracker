const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exercise-track' )
const userSchema = new mongoose.Schema({name: {type: String, required: true}});
const User = mongoose.model('User', userSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Create new user ✅
app.post('/api/exercise/new-user', (req, res) => {
  const username = req.body.username;
  console.log(`New user: ${username}`);
  // Simple empty string validation
  if(username) {
    User.create({name: username}, (err, newUser) => {
      if(err){
        console.log(err);
        res.json({error: 'can not create user'});
      }
      console.log(newUser);
      res.json({username: newUser.name, _id: newUser._id});
    });
  } else {
    res.json({error: 'username can not be empty'});
  }
});

// Query all users ✅
app.get('/api/exercise/users', (req, res) => {
  User.find({})
    .select({name: 1})
    .exec((err, users) => {
    if(err) {
      res.json({error: err.message});
    }else {
      res.json(users);
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})