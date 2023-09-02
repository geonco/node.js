// express : 서버를 쉽게 짜기 위한 라이브러리
const express = require('express');
const app = express();

// socket.io 세팅
const http = require('http').createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

// 요청과 응답 시 요청의 본문을 지정한 형태로 파싱해주는 미들웨어
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

// ejs 파일
app.set('view engine', 'ejs');

// static 파일을 보관하기 위해 public 폴더를 쓸 것이다.
app.use('/public', express.static('public'));

// 메소드 오버라이드 (put, delete 요청 가능하게 함)
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// 회원인증 기능을 위한 라이브러리
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
// app.use(미들웨어), 미들웨어 : 요청-응답 중간에 실행되는 코드
app.use(session({ secret: '비밀코드', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// 환경 변수 사용을 위해
require('dotenv').config();

// 암호화를 위한 라이브러리
const bcrypt = require('bcrypt');

// 오류 메시지 띄우기 위한 라이브러리
const flash = require('express-flash');
app.use(flash());

// mongoDB
const MongoClient = require('mongodb').MongoClient;
var db;

// ObjectId() 안에 담기 위해서
const {ObjectId} = require('mongodb');



// mongoDB 내 주소와 연결
// MongoClient.connect('mongodb+srv://admin:lim1126@geonco.o8egpin.mongodb.net/?retryWrites=true&w=majority', function (에러, client) {
//     if (에러) return console.log(에러);

//     // 데이터 베이스 연결 
//     db = client.db('todoapp');

//     // 8080 포트에 서버 띄우기
//     app.listen(8080, function () {
//         console.log('listening on 8080');
//     });
// });

// env 파일을 적용하는 server.js 코드
MongoClient.connect(process.env.DB_URL, function (err, client) {
    if (err) return console.log(err);
    db = client.db('todoapp');
    http.listen(process.env.PORT, function () {
        console.log('listening on 8080')
    });
});

// /socket으로 get 요청 시
app.get('/socket', function(요청, 응답) {
    응답.render('socket.ejs');
});

// 웹소켓으로 서버에 connection 했을 때
io.on('connection', function(socket) {
    console.log('유저접속됨');
    
    // room1-send 이벤트 발생 시
    socket.on('room1-send', function(data) {
        io.to('room1').emit('broadcast', data);   // room1에 있는 유저에게 전송
    });

    // joinroom 이벤트 발생 시
    socket.on('joinroom', function(data) {
        socket.join('room1');   // 채팅방 넣어주기
    });

    // user-send 이벤트 발생 시
    socket.on('user-send', function(data) {
        io.emit('broadcast', data); // 모든 유저에게 메세지 보내줌
        // 1명하고만 소통하고 싶으면 
        // io.to(socket.id).emit()
    });
});

// 홈페이지로 들어오면 index.ejs 보내라
app.get('/', function (요청, 응답) {
    응답.render('index.ejs');
});

// /write로 들어오면 write.ejs 보내라
app.get('/write', 로그인했니, function (요청, 응답) {
    응답.render('write.ejs');
});

// /edit으로 접속하면 edit.ejs 보여줌
app.get('/edit/:id', function (요청, 응답) {
    db.collection('post').findOne({ _id: parseInt(요청.params.id) }, function (에러, 결과) {
        console.log(결과);
        응답.render('edit.ejs', { post: 결과 });
    });
});

// edit으로 put 요청 받았을 때
app.put('/edit', function (요청, 응답) {
    // DB에 저장된 값 수정
    db.collection('post').updateOne({ _id: parseInt(요청.body.id) }, { $set: { 제목: 요청.body.title, 날짜: 요청.body.date } }, function (에러, 결과) {
        console.log('수정완료');
        응답.redirect('/list'); // 응답은 필수
    });
});

// login으로 get 요청 받았을 때
app.get('/login', function (요청, 응답) {
    응답.render('login.ejs');
});

// login으로 post 요청 받았을 때
app.post('/login', passport.authenticate('local', { // 미들웨어 씀
    failureRedirect: '/fail',
    failureFlash: true
}), function (요청, 응답) {
    응답.redirect('/');
});

// fail로 get 요청 받았을 때
app.get('/fail', function (요청, 응답) {
    // passport가 추가한 flash 메시지를 가져옴
    const flashMessage = 요청.flash('error')[0]; // 첫 번째 에러 메시지만 가져옴
    응답.render('login.ejs', { message: flashMessage });
});

// logout으로 get 요청 받았을 때
app.get('/logout', function (요청, 응답) {
    요청.logout(function (에러) {
        if (에러) {
            return 에러.status(500).send('Error occurred during logout');
        }
        응답.redirect('/');
    });
});

// mypage로 get 요청 받았을 때
app.get('/mypage', 로그인했니, function (요청, 응답) {   // 미들웨어 씀
    console.log(요청.user);
    응답.render('mypage.ejs', { 사용자: 요청.user });
});

// 로그인했는지 확인하는 함수
function 로그인했니(요청, 응답, next) {
    if (요청.user) {
        next();
    } else {
        // 응답.send('로그인안하셨는데요?');
        응답.redirect('/login');
    }
}


// 아이디 비번 인증하는 코드
passport.use(new LocalStrategy({
    usernameField: 'id',    // form name : id
    passwordField: 'pw',    // form name : pw
    session: true,  // 로그인 후 세션을 저장할 것인지
    passReqToCallback: false,   // 아이디, 비번 말고 다른 정보검사가 필요한지
}, function (입력한아이디, 입력한비번, done) {
    if (!/^[A-Za-z0-9]+$/.test(입력한아이디)) {
        return done(null, false, {message: '영어와 숫자만 입력할 수 있습니다.'});
    }
    else {
        db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
            if (에러) return done(에러);
    
            if (!결과) return done(null, false, { message: '존재하지않는 아이디요' });
            
            // 입력한비번의 암호화한 값과 DB에 저장되어 있는 pw 비교
            if (bcrypt.compareSync(입력한비번, 결과.pw)) {
                return done(null, 결과);
            } else {
                return done(null, false, { message: '비번틀렸어요' });
            }
        })
    }
}));

// 세션을 저장시키는 코드 (로그인 성공시 발동)
passport.serializeUser(function (user, done) {
    done(null, user.id);    // 세션 데이터를 만들고 세션의 id 정보를 쿠키로 보냄
});
// 이 세션 데이터를 가진 사람을 DB에서 찾아주세요 (마이페이지 접속시 발동)
passport.deserializeUser(function (아이디, done) {
    db.collection('login').findOne({ id: 아이디 }, function (에러, 결과) {
        done(null, 결과);
    });
});

// register로 get 요청 받았을 때
app.get('/register', function (요청, 응답) {
    응답.render('register.ejs');
});

// register로 post 요청 받았을 때
app.post('/register', function (요청, 응답) {
    db.collection('login').findOne({ id: 요청.body.id }, function (에러, 결과) {
        if (에러) { 응답.send('에러입니다') }
        else if (결과) {
            응답.send('이미 존재하는 아이디입니다.');
        }
        else if (!/^[A-Za-z0-9]+$/.test(요청.body.id)) {
            응답.send('아이디는 영어와 숫자만 입력할 수 있습니다.');
        }
        else {
            // 비번 암호화해서 저장
            db.collection('login').insertOne({ id: 요청.body.id, pw: bcrypt.hashSync(요청.body.pw, 10) }, function (에러, 결과) {
                console.log('저장완료');
                응답.redirect('/');
            });
        }
    });
});

// /add 경로로 POST 요청 시
app.post('/add', function (요청, 응답) {
    console.log(요청.body.title);
    console.log(요청.body.date);
    console.log(요청.user);
    // DB에 저장
    db.collection('counter').findOne({ name: '게시물갯수' }, function (에러, 결과) {
        console.log(결과.totalPost);
        var 총게시물갯수 = 결과.totalPost;
        var 저장할거 = { _id: 총게시물갯수 + 1, 작성자 : 요청.user._id, 제목: 요청.body.title, 날짜: 요청.body.date }
        db.collection('post').insertOne(저장할거, function (에러, 결과) {
            console.log('저장완료');
            // 응답.send('전송완료');
            응답.redirect('/list'); // add하면 list로 redirect

            // counter라는 콜렉션에 있는 totalPost라는 항목도 1 증가시켜야함
            db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost: 1 } }, function (에러, 결과) {
                if (에러) { return console.log(에러) }
            });
        });
    });
});

