var express = require('express')
var router = express.Router() //功能和app一样

var urlencodedParser = require('body-parser').urlencoded({ extended: false })
var moment = require('moment')
var MongoControl = require('./tools/databasecontrol').MongoControl
var path = require('path')

//引入cookie管理模块
const CookieControl = require('./cookie')

var admin = new CookieControl()

const page = new MongoControl('blog', 'page')
const comment = new MongoControl('blog', 'comment')
const user = new MongoControl('blog', 'user')
    //   /uploadPage上传文章

router.get('/', function(req, res) {
    if (admin.checkToken(req.cookies.token)) {
        res.sendFile(
            path.resolve('./static/admin.html')
        )
    } else {
        res.redirect('/admin/login')
    }

})

router.get('/login', function(req, res) {
    res.sendFile(
        path.resolve('./static/login.html')
    )
})
router.post('/login', urlencodedParser, function(req, res) {
    var { username, password } = req.body
    user.find({}, function(error, data) {
        if (data.length == 0) {
            res.redirect('/admin/register')
            return
        }
        var count = 0
        if (error) {
            res.status(500).send("你这是啥密码啊")
        }
        data.forEach(element => {
            if (username == element.username && password == element.password) {
                res.cookie('token', admin.getToken())
                    // res.send('登录成功')
                res.redirect('/admin')
            } else {
                count++
            }
            if (count == data.length) {
                res.redirect('/admin/login')
            }
        });
    })
})
router.get('/register', function(req, res) {
    res.sendFile(
        path.resolve('./static/register.html')
    )
})
router.post('/register', urlencodedParser, function(req, res) {
    var { username, password } = req.body
    user.find({}, function(error, data) {
        console.log(data.length)
        if (data.length == 0) {
            user.insert({
                username: username,
                password: password
            }, function() {
                res.redirect('/admin/login')
            })
            return;
        }
        var count = 0
        if (error) {
            res.status(500).send("你注册的啥啊，把我服务器干崩了")
        }
        data.forEach(element => {
            if (username == element.username) {
                res.send('此账号已经被注册')
            } else {
                count++
            }
            if (count == data.length) {
                user.insert({
                    username: username,
                    password: password
                }, function() {
                    res.redirect('/admin/login')
                })
            }
        });
    })
})
router.post('/uploadPage', urlencodedParser, function(req, res) {
    if (admin.checkToken(req.cookies.token)) {

    } else {
        res.status(403).send('你没有权限')
        return
    }

    var { sort, title, author, content, intro } = req.body
    var now = moment().format('YYYY-MM-DD HH-mm-ss')
    page.insert({
        sort: sort,
        title: title,
        author: author,
        content: content,
        intro: intro,
        date: now
    }, () => {
        res.send('文章发表成功')
    })
})

//评论相关接口
router.get('/getComment', function(req, res) {
    if (admin.checkToken(req.cookies.token)) {

    } else {
        res.status(404).send('你没有权限')
        return
    }
    comment.find({ state: 0 }, function(error, data) {
        if (data.length == 0) {
            res.send([])
            return
        }
        var count = 0
        for (var i = 0; i < data.length; i++) {
            var nowData = data[i]
            var nowDataFid = nowData.fid
            page.findById(nowDataFid, function(error, result) {
                var page = result[0]
                nowData.f_title = page.title
                nowData.f_intro = page.intro
                count++
                if (count == data.length) {
                    res.send(data)
                }
            })
        }
    })
})
router.get('/passComment', function(req, res) {
    if (admin.checkToken(req.cookies.token)) {

    } else {
        res.status(404).send('你没有权限')
        return
    }
    var _id = req.query._id
    comment.updateById(_id, { state: 1 }, function(error, result) {
        res.send({
            result: 'ok'
        })
    })
})
router.get('/nopassComment', function(req, res) {
    if (admin.checkToken(req.cookies.token)) {

    } else {
        res.status(404).send('你没有权限')
        return
    }
    var _id = req.query._id
    comment.updateById(_id, { state: 2 }, function(error, result) {
        res.send({
            result: 'ok'
        })
    })
})
module.exports = router