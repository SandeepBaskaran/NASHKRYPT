var fs = require('fs');
var PNG = require('pngjs').PNG;
var express = require('express');
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });
var crypto = require('crypto');
var app = express();

var stego = require('./stego');


app.use(express.static('static'));
app.set('views', './views')
app.set('view engine', 'jade');

app.get('/', function (req, res) {
    res.sendFile('index.html', {root: './ui'});
});

app.get('/about', function (req, res) {
    res.sendFile('about.html', {root: './ui'});
});

app.get('/contact', function (req, res) {
    res.sendFile('contact.html', {root: './ui'});
});

app.get('/cryptography', function (req, res) {
    res.sendFile('cryptography.html', {root: './ui'});
});

app.get('/steganography', function (req, res) {
    res.sendFile('steganography.html', {root: './ui'});
});

app.get('/encode', function (req, res) {
    res.sendFile('encode.html', {root: './ui'});
});

app.post('/encode', upload.array('files', 2), function (req, res, next) {

    console.log(req.files);
    console.log(req.body);

    //Output directories
    var original_file_path = 'static/data/original_files/'+req.files[0].originalname;
    var encoded_file_path = 'static/data/processed_files/'+req.files[0].originalname;

    fs.rename(req.files[0].path, original_file_path, function(){

        //Process image file
        fs.createReadStream(original_file_path).pipe(new PNG({
            filterType: 4
        })).on('parsed', function() {

            //stego.reformatPixelArrayToBufferData();
            var pw = req.body.pw || null;
            var processed;
            if(req.body.encode_type === 'text') {
                var text = req.body.text_data;
                console.log('Processing text.');
                if (pw){
                    var encrypt = crypto.createCipher('aes-256-cbc', pw);
                    text = encrypt.update(text, 'utf8', 'binary') + encrypt.final('binary');
                }
                //console.log(text);
                processed = stego.encodeDataFromPixelArray(stego.parseImageBufferToPixelArray(this), text, 'text');
            }
            else if(req.body.encode_type === 'binary') {
                console.log('Processing a binary file.');
                var buffer = fs.readFileSync(req.files[1].path);
                var stringified = JSON.stringify([req.files[1].originalname, buffer.toString('binary')]);
                if (pw){
                    var encrypt = crypto.createCipher('aes-256-cbc', pw);
                    stringified = encrypt.update(stringified, 'binary', 'binary') + encrypt.final('binary');
                }
                processed = stego.encodeDataFromPixelArray(stego.parseImageBufferToPixelArray(this), stringified, 'text');
            }

            var n = 0;
            for (var y = 0; y < this.height; y++) {
                for (var x = 0; x < this.width; x++) {
                    var idx = (this.width * y + x) << 2;

                    if(n < processed.length) {
                        this.data[idx] = processed[n].r;
                        this.data[idx+1] = processed[n].g;
                        this.data[idx+2] = processed[n].b;
                        this.data[idx+3] = processed[n].alpha;
                        n++;
                    }

                }
            }

            var stream = this.pack().pipe(fs.createWriteStream(encoded_file_path));
            stream.on('finish', function(){
                res.redirect('/data/processed_files/'+req.files[0].originalname);
            });
        });
    });

});

app.get('/decode', function (req, res) {
    res.sendFile('decode.html', {root: './ui'});
});

app.post('/decode', upload.single('original_image'), function (req, res, next) {

    console.log(req.file);
    console.log(req.body);


    //Process image file
    fs.createReadStream(req.file.path).pipe(new PNG({
        filterType: 4
    })).on('parsed', function() {

        var decoded = stego.decodeDataFromPixelArray(stego.parseImageBufferToPixelArray(this), req.body.expected_type);
        var pw = req.body.pw || null;

        if(decoded.dataType === 'text') {
            var text = decoded.data;
            try {
                if (pw) {
                    var decrypt = crypto.createDecipher('aes-256-cbc', pw);
                    text = decrypt.update(text, 'binary', 'utf8') + decrypt.final('utf8');
                }
                //console.log(text)
                res.render('output', {
                    text: text
                });
            }
            catch (err) {
                res.render('error', {
                    text: 'Bad text password'
                });
            }
        }
        else {

            try {
                var data = decoded.data;
                if (pw) {
                    //console.log('entering try block, pw : ' + pw);
                    var decrypt = crypto.createDecipher('aes-256-cbc', pw);
                    //console.log('decrypt made');
                    data = decrypt.update(decoded.data, 'binary', 'binary') + decrypt.final('binary');
                }
                //console.log('data decoded');
                //console.log(data);
                var parsed = JSON.parse(data);
                //console.log('data parsed');
                //parsed[0] file name
                //parsed[1] the buffer as a base64 string
                var filename = parsed[0];
                data = new Buffer(parsed[1], 'binary');
                var temp_file_name = 'temp/'+req.filename+parsed[0];

                fs.mkdir('temp', function(){
                    fs.writeFile(temp_file_name, data, 'binary', function(err){
                        res.setHeader('Content-disposition', 'attachment; filename='+parsed[0]);
                        res.sendFile(req.filename+parsed[0], {root: 'temp'}, function(){
                            //file transport done, delete the temp file
                            fs.unlink('temp/'+req.filename+parsed[0]);
                        });
                    });
                });
            }
            catch (err) {
                res.render('error', {
                    text: 'Bad bin password'
                });
            }
        }
    });
});

app.get('/encrypt', function (req, res) {
    res.sendFile('encrypt.html', {root: './ui'});
});

app.get('/decrypt', function (req, res) {
    res.sendFile('decrypt.html', {root: './ui'});
});


// IMG