// /delete 경로로 delete 요청을 받았을 때
app.delete('/delete', function (요청, 응답) {
    console.log(요청.body);
    요청.body._id = parseInt(요청.body._id);    // 데이터 주고 받을 때는 문자로 바뀌니 이걸 다시 숫자로 바꿔줌

    var 삭제할데이터 = {_id : 요청.body._id, 작성자 : 요청.user._id}

    // 요청.body에 담겨온 게시물번호를 가진 글을 DB에서 찾아서 삭제
    db.collection('post').deleteOne(삭제할데이터, function (에러, 결과) {
        console.log('삭제완료');
        if (결과) {console.log(결과)}
        응답.status(200).send({ message: '성공했습니다' });
    });
});

// /list로 get 요청 시
app.get('/list', 로그인했니, function (요청, 응답) {
    // DB에 저장된 post라는 collection안의 모든 데이터를 list.ejs로 보내고 띄워라
    db.collection('post').find().toArray(function (에러, 결과) {
        응답.render('list.ejs', { posts: 결과, user: 요청.user });
    });
});

// search로 get 요청 받았을 때
// binary search - search index 활용
app.get('/search', (요청, 응답) => {
    console.log(요청.query);    // query string, query parameter
    
    var 검색조건 = [
        {
          $search: {
            index: 'titleSearch',
            text: {
              query: 요청.query.value,
              path: '제목'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
            }
        }
        },
        // {$sort : {_id : 1}}
        // {$limit : 10}
        // {$project : {제목 : 1, _id : 0, score : {$meta : "searchScore"}}}
    ]
    // 검색조건에 맞는 것들을 모두 가져와 search.ejs로 전달
    db.collection('post').aggregate(검색조건).toArray((에러, 결과) => {
        console.log(결과);
        응답.render('search.ejs', { posts : 결과, user: 요청.user});
    });
});

