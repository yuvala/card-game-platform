var fs = require("fs");
var http = require("http");
var path = require("path");
var url = require("url");

var staticRoot = path.resolve(__dirname, "..", "html");
var port = process.env.PORT || 8000;
var host = process.env.IP || "127.0.0.1";

var contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml"
};

function send(res, statusCode, body, contentType) {
    res.writeHead(statusCode, {
        "Content-Type": contentType || "text/plain; charset=utf-8"
    });
    res.end(body);
}

function resolveFile(reqUrl) {
    var pathname = url.parse(reqUrl).pathname || "/";
    var decodedPath;

    try {
        decodedPath = decodeURIComponent(pathname);
    } catch (err) {
        return null;
    }

    if (decodedPath === "/") {
        decodedPath = "/game.html";
    }

    var filePath = path.resolve(staticRoot, "." + decodedPath);
    if (filePath !== staticRoot && filePath.indexOf(staticRoot + path.sep) !== 0) {
        return null;
    }

    return filePath;
}

http.createServer(function(req, res) {
    var filePath = resolveFile(req.url);

    if (!filePath) {
        send(res, 400, "Bad request");
        return;
    }

    fs.stat(filePath, function(err, stats) {
        if (err || !stats.isFile()) {
            send(res, 404, "Not found");
            return;
        }

        var contentType = contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        fs.createReadStream(filePath).pipe(res);
    });
}).listen(port, host, function() {
    var browserHost = host === "0.0.0.0" ? "localhost" : host;
    console.log("Card game server running at http://" + browserHost + ":" + port + "/");
});