app.get('/bg/site-bg-img.jpg', function (req, res) {
    res.sendFile('site-bg-img.jpg', {root: './img/bg'});
});
app.get('/bg/site-bg-video-youtube.jpg', function (req, res) {
    res.sendFile('site-bg-video-youtube.jpg', {root: './img/bg'});
});
app.get('/bg/site-bg-video.jpg', function (req, res) {
    res.sendFile('site-bg-video.jpg', {root: './img/bg'});
});

app.get('/icon/camera.png', function (req, res) {
    res.sendFile('camera.png', {root: './img/icon'});
});
app.get('/icon/chat.png', function (req, res) {
    res.sendFile('chat.png', {root: './img/icon'});
});
app.get('/icon/crown.png', function (req, res) {
    res.sendFile('crown.png', {root: './img/icon'});
});
app.get('/icon/diamond.png', function (req, res) {
    res.sendFile('diamond.png', {root: './img/icon'});
});
app.get('/icon/mobile.png', function (req, res) {
    res.sendFile('mobile.png', {root: './img/icon'});
});
app.get('/icon/mail.png', function (req, res) {
    res.sendFile('mail.png', {root: './img/icon'});
});
app.get('/icon/paint.png', function (req, res) {
    res.sendFile('paint.png', {root: './img/icon'});
});
app.get('/icon/pencil.png', function (req, res) {
    res.sendFile('pencil.png', {root: './img/icon'});
});
app.get('/icon/pin.png', function (req, res) {
    res.sendFile('pin.png', {root: './img/icon'});
});
app.get('/icon/rocket.png', function (req, res) {
    res.sendFile('rocket.png', {root: './img/icon'});
});
app.get('/icon/skull.png', function (req, res) {
    res.sendFile('skull.png', {root: './img/icon'});
});
app.get('/icon/support.png', function (req, res) {
    res.sendFile('support.png', {root: './img/icon'});
});

app.get('/item/brief-1.png', function (req, res) {
    res.sendFile('brief-1.png', {root: './img/item'});
});
app.get('/item/brief-2.png', function (req, res) {
    res.sendFile('brief-2.png', {root: './img/item'});
});
app.get('/item/brief-3.png', function (req, res) {
    res.sendFile('brief-3.png', {root: './img/item'});
});
app.get('/item/home.png', function (req, res) {
    res.sendFile('home.png', {root: './img/item'});
});

app.get('/nash.png', function (req, res) {
    res.sendFile('nash.png', {root: './img'});
});
app.get('/apple-touch-icon.png', function (req, res) {
    res.sendFile('apple-touch-icon.png', {root: './img'});
});
app.get('/favicon-32x32.png', function (req, res) {
    res.sendFile('favicon-32x32.png', {root: './img'});
});
app.get('/favicon-16x16.png', function (req, res) {
    res.sendFile('favicon-16x16.png', {root: './img'});
});
app.get('/android-chrome-192x192.png', function (req, res) {
    res.sendFile('android-chrome-192x192.png', {root: './img'});
});
app.get('/android-chrome-512x512.png', function (req, res) {
    res.sendFile('android-chrome-512x512.png', {root: './img'});
});
app.get('/favicon.ico', function (req, res) {
    res.sendFile('favicon.ico', {root: './img'});
});
app.get('/mstile-150x150.png', function (req, res) {
    res.sendFile('mstile-150x150.png', {root: './img'});
});
app.get('/site-footer-logo.png', function (req, res) {
    res.sendFile('site-footer-logo.png', {root: './img'});
});
app.get('/site-header-logo.png', function (req, res) {
    res.sendFile('site-header-logo.png', {root: './img'});
});
app.get('/site.webmanifest', function (req, res) {
    res.sendFile('site.webmanifest', {root: './img'});
});
app.get('/browserconfig.xml', function (req, res) {
    res.sendFile('browserconfig.xml', {root: './img'});
});

// CSS

app.get('/demo.css', function (req, res) {
    res.sendFile('demo.css', {root: './css'});
});
app.get('/style.css', function (req, res) {
    res.sendFile('style.css', {root: './css'});
});
app.get('/vendor.css', function (req, res) {
    res.sendFile('vendor.css', {root: './css'});
});
app.get('/bootstrap.min.css', function (req, res) {
    res.sendFile('bootstrap.min.css', {root: './css'});
});
app.get('/custom.css', function (req, res) {
    res.sendFile('custom.css', {root: './css'});
});

// JS

app.get('/vendor/bootstrap.min.js', function (req, res) {
    res.sendFile('bootstrap.min.js', {root: './js/vendor'});
});
app.get('/vendor/html5shiv.min.js', function (req, res) {
    res.sendFile('html5shiv.min.js', {root: './js/vendor'});
});
app.get('/vendor/jquery-1.11.3.min.js', function (req, res) {
    res.sendFile('jquery-1.11.3.min.js', {root: './js/vendor'});
});
app.get('/vendor/plugin.js', function (req, res) {
    res.sendFile('plugin.js', {root: './js/vendor'});
});
app.get('/demo.js', function (req, res) {
    res.sendFile('demo.js', {root: './js'});
});
app.get('/main.js', function (req, res) {
    res.sendFile('main.js', {root: './js'});
});
app.get('/variable.js', function (req, res) {
    res.sendFile('variable.js', {root: './js'});
});

// ASSETS

app.get('/assets/audio/audio.mp3', function (req, res) {
    res.sendFile('audio.mp3', {root: './assets/audio'});
});

var server = app.listen(process.env.PORT || 1998, function () {
    var host = process.env.HOST || '0.0.0.0';
    var port = process.env.PORT || 1998;

    console.log('Example app listening at http://%s:%s', host, port);
});