// /detail로 접속하면 detail.ejs 보여줌
app.get('/detail/:id', function (요청, 응답) {
    db.collection('post').findOne({ _id: parseInt(요청.params.id) }, function (에러, 결과) {
        if (에러 || !결과) {
            응답.status(404).send('<h1>요청한 페이지는 없습니다.</h1>');
        }
        else {
            console.log(결과);
            응답.render('detail.ejs', { data: 결과, user : 요청.user });
        }
    });
});

// multer : 업로드된 파일을 매우 쉽게 저장, 이름 변경, 처리할 수 있게 도와주는 라이브러리
let multer = require('multer');

// multer 세팅
var storage = multer.diskStorage({  // 업로드된 파일을 하드에 저장, memory는 램에 저장
    destination : function(req, file, cb) { // 저장 파일 경로
        cb(null, './public/image');
    },
    filename : function(req, file, cb) {    // 파일 이름 결정
        cb(null, file.originalname);
    },
    fileFilter: function (req, file, callback) {    // 파일 확장자
        var ext = path.extname(file.originalname);
        if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
            return callback(new Error('PNG, JPG만 업로드하세요'))
        }
        callback(null, true);
    },
    limits:{    // 파일 사이즈 제한
        fileSize: 1024 * 1024
    }
});

// multer 세팅 저장
var upload = multer({storage : storage});

// upload로 get 요청 받았을 때
app.get('/upload', function(요청, 응답) {
    응답.render('upload.ejs');
});

