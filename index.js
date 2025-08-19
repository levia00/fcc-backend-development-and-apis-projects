var express = require('express');
var app = express();
// project-TIMESTAMP-MICROSERVICE
// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

app.use(express.static('public'));

app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

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
