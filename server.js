const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exercise-track' )
const userSchema = new mongoose.Schema({name: {type: String, required: true}, exercises: [{description: String, duration: Number, date: Date}]});
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

// Add exercise to a specific user ✅
app.post('/api/exercise/add', (req, res) => {
  console.log(req.body);
  const description = req.body.description,
        duration = Number.parseInt(req.body.duration),
        dateStr = req.body.date;
  const parsedDate = new Date(dateStr);
  const date = parsedDate ? parsedDate : new Date();
  User.findById(req.body.userId, (err, matchingUser) => {
    if(err) {
      res.json({error: err.message});
    }else{
      User.findByIdAndUpdate(req.body.userId, {exercises: matchingUser.exercises.concat({description, duration, date})}, {new: true, select: {name: 1, exercises: 1}}, (err, newUser) => {
        if(err){
          res.json({error: err.message});
        }else{
          res.json(newUser);
        }
      });
    }
  });
});

// Query specific user's full exercise log ✅; part of logs ✅
app.get('/api/exercise/log', (req, res) => {
  console.log(`non-exist query: ${req.query.nonExist}`);
  console.log(req.query);
  const userId = req.query.userId, 
        fromDateStr = req.query.from, 
        toDateStr = req.query.to, 
        limitStr = req.query.limit;
  const fromDate = fromDateStr ? new Date(fromDateStr) : undefined, 
        toDate = toDateStr ? new Date(toDateStr) : undefined, 
        limit = limitStr ? Number.parseInt(limitStr) : undefined;
  console.log(`${fromDate}, ${toDate}, ${limit}`);
  if(userId){
    User.findById(userId, 'name exercises', (err, user) => {
      if(err) {
        res.json({error: err.message});
      }else{
        const select = ['_id', 'name', 'exercises'];
        const copyUser = {};
        select.forEach(key => copyUser[key] = user[key]);
        
        if(fromDate){
          copyUser.exercises = copyUser.exercises.filter(exercise => exercise.date.getTime() > fromDate.getTime());
        }
        if(toDate){
          copyUser.exercises = copyUser.exercises.filter(exercise => exercise.date.getTime() < toDate.getTime());
        }
        if(limit){
          copyUser.exercises = copyUser.exercises.slice(0, Math.min(limit, copyUser.exercises.length));
        }
        copyUser.exercises_count = copyUser.exercises.length;
        res.json(copyUser);
      }
    });
  }else{
    res.json({error: 'you should provide userId to query'});
  }
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