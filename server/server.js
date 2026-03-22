const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(express.static(path.join(__dirname,"../public")));
app.use("/uploads",express.static(path.join(__dirname,"../uploads")));
app.use("/admin",express.static(path.join(__dirname,"../admin")));

app.get("/",(req,res)=>{
res.sendFile(path.join(__dirname,"../public/index.html"));
});


/* =========================
   EMAIL CONFIGURATION
========================= */

const transporter = nodemailer.createTransport({

service:"gmail",

auth:{
user:"heavencustodio2023@gmail.com",
pass:"jmcdykgubwmrjwra"
}

});


/* =========================
   DATA STORAGE
========================= */

const dataFolder = path.join(__dirname,"../data");

if(!fs.existsSync(dataFolder)){
fs.mkdirSync(dataFolder);
}

const portfolioFile = path.join(dataFolder,"portfolio.json");
const ordersFile = path.join(dataFolder,"orders.json");
const servicesFile = path.join(dataFolder,"services.json");

if(!fs.existsSync(portfolioFile)) fs.writeFileSync(portfolioFile,"[]");
if(!fs.existsSync(ordersFile)) fs.writeFileSync(ordersFile,"[]");
if(!fs.existsSync(servicesFile)) fs.writeFileSync(servicesFile,"[]");

function readJSON(file){
return JSON.parse(fs.readFileSync(file));
}

function writeJSON(file,data){
fs.writeFileSync(file,JSON.stringify(data,null,2));
}


/* =========================
   PORTFOLIO UPLOAD
========================= */

const portfolioFolder = path.join(__dirname,"../public/portfolio_images");

if(!fs.existsSync(portfolioFolder)){
fs.mkdirSync(portfolioFolder,{recursive:true});
}

const portfolioStorage = multer.diskStorage({

destination:function(req,file,cb){
cb(null,portfolioFolder);
},

filename:function(req,file,cb){
cb(null,Date.now()+"-"+file.originalname);
}

});

const uploadPortfolio = multer({storage:portfolioStorage});


app.post("/api/portfolio", uploadPortfolio.single("image"), (req,res)=>{

const portfolio = readJSON(portfolioFile);

const newItem = {
id:Date.now(),
title:req.body.title,
category:req.body.category,
image:req.file.filename
};

portfolio.push(newItem);

writeJSON(portfolioFile,portfolio);

res.json({message:"Artwork uploaded"});

});


app.get("/api/portfolio",(req,res)=>{

const portfolio = readJSON(portfolioFile);

res.json(portfolio);

});


/* =========================
   SERVICES
========================= */

app.get("/api/services",(req,res)=>{

const services = readJSON(servicesFile);

res.json(services);

});

app.post("/api/services",(req,res)=>{

const services = readJSON(servicesFile);

const newService = {

id:Date.now(),
title:req.body.title,
description:req.body.description,
price:req.body.price

};

services.push(newService);

writeJSON(servicesFile,services);

res.json({message:"Service added"});

});

app.delete("/api/services/:id",(req,res)=>{

let services = readJSON(servicesFile);

const id=parseInt(req.params.id);

services = services.filter(s=>s.id!==id);

writeJSON(servicesFile,services);

res.json({message:"Service deleted"});

});


/* =========================
   ORDER FILE UPLOAD
========================= */

const orderFolder = path.join(__dirname,"../uploads");

if(!fs.existsSync(orderFolder)){
fs.mkdirSync(orderFolder,{recursive:true});
}

const orderStorage = multer.diskStorage({

destination:function(req,file,cb){
cb(null,orderFolder);
},

filename:function(req,file,cb){
cb(null,Date.now()+"-"+file.originalname);
}

});

const uploadOrder = multer({storage:orderStorage});


/* =========================
   CREATE ORDER
========================= */

app.post("/api/order", uploadOrder.array("images",10), (req,res)=>{

try{

const orders = readJSON(ordersFile);

let services = req.body["service[]"] || req.body.service;
let quantities = req.body["quantity[]"] || req.body.quantity;

if(!services) services=[];
if(!quantities) quantities=[];

if(!Array.isArray(services)) services=[services];
if(!Array.isArray(quantities)) quantities=[quantities];

let images=[];

if(req.files){
images = req.files.map(file=>file.filename);
}

const newOrder = {

id:Date.now(),
name:req.body.name,
email:req.body.email,
services:services,
quantities:quantities,
message:req.body.message,
images:images,
status:"Pending"

};

orders.push(newOrder);

writeJSON(ordersFile,orders);


/* =========================
   SEND ORDER EMAIL
========================= */

const serviceList = services.map((s,i)=>`${quantities[i]}x ${s}`).join("\n");

const mailOptions = {

from:"yourgmail@gmail.com",

to:req.body.email,

subject:"Your Render Graphics Order",

text:`
Thank you for ordering from Render Graphics!

Order ID: ${newOrder.id}

Services Ordered:
${serviceList}

Track your order here:
http://localhost:3000/track.html

Save your Order ID to check your order status.

Thank you!
Render Graphics
`

};

transporter.sendMail(mailOptions,(error,info)=>{

if(error){
console.log(error);
}else{
console.log("Email sent: "+info.response);
}

});


res.json({
message:"Order submitted",
orderId:newOrder.id
});

}catch(err){

console.error(err);

res.status(500).json({message:"Server error"});

}

});


/* =========================
   GET ORDERS
========================= */

app.get("/api/orders",(req,res)=>{

const orders = readJSON(ordersFile);

res.json(orders);

});


/* =========================
   UPDATE ORDER STATUS
========================= */

app.put("/api/orders/:id",(req,res)=>{

const orders = readJSON(ordersFile);

const id=parseInt(req.params.id);

const order=orders.find(o=>o.id===id);

if(!order){
return res.status(404).json({message:"Order not found"});
}

if(req.body.status){
order.status=req.body.status;
}

if(req.body.artistMessage!==undefined){
order.artistMessage=req.body.artistMessage;
}

writeJSON(ordersFile,orders);

res.json({message:"Order updated"});

});


/* =========================
   UPLOAD FINISHED ARTWORK
========================= */

const uploadFinished = multer({dest:"uploads"});

app.post("/api/orders/finish", uploadFinished.single("finishedFile"), (req,res)=>{

const orders = readJSON(ordersFile);

const id = parseInt(req.body.orderId);

const order = orders.find(o => o.id === id);

if(!order){
return res.status(404).json({message:"Order not found"});
}

if(req.file){
order.finishedFile = req.file.filename;
}

order.artistMessage = req.body.artistMessage;
order.status = req.body.status;

writeJSON(ordersFile,orders);

res.json({message:"Order updated"});

});


/* =========================
   START SERVER
========================= */

app.listen(3000,()=>{

console.log("Server running on http://localhost:3000");

});

app.delete("/api/portfolio/:id", (req, res) => {

  let portfolio = readJSON(portfolioFile);

  const id = parseInt(req.params.id);

  portfolio = portfolio.filter(item => item.id !== id);

  writeJSON(portfolioFile, portfolio);

  res.json({ message: "Portfolio item deleted" });

});
