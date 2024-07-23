let express = require('express');
let ejs = require('ejs');
let bodyParser = require('body-parser');
let mysql = require('mysql');
let session = require('express-session');

mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project"
})


let app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.listen(8080);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false, // Set resave option to false
    saveUninitialized: true,
    // Save uninitialized sessions
    // Add other session options as needed
}));

function isProductInCart(cart, id) {
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].id == id) {
            return true;
        }
    }
    return false;
};

function calculateTotal(cart, req) {
    total = 0;
    for (let i = 0; i < cart.length; i++) {
        // if we'are offering a discount price
        if (cart[i].sale_price) {
            total = total + (cart[i].sale_price * cart[i].quantity);

        } else {
            total = total + (cart[i].price * cart[i].quantity)
        }
    }
    req.session.total = total;
    return total;
};




app.get('/', function (req, res) {

    let con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    con.query("SELECT * FROM products", (err, result) => {
        res.render('pages/index', { result: result });
    })


});
app.post('/add_to_cart', function (req, res) {
    let id = req.body.id;
    let name = req.body.name;
    let price = req.body.price;
    let sale_price = req.body.sale_price;
    let quantity = req.body.quantity;
    let image = req.body.image;
    let product = { id: id, name: name, price: price, sale_price: sale_price, quantity: quantity, image: image };

    if (req.session.cart) {
        let cart = req.session.cart;
        if (!isProductInCart(cart, id)) {
            cart.push(product);

        }

    } else {
        req.session.cart = [product];
        let cart = req.session.cart;

    }
    // calculate total
    // calculateTotal(cart, req);
    res.redirect('/cart');
});

app.get('/cart', function (req, res) {
    let cart = req.session.cart; // Retrieve cart from session
    let total = req.session.total;

    res.render('pages/cart', { cart: cart, total: total }); // Pass cart to the template
});
app.post('/remove_product', function (req, res) {
    let id = req.body.id;

    if (req.session.cart) {
        let cart = req.session.cart;


        req.session.cart = cart.filter(product => product.id !== id);


        calculateTotal(req.session.cart, req);
    }


    res.redirect('/cart');
});

app.post('/edit_product_quantity', function (req, res) {
    let id = req.body.id;
    let quantity = req.body.quantity;
    let increase_btn = req.body.increase_product_quantity_btn;
    let decrease_btn = req.body.decrease_product_quantity_btn;
    let cart = req.session.cart;

    if (increase_btn) {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id == id) {
                if (cart[i].quantity > 0) {
                    cart[i].quantity = parseInt(cart[i].quantity) + 1;
                }
            }
        }
    }
    if (decrease_btn) {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id == id) {
                if (cart[i].quantity > 1) {
                    cart[i].quantity = parseInt(cart[i].quantity) - 1;
                }
            }
        }
    }




    calculateTotal(cart, req)
    res.redirect('/cart')
})

app.get('/checkout', function (req, res) {
    let total = req.session.total
    res.render('pages/checkout', { total: total })
})
app.post('/place_order', function (req, res) {

    let name = req.body.name;
    let email = req.body.email;
    let phone = req.body.phone;
    let city = req.body.city;
    let address = req.body.address;
    let cost = req.session.total;
    let status = "not paid";
    let date = new Date();
    let product_ids = "";
    let id = Date.now();
    req.session.order_id = id;

    let con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    let cart = req.session.cart;
    for (let i = 0; i < cart.length; i++) {
        product_ids = product_ids + "," + cart[i].id
    }
    con.connect((err) => {
        if (err) {
            console.log(err)
        } else {
            let query = "INSERT INTO orders (id,cost,name,email,status,city,address,phone,date,product_ids) VALUES?";
            let values = [[id, cost, name, email, status, city, address, phone, date, product_ids]];
            con.query(query, [values], (err, result) => {
                for (let i = 0; i < cart.length; i++) {
                    let query = "INSER INTO order_items(order_id,product_id,product_name,product_price,product_image,product_quantity,order_date)VALUE?";
                    let values = [[id, cart[i].id, cart[i].name, cart[i].price, cart[i].image, cart[i].quantity, new Date()]];
                    con.query(query, [values], (err, result) => { })
                }


                res.redirect('/payment');
            })
        }
    })

})
app.get('/payment', function (req, res) {
    let total = req.session.total;

    res.render('pages/payment', { total: total })
})

app.get("/verify_payment", function (req, res) {
    let transaction_id = req.query.transaction_id;
    let order_id = req.session.order_id;

    let con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    con.connect((err) => {
        if (err) {
            console.log(err)
        } else {
            let query = "INSERT INTO payments (order_id,transaction_id,date) VALUES?";
            let values = [[order_id, transaction_id, new Date()]]
            con.query(query, [values], (err, result) => {
                con.query("UPDATE orders SET status='paid WHERE id=`" + order_id + "`", (err, result) => { })
                res.redirect('/thank_you')


            }
            )
        }
    })
})

app.get("/thank_you", function (req, res) {
    let order_id = req.session.order_id
    res.render("pages/thank_you", { order_id: order_id })
})



app.get('/single_product', function (req, res) {
    let id = req.query.id

    let con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    con.query("SELECT * FROM products WHERE id='" + id + "'", (err, result) => {
        res.render('pages/single_product', { result: result });
    })

})
app.get('/products', function (req, res) {
    let con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    con.query("SELECT * FROM products", (err, result) => {
        res.render('pages/products', { result: result });
    })



})
app.get('/about', function (req, res) {
    res.render('pages/about')
})