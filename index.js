var express = require('express');
var app = express();
const mongoose = require('mongoose');
const dotenv = require('dotenv')
const dns = require('dns')
const multer = require('multer')
const upload = multer()
dotenv.config()
mongoose.connect(process.env.MONGO_URI)

const urlSchema = mongoose.Schema({
  original_url:{type:String,required:true},
  short_url:{type:Number,required:true,unique:true}
})
const Url = mongoose.model('Url',urlSchema);

// project-TIMESTAMP-MICROSERVICE
// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204
app.use(express.urlencoded({extended:true}))

app.use(express.static('public'));

app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

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