// upload로 post 요청 받았을 때
app.post('/upload', upload.single('profile'), function(요청, 응답) {
    응답.send('업로드완료');
});

// image/imageName으로 접속 시
app.get('/image/:imageName', function(요청, 응답) {
    응답.sendFile(__dirname + '/public/image/' + 요청.params.imageName);
});

// chat으로 get 요청 받았을 때
app.get('/chat', 로그인했니, function(요청, 응답) {
    db.collection('chatroom').find({member : 요청.user._id}).toArray(function(에러, 결과) {
        응답.render('chat.ejs', {data : 결과, userId : 요청.user._id}); // userId도 함께 전달
        // console.log(결과);
    });
});

// chat으로 post 요청 받았을 때
app.post('/chat', 로그인했니, function(요청, 응답) {

    var 저장할거 = {member : [ObjectId(요청.body._id), 요청.user._id], date : new Date(), title : 요청.body.title}
    
    // 내 아이디의 채팅방을 모두 찾는다
    db.collection('chatroom').find({"member.1" : 요청.user._id}).toArray(function(에러, 결과) {
        // 채팅방이 아예 없으면 바로 저장
        if (결과.length == 0) {
            db.collection('chatroom').insertOne(저장할거, function(에러, 결과) {
                응답.send('전송완료');
            });  
        }
        // 채팅방이 있으면 상대방이 중복되지 않는 것만 저장
        else {
            db.collection('chatroom').find({"member.0" : ObjectId(요청.body._id)}).toArray(function(에러, 결과) {
                if (결과.length == 0) {
                    db.collection('chatroom').insertOne(저장할거, function(에러, 결과) {
                        응답.send('전송완료');
                    });
                }
            });
        }
    });
});

// message로 post 요청 받았을 때
app.post('/message', 로그인했니, function(요청, 응답) {
    var 저장할거 = {
        parent : 요청.body.parent,  // 채팅방 id
        content : 요청.body.content,    // 채팅 내용
        userid : 요청.user._id, // 로그인한 사람의 id
        date : new Date()   // 시간
    }
    db.collection('message').insertOne(저장할거).then(()=>{
        console.log('DB저장성공');
        응답.send('DB저장성공');
    });
});

// 실시간 소통 채널 열기
app.get('/message/:id', 로그인했니, function(요청, 응답){

    // 지속적 소통채널 개설 완료 (header 변경)
    응답.writeHead(200, {
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    });

    // 채팅방 id로 메세지 찾기
    db.collection('message').find({parent : 요청.params.id}).toArray()
    .then((결과)=>{
        // 유저에게 보내는 메세지
        응답.write('event: test\n');    // test는 이벤트명
        응답.write('data: ' + JSON.stringify(결과) + '\n\n');   // 전달할 내용 
    });

    // Change Stream 설정
    const pipeline = [
        {$match : {'fullDocument.parent' : 요청.params.id}}
    ];

    const changeStream = db.collection('message').watch(pipeline);    // 실시간 감시
    
    // 해당 컬렉션에 변동 생기면 작동하는 코드
    changeStream.on('change', (result) => {
        console.log(result);
        
        응답.write('event: test\n');    // test는 이벤트명
        응답.write('data: ' + JSON.stringify([result.fullDocument]) + '\n\n');   // 전달할 내용 
    });
});













// 라우팅 연습

app.use('/shop', require('./routes/shop.js'));

// app.get('/shop/shirts', function(요청, 응답) {
//     응답.send('셔츠 파는 페이지입니다.');
// });
 
// app.get('/shop/pants', function(요청, 응답) {
//     응답.send('바지 파는 페이지입니다.');
// }); 

app.use('/board/sub', require('./routes/board.js'));

// app.get('/board/sub/sports', function(요청, 응답){
//     응답.send('스포츠 게시판');
// });
 
// app.get('/board/sub/game', function(요청, 응답){
//     응답.send('게임 게시판');
// });