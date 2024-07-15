const express = require('express');
const app = express();
const routes = require('./routes');
const cors= require('cors');
app.use(cors());
let port = process.env.PORT || 8080;

app.use('/', routes);
app.listen(port, ()=>{
  console.log(`The server is listening on port ${port}`)
});

