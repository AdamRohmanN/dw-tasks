const express = require('express')
const session = require('express-session')
const flash = require('express-flash')
const db = require('./connection/db')
const upload = require('./middleware/file-upload')
const bycrypt = require('bcrypt')

const app = express()

app.set('view engine', 'hbs')

app.use("/images", express.static(__dirname+"/images"))
app.use(express.static(__dirname+"/public"))
app.use(express.urlencoded({extended: false}))
app.use(flash())
app.use(session({
    secret: 'dontKnow',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    }
}))

app.get("/", (req, res) => {
    let order = `SELECT tb_blog.id, author_id, tb_user.username as author, tb_user.email, title, start_date, end_date, technologies, image, description
	FROM tb_blog LEFT JOIN tb_user ON tb_blog.author_id = tb_user.id ORDER BY id DESC`

    db.connect( (error, client, done) => {
        if (error) throw error

        client.query(order, (error, result) => {
            if (error) throw error

            let data = result.rows
            
            data = data.map( (access) => {
                return {
                    ...access
                    ,dateDiss: timeDiss(access.start_date, access.end_date)
                    ,node: access.technologies[0]
                    ,react: access.technologies[1]
                    ,next: access.technologies[2]
                    ,type: access.technologies[3]
                    ,login: req.session.login
                }
            })
            console.log(data);
            res.render("index", {login: req.session.login, user: req.session.user, blogs: data})
        })
    })
})

app.get("/register", (req, res) => {
    res.render("register")
})
app.post("/register", (req, res) => {
    const {username, email, password} = req.body
    const hashedPerSecond = 10
    const hashedPassword = bycrypt.hashSync(password, hashedPerSecond)

    const order = `INSERT INTO tb_user(username, email, password) VALUES (
        '${username}', '${email}', '${hashedPassword}')`

    db.connect( (error, client, done) => {
        if (error) throw error

        client.query(order, (error, result) => {
            if (error) throw error
            done()
            
            res.redirect("/login")
        })
    })
})

app.get("/login", (req, res) => {
    res.render("login")
})
app.post("/login", (req, res) => {
    const {username, email, password} = req.body
    const order = `SELECT * FROM tb_user WHERE email='${email}'`

    db.connect( (error, client, done) => {
        if (error) throw error

        client.query(order, (error, result) => {
            if (error) throw error
            done()

            if (result.rows == 0) {
                req.flash('danger', "email belum terdaftar")
                return res.redirect("/login")
            }
            const passCheck = bycrypt.compareSync(password, result.rows[0].password)

            if (passCheck) {
                req.session.login = true
                req.session.user = {
                    id: result.rows[0].id,
                    username: result.rows[0].username,
                    email: result.rows[0].email
                }
                req.flash('success', "login successfully!")
                res.redirect("/")
            } else {
                req.flash('danger', "wrong password!")
                res.redirect("/login")
            }
        })
    })
})

app.get("/logout", (req, res) => {
    req.session.destroy()
    res.redirect("/")
})

app.get("/blog-add", (req, res) => {
    if (!req.session.login) {
        req.flash('danger', "silahkan Login terlebih dahulu")
        return res.redirect("/login")
    }
    res.render("blog-add", {login: req.session.login, user: req.session.user})
})
app.post("/add-blog", upload.single('inputImage'), (req, res) => {
    let data = req.body
    let image = req.file.filename
    let order = `INSERT INTO tb_blog(title, start_date, end_date, description, technologies, author_id, image)
        VALUES ('${data.inputTitle}', '${data.inputStart}', '${data.inputEnd}', '${data.inputDesc}',
        '{${data.nodeJs}, ${data.reactJs}, ${data.nextJs}, ${data.typeScript}}', '${req.session.user.id}',
        '${image}')`

    db.connect( (error, client, done) => {
        if (error) throw error

        client.query(order, (error, result) => {
            if (error) throw error
            done()

            res.redirect("/")
        })
    })
})

