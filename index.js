var express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv')
const dns = require('dns')
const multer = require('multer')
var cors = require('cors');
const upload = multer()
var app = express();
dotenv.config()
mongoose.connect(process.env.MONGO_URI)

const urlSchema = mongoose.Schema({
  original_url:{type:String,required:true},
  short_url:{type:Number,required:true,unique:true}
})
const userSchema = mongoose.Schema({
  username:{type:String,required:true}
})
const exerciseSchema = mongoose.Schema({
  uid:{type:String,required:true},
  description:{type:String,required:true},duration:{type:Number,required:true},date:{type:String,required:true}
})
const Url = mongoose.model('Url',urlSchema);
const User = mongoose.model('User',userSchema);
const Exercise = mongoose.model('Exercise',exerciseSchema);

// project-TIMESTAMP-MICROSERVICE
// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204
app.use(express.urlencoded({extended:true}))

app.use(express.static('public'));

app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/api/users",async(req,res)=>{
  try{
    let users =await User.find({})
    res.json(users)
  }catch(e){
    console.error(e)
    res.json({error:"Server error"})
  }
  // User.find({}, function (err, users) {
	// 	if (err) {
	// 		console.error(err);
	// 		res.json({
	// 			message: 'Getting all users failed!',
	// 		});
	// 	}

	// 	if (users.length === 0) {
	// 		res.json({ message: 'There are no users in the database!' });
	// 	}

	// 	console.log('users in database: '.toLocaleUpperCase() + users.length);

	// 	res.json(users);
	// });
})

app.post("/api/users",async(req,res)=>{
  const username = req.body.username?.trim();
  if(!username){
    return res.json({error:'username required'})
  }
  try{
    let existing = await User.findOne({username:username});
    if(existing){
      return res.json({_id:existing._id,username:existing.username});
    }
    let newUser = new User({username:username});
    await newUser.save();
    res.json({username:newUser.username,_id:newUser._id})
  }catch(e){
    console.error(e)
    res.json({error:"Server error"})
  }
})
app.get("/api/users/:_id/logs",async(req,res)=>{
  const { from, to, limit } = req.query;
  const _id = req.params._id;

  try {
    const userDoc = await User.findById(_id);
    if (!userDoc) return res.json({ error: "User not found" });

    let filter = { uid: _id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let query = Exercise.find(filter).select("-__v -uid");
    if (limit) query = query.limit(Number(limit));

    const exercises = await query.exec();

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: new Date(e.date).toDateString()
    }));

    res.json({
      _id: userDoc._id,
      username: userDoc.username,
      count: log.length,
      log
    });
  } catch (e) {
    console.error(e);
    res.json({ error: "Server error" });
  }
})
app.post("/api/users/:_id/exercises",async(req,res)=>{
  const {description,duration,date}=req.body;
  const _id = req.params._id;
  if(!_id || !description || !duration) return res.json({error:'missing params'});
  let newDate;
  try{
    newDate = date ? new Date(date) : new Date()
  }catch{
    newDate = new Date()
  }
  newDate = new Date(newDate.toDateString())
  try{
    let userDoc = await User.findById(_id);
    if (!userDoc) return res.json({ error: "User not found" });
    let newExercise = new Exercise({
      uid:_id,
      description,
      duration:Number(duration),
      date:newDate
    })
    await newExercise.save()
    let returnDate = new Date(newExercise.date).toDateString()
    const {username} = userDoc;
    res.json({_id:userDoc._id,username,date:returnDate,duration:newExercise.duration,description:newExercise.description})
  }catch(e){
    console.error(e)
    res.json({error:'Server error'})
  }
})

app.get("/api/shorturl/:id",async(req,res)=>{
  const id = parseInt(req.params.id);
  if(!Number.isInteger(id)){
    return res.json({error:"invalid id"});
  }
  if(id==="") return
  try{
    const found = await Url.findOne({short_url:id});
    if(!found){
      return res.json({error:"No short URL found for the given input"})
    }
    res.redirect(found.original_url);
  }catch(e){
    console.error(e);
    res.json({error:"Server error"});
  }
})

app.post('/api/shorturl',(req,res)=>{
  const submittedUrl = req.body.url;
  try{
    let parsedUrl;
    try{
      parsedUrl = new URL(submittedUrl);
    }catch{
      return res.json({error:"invalid url"})
    }
     if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return res.json({ error: 'invalid url' });
    }
    // dns check
    dns.lookup(parsedUrl.hostname,async(err)=>{
      if(err){
      return res.json({error:"invalid url"})
      }
      try{
        let existing = await Url.findOne({original_url:submittedUrl});
        if(existing){
          return res.json({original_url:existing.original_url,short_url:existing.short_url})
        }
        let lastEntry = await Url.findOne().sort({short_url:-1});
        let newShort = lastEntry ? lastEntry.short_url + 1: 1;
        let newUrl = new Url({
          original_url:submittedUrl,short_url:newShort
        })
        await newUrl.save();
        res.json({
          original_url:newUrl.original_url,short_url:newUrl.short_url
        })
      }catch(dbErr){
        console.error(dbErr);
        res.status(500).json({error:"server error"});
      }
    })
  }catch(e){
    console.error(e)
    res.json({error:"invalid url"});
  }
})

app.post('/api/fileanalyse',upload.single('upfile'),(req,res)=>{
  res.json({
    name:req.file.originalname,
    type:req.file.mimetype,
    size:req.file.size
  })
})

app.get("/api/whoami",(req,res)=>{
  res.json({"ipaddress":req.ip,"language":req.acceptsLanguages()[0],"software":req.headers['user-agent']});
})
app.get("/api",(req,res)=>{
  let now = new Date()
  res.json({
    "unix":now.getTime(),
    "utc":now.toUTCString()
  })
})

app.get("/api/:date", function (req, res) {
    let dateInput = req.params.date;
    let date;
    if(/^\d+$/.test(dateInput)){
      if(dateInput.length==10){
        date = new Date(parseInt(dateInput)*1000)
      }else{
        date = new Date(parseInt(dateInput))
      }
    }else{
      date = new Date(dateInput)
    }
    if(date.toString()==="Invalid Date"){
      return res.json({error:"Invalid Date"})
    }
    res.json({
      "unix":date.getTime(),
      "utc":date.toUTCString()
    })
});


var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
