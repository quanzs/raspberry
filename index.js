var express = require('express');
var app = express();
var http = require('http').Server(app);
var qr = require('qr-image');
var io = require('socket.io')(http);

// 使用ejs模板引擎
app.set("view engine","ejs");
// 引入css静态资源
app.use("/", express.static('public'));

// 默认显示views/index.ejs页面
app.get('/', function (req, res) {
  res.render("index", {title:"扫一扫登录"});
});

// 生成二维码
app.get('/create_qrcode', function (req, res, next) {
    var text = req.query.text;
    try {
        var img = qr.image(text,{size :10});
        res.writeHead(200, {'Content-Type': 'image/png'});
        img.pipe(res);
    } catch (e) {
        console.log(e);
        res.writeHead(414, {'Content-Type': 'text/html'});
        res.end('<h1>414 Request-URI Too Large</h1>');
    }
});

// 跳转到登录页面(views/login.ejs)
app.get('/forlogin', function (req, res, next) {
  res.render("login", {r:req.query.r, sid: req.query.sid});
});

// 跳转到登录成功页面(views/success.ejs)
app.get('/success', function (req, res, next) {
  res.render("success", {});
});

// socket监视
io.on('connection', function(socket){
  console.log("a new user login");

  // 定期刷新二维码
  socket.on('refreshQRcode', function(msg){
    console.log("refreshQRcode");
    refreshQR(socket);
    // 定时刷新
    setInterval(function(){
      refreshQR(socket);
    }, 60000);
  });

  // 手机端允许用户登录按下处理
  socket.on('permit', function(data){
    console.log("permit" + data.sid);
    // 取得允许登录的用户socket
    var targetClient = io.sockets.sockets[data.sid];
    if(targetClient) {
      // 检查验证码是否已过期
      if(targetClient.token != data.r) {
        // 通知手机端验证码已经过期
        socket.emit("permitResult", "您的验证码已过期。");
        return;
      }
      // 通知手机端和pc端登录成功。
      socket.emit("permitResult", "登录成功");
      targetClient.emit("permitResult", "OK");
    }
  });
});

// 启动服务
var server = http.listen(80, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

// 刷新二维码
function refreshQR(socket) {
  var data = {
    sid: socket.id,
    token: new Date().getTime()
  }
  socket.emit("refreshQRcode", data);
  // 保存token, 登录时用来验证验证码是否过期
  socket.token = data.token;
}