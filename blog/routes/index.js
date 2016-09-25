var crypto = require('crypto'),
    User = require('../models/user.js'),
    Post = require('../models/post.js');
var express = require('express');
var router = express.Router();
var multer = require('multer');

//文件上传
var storage = multer.diskStorage({
	destination: function (req,file,cb) {
		cb(null, './public/images')
	},
	filename: function (req, file, cb) {
		cb(null,file.originalname)
	}
});
var upload = multer({
	storage: storage
});

/* GET home page. */
router.get('/', function (req, res) {
  Post.getAll(null, function (err, posts, users) {
    if (err) {
      posts = [];
    } 
    res.render('index', {
      title: '主页',
      // name: users.name,
      user: req.session.user,
      posts: posts,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

router.get('/register', checkNotLogin);
router.get('/register', function(req, res, next) {
  	res.render('register', {
  		title: '注册',
  		user: req.session.user,
  		success: req.flash('success').toString(),
  		error: req.flash('error').toString() 
  	});
});

router.post('/register', checkNotLogin);
router.post('/register', function (req, res) {
  var name = req.body.name,
      password = req.body.password,
      password_re = req.body['password-repeat'];
  //检验用户两次输入的密码是否一致
  if (password_re != password) {
    req.flash('error', '两次输入的密码不一致!'); 
    return res.redirect('/register');//返回注册页
  }
  //生成密码的 md5 值
  var md5 = crypto.createHash('md5'),
      password = md5.update(req.body.password).digest('hex');
  var newUser = new User({
      name: name,
      password: password,
      email: req.body.email
  });
  //检查用户名是否已经存在 
  User.get(newUser.name, function (err, user) {
    if (err) {
      req.flash('error', err);
      return res.redirect('/');
    }
    if (user) {
      req.flash('error', '用户已存在!');
      return res.redirect('/register');//返回注册页
    }
    //如果不存在则新增用户
    newUser.save(function (err, user) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/register');//注册失败返回主册页
      }
      req.session.user = newUser;//用户信息存入 session
      req.flash('success', '注册成功!');
      res.redirect('/');//注册成功后返回主页
    });
  });
});

router.get('/login', checkNotLogin);
router.get('/login', function(req, res, next) {
  	res.render('login', { 
  		title: '登录',
  		user: req.session.user,
  		success: req.flash('success').toString(),
  		error: req.flash('error').toString()
  	});
});

router.post('/login', checkNotLogin);
router.post('/login', function(req, res, next) {
	//生成密码的 md5值
	var md5 = crypto.createHash('md5'),
		password = md5.update(req.body.password).digest('hex');
	//检查用户是否存在
	User.get(req.body.name,function (err,user) {
		if(!user) {
			req.flash('error','用户不存在!');
			return res.redirect('/login'); //用户不存在则跳转登录页
		}
		//检查密码是否一致
		if(user.password != password) {
			req.flash('error','密码错误!');
			return res.redirect('login'); //密码错误则跳转到登录页
		}
		//用户名密码都匹配,将用户信息存入session
		req.session.user = user;
		req.flash('success', '登陆成功!');
		res.redirect('/'); //登陆成功后跳转到主页
	});
});

router.get('/post', checkLogin);
router.get('/post', function (req, res) {
	res.render('post', {
	  title: '发表',
	  user: req.session.user,
	  success: req.flash('success').toString(),
	  error: req.flash('error').toString()
	});
});

router.post('/post', checkLogin);
router.post('/post', function(req, res) {
	var currentUser = req.session.user,
		post = new Post(currentUser.name,req.body.title,req.body.post);
	post.save(function(err) {
		if(err) {
			req.flash('error', err);
			return res.redirect('/');
		}
		req.flash('success','发布成功!');
		res.redirect('/');//发表成功跳转到主页
	});
});

router.get('/logout', checkLogin);
router.get('/logout', function(req, res, next) {
	req.session.user = null;
	req.flash('success','登出成功!');
	res.redirect('/'); //登出成功后跳转到主页
});

router.get('/upload', checkLogin);
router.get('/upload', function (req, res) {
  res.render('upload', {
    title: '文件上传',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});

//添加对文件上传的支持
router.post('/upload',checkLogin);
router.post('/upload',upload.array('field1', 5),function(req, res) {
	req.flash('success', '文件上传成功!');
	req.redirect('/upload');
});

router.get('/u/:name/:day', function (req, res) {
  //检查用户是否存在
  User.get(req.params.name, function (err, user) {
    if (!user) {
      req.flash('error', '用户不存在!'); 
      return res.redirect('/');//用户不存在则跳转到主页
    }
    //查询并返回该用户的所有文章
    Post.getAll(user.name, function (err, posts) {
      if (err) {
        req.flash('error', err); 
        return res.redirect('/');
      } 
      res.render('user', {
        title: user.name,
        posts: posts,
        user : req.session.user,
        success : req.flash('success').toString(),
        error : req.flash('error').toString()
      });
    });
  }); 
});

router.get('/u/:name/:day/:title', function (req, res) {
  Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err); 
      return res.redirect('/');
    }
    res.render('article', {
      title: req.params.title,
      post: post,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

function checkLogin(req, res, next) {
    if (!req.session.user) {
      req.flash('error', '未登录!'); 
      res.redirect('/login');
    }
    next();
  }

function checkNotLogin(req, res, next) {
	if (req.session.user) {
	  req.flash('error', '已登录!'); 
	  res.redirect('back');
	}
	next();
}

module.exports = router;
