// 引入express模块
const express = require('express')
// 初始化express模块的app
const app = express()

//引入bodyParser
const bodyParser = require('body-parser')
// 初始化urlencoded解析器
const urlencodedParser = bodyParser.urlencoded({
    extended: false
})

// 引入cookieparser模块
const cookieParser = require('cookie-parser')

// 引入自己实现的MongoControl模块
const MongoControl = require('./tools/databasecontrol').MongoControl
// 初始化文章表
const page = new MongoControl('blog', 'page')
// 初始化存储的集合
const comment = new MongoControl('blog', 'comment')

//引入ejs做后端渲染
const ejs = require('ejs')

//引入moment模块处理时间格式
const moment = require('moment')


// 为请求添加中间件：解析cookie
app.use(cookieParser())

var Ip = ''
//处理静态文件请求
app.use(express.static('./static', {
    index: false
}))

//后台功能接口的静态文件请求
app.use('/admin', express.static('./static', {
    index: false
}))
//后台功能路由
app.use('/admin', require('./admin'))


//前台程序相关的接口
// 首页接口
app.get('/', function (req, res) {
    
    //在page数据库里查找全部文章
    page.find({}, function (err, data) {
        //ejs渲染json文章数据到页面中
        ejs.renderFile('./ejs-tpl/index.ejs', {
            data: data
        }, function (error, html) {
            res.send(html)
            
        })
    })
})
//文章浏览接口
app.get('/p', function (req, res) {
    // 获取前端传入的_id
    var _id = req.query._id
    // 根据_id查询文章
    page.findById(_id, function (err, result) {
        // 如果没有这篇文章，则报404
        if (result.length == 0) {
            res.status(404).send('没有找到啊！')
            return
        }

        //根据文章的id查询相关评论

        var data = result[0] //id查询肯定只返回一条
        comment.find({
            fid: _id,
            state: 1
        }, function (err, result) {
            //渲染评论
            ejs.renderFile('./ejs-tpl/page.ejs', {
                data: data,
                comment: result
            }, function (err, html) {
                res.send(html)
            })
        })
    })
})
app.get('/getIp',function(req,res){
    Ip = req.query.Ip
    console.log(Ip)
})
// 前台用户提交评论接口
app.post('/submitComment', urlencodedParser, function (req, res) {

    //获取携带在url中的文章id
    var _id = req.query._id
    var fauthor = req.query.author
    //获取评论内容 email 和content
    var {
        email,
        content
    } = req.body

    //简单的表单验证 ： 不允许为空
    if (!_id || !fauthor) {
        res.send('不允许评论')
        return
    }
    if (!email || !content) {
        res.send('不允许评论')
        return
    }
    //操作评论数据库
    comment.insert({
        fid: _id,
        author: email,
        content: content,
        fauthor: fauthor,
        ffid: _id,
        date: moment().format('YYYY-MM-DD HH-mm-ss'),
        state: 0,
        fabulous: 0,
        Ips : [{Ip : '',fabulousStatus : 0}]
    }, (err, result) => {
        if (err) {
            //如果数据库操作失败，则反500
            res.status(500).send('你发了什么评论把我的服务器干崩了？')
            return
        }
        //成功则重定向到这个文章
        res.redirect(
            '/p?_id=' + _id
        )
    })
})

app.post('/submitReplyComment', urlencodedParser, function (req, res) {
    var ffid = req.query.fid
    var fauthor = req.query.f_author
    var fid = req.query.ffid
    var {
        email,
        content
    } = req.body
    if (!ffid || !fauthor || !fid) {
        res.send('不允许评论')
        return
    }
    if (!email || !content) {
        res.send('不允许评论')
        return
    }
    comment.insert({
        fid: fid,
        author: email,
        content: content,
        fauthor: fauthor,
        ffid: ffid,
        date: moment().format('YYYY-MM-DD HH-mm-ss'),
        state: 0,
        fabulous: 0,
        Ips : [{Ip : '',fabulousStatus : 0}]
    }, function (err, result) {
        if (err) {
            //如果数据库操作失败，则反500
            res.status(500).send('你回复了什么评论把我的服务器干崩了？')
            return
        }
        //成功则重定向到这个文章
        res.redirect(
            '/p?_id=' + fid
        )
    })

})
app.get('/chulizan', function (req, res) {
    var IpsArr = []
    _id = req.query._id
    fs = req.query.fs
    comment.findById(_id,function(err,result){
        if(err){
        res.send('点错了')
        return
        }
        var data = result[0]
        console.log(data)
        if(data.Ips[0].Ip.length == 0 && data.Ips[0].fabulousStatus == 0){
            var fabulous = data.fabulous+1
            var arr = data.Ips
            arr.push({
                Ip : Ip,
                fabulousStatus : 1
            })
            arr.splice(0,1)
            comment.updateById(_id,{
                fid:  data.fid,
                author: data.author,
                content: data.content,
                fauthor: data.fauthor,
                ffid: data.ffid,
                date: moment().format('YYYY-MM-DD HH-mm-ss'),
                state: arr,
                fabulous: fabulous,
                
            },function(err,result){
                if(err){
                    console.log(1111)
                    return
                }
                console.log(result)
                res.redirect('/p?_id=' + data.fid)
            })
        }
    })
})
//监听 3000 端口
app.listen(3000)
