var express = require("express");
var router = express.Router();
var Product = require("../models/product");
var Cart = require('../models/cart');
const request = require('request');
const jsSHA = require("jssha");

/* GET home page. */
router.get("/", function (req, res, next) {
  Product.find(function (err, docs) {
    var productChunks = [];
    var chunkSize = 3;
    for (var i = 0; i < docs.length; i += chunkSize) {
      productChunks.push(docs.slice(i, i + chunkSize));
    }
    res.render("shop/index", { title: "Shopping Cart", products: productChunks });
  }).lean();
});

router.get('/add-to-cart/:id', function (req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  Product.findById(productId, function (err, product) {
    if (err) {
      return res.redirect('/');
    }
    cart.add(product, product.id);
    req.session.cart = cart;
    console.log(req.session.cart);
    res.redirect('/');
  })
});

router.get('/remove-cart/:id', function (req, res, next) {
  var cart = new Cart(req.session.cart ? req.session.cart : {});
  cart.remove(req.params.id);
  req.session.cart = cart;
  res.redirect("/shopping-cart");
});

router.get('/shopping-cart', function (req, res, next) {
  if (!req.session.cart) {
    return res.render('shop/shopping-cart', { products: null });
  }
  var cart = new Cart(req.session.cart);
  var totalPrice = Math.ceil(cart.totalPrice);
  res.render('shop/shopping-cart', { products: cart.generateArray(), totalPrice: totalPrice });

});

router.get('/checkout', function (req, res, next) {
  if (!req.session.cart) {
    return res.redirect('/shopping-cart');
  }
  var cart = new Cart(req.session.cart);
  var errMsg = req.flash('error')[0];
  res.render('shop/checkout', { total: cart.totalPrice, errMsg: errMsg, noError: !errMsg });
});

router.post('/payment_gateway/payumoney', function (req, res, next) {
  var ord = JSON.stringify(Math.random() * 1000);
  var i = ord.indexOf('.');
  ord = 'ORD' + ord.substr(0, i);
  req.body.txnid = ord;
  const pay = req.body;
  const hashString = 'yoxcWQG6' //store in in different file
    + '|' + pay.txnid
    + '|' + pay.amount
    + '|' + pay.productinfo
    + '|' + pay.firstname
    + '|' + pay.email
    + '|' + '||||||||||'
    + 'KfuAiZg54x';
  const sha = new jsSHA('SHA-512', "TEXT");
  sha.update(hashString);
  //Getting hashed value from sha module
  const hash = sha.getHash("HEX");

  //We have to additionally pass merchant key to API
  pay.key = 'yoxcWQG6' //store in in different file;
  pay.surl = 'http://localhost:3000/payment/success';
  pay.furl = 'http://localhost:3000/payment/failure';
  pay.hash = hash;
  //Making an HTTP/HTTPS call with request
  request.post({
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    url: 'https://sandboxsecure.payu.in/_payment', //Testing url
    form: pay
  }, function (error, httpRes, body) {
    if (error)
      res.send(
        {
          status: false,
          message: error.toString()
        }
      );
    if (httpRes.statusCode === 200) {
      res.send(body);
    } else if (httpRes.statusCode >= 300 &&
      httpRes.statusCode <= 400) {
      res.redirect(httpRes.headers.location.toString());
    }
  })
});

router.post('/payment/success', (req, res) => {
  res.send(req.body);
});

router.post('/payment/failure', (req, res) => {
  //res.send(req.body);
  res.render('payment/failure');
});

module.exports = router;