app.get("/blog-edit/:id", (req, res) => {
    if (!req.session.login) {
        req.flash('danger', "silahkan Login terlebih dahulu")
        return res.redirect("/login")
    }
    let id = req.params.id
    let order = `SELECT * FROM tb_blog WHERE id=${id}`

    db.connect( (error, client, done) => {
        if (error) throw error

        client.query(order, (error, result) => {
            if (error) throw error
            let data = result.rows[0]
            done()

            data = {
                id: id
                ,title: data.title
                ,start: yyyymmdd(data.start_date)
                ,end: yyyymmdd(data.end_date)
                ,description: data.description
                ,node: checking(data.technologies[0])
                ,react: checking(data.technologies[1])
                ,next: checking(data.technologies[2])
                ,type: checking(data.technologies[3])
                ,image: data.image
            }
            console.log(data);
            res.render("blog-edit", {login: req.session.login, user: req.session.user, blog: data})
        })
    })
})
app.post("/update-blog/:id", upload.single('inputImage'), (req, res) => {
    let id = req.params.id
    let data = req.body

    data = {
        id: id
        ,title: data.title
        ,start: yyyymmdd(data.start_date)
        ,end: yyyymmdd(data.end_date)
        ,description: data.description
        ,node: checking(data.technologies[0])
        ,react: checking(data.technologies[1])
        ,next: checking(data.technologies[2])
        ,type: checking(data.technologies[3])
        ,image: data.image
    }
    const order = `UPDATE public.tb_blog
	SET title='${data.inputTitle}', start_date='${data.inputStart}', end_date='${data.inputEnd}', description='${data.inputDesc}', technologies='{${data.nodeJs}, ${data.reactJs}, ${data.nextJs}, ${data.typeScript}}', image='${data.inputImage}'
	WHERE id=${id}`
    
    db.connect( (error, client, done) => {
        if (error) throw error
        
        client.query(order, (error, result) => {
            if (error) throw error
            done()
            console.log(data);
            res.redirect("/")
        })
    })
})

app.get("/delete-blog/:id", (req, res) => {
    let id = req.params.id
    let order = `DELETE FROM tb_blog WHERE id=${id}`
    
    db.connect( (error, client, done) => {
        if (error) throw error
        
        client.query(order, (error, result) => {
            if (error) throw error
            done()
            
            res.redirect("/")
        })
    })
})

app.get("/blog-detail/:id", (req, res) => {
    let id = req.params.id
    let order = `SELECT tb_blog.id, author_id, tb_user.username as author, tb_user.email, title, start_date, end_date, technologies, image, description
	FROM tb_blog LEFT JOIN tb_user ON tb_blog.author_id = tb_user.id WHERE tb_blog.id=${id}`

    db.connect( (error, client, done) => {
        if (error) throw error

        client.query(order, (error, result) => {
            if (error) throw error
            let data = result.rows
            done()
            
            data = data.map( (access) => {
                return {
                    ...access
                    ,dateDiss: timeDiss(access.start_date, access.end_date)
                    ,started: ddmonthyy(access.start_date)
                    ,ended: ddmonthyy(access.end_date)
                    ,node: access.technologies[0]
                    ,react: access.technologies[1]
                    ,next: access.technologies[2]
                    ,type: access.technologies[3]
                    ,login: req.session.login
                }
            })
            console.log(data);
            res.render("blog-detail", {login: req.session.login, user: req.session.user, blog: data})
        })
    })
})

app.get("/contact", (req, res) => {
    res.render("contact", {login: req.session.login, user: req.session.user})
})

function timeDiss(start, end) {
    let started = new Date(start)
    let ended = new Date(end)

    let distance = Math.abs(started-ended)

    let distanceSecond = Math.floor(distance / 1000)
    let distanceMinute = Math.floor(distance / (1000 * 60))
    let distanceHour = Math.floor(distance / (1000 * 60 * 60))
    let distanceDay = Math.floor(distance / (1000 * 60 * 60 * 24))
    let distanceMonth = Math.floor(distance / (1000 * 60 * 60 * 24 * 30))
    let distanceYear = Math.floor(distance / (1000 * 60 * 60 * 24 * 365))

    if (distanceYear > 0) {
        return `${distanceYear} years ago`
    } else if (distanceMonth > 0) {
        return `${distanceMonth} months ago`
    } else if (distanceDay > 0) {
        return `${distanceDay} days ago`
    } else if (distanceHour > 0) {
        return `${distanceHour} hours ago`
    } else if (distanceMinute > 0) {
        return `${distanceMinute} minutes ago`
    } else {
        return `${distanceSecond} seconds ago`
    }
}

function ddmonthyy(x) {
    let months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

    let date = x.getDate()
    let month = x.getMonth()
    let year = x.getFullYear()

    let formatedDate = `${date} ${months[month]} ${year}`
    return formatedDate
}

function yyyymmdd(x) {
    let date = x.getDate().toString().padStart(2, "0")
    let month = (x.getMonth()+1).toString().padStart(2, "0")
    let year = x.getFullYear()

    let formatedDate = `${year}-${month}-${date}`
    return formatedDate
}

function checking(x) {
    if (x === 'on' || x === 'true') {
        return true
    } else {
        return false
    }
}

app.listen(process.env.PORT || 3000)

// ---LEFT JOIN--- //
// SELECT tb_blog.id, title, start_date, end_date, description, technologies, image, author_id
// 	FROM tb_blog LEFT JOIN tb_user ON tb_blog.author_id = tb_user.id