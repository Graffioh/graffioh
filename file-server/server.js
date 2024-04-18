import http from "http";
import fs from "fs";
import path from "path";
import url from "url";

const port = process.env.PORT || 6969;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  const parsedUrl = url.parse(req.url, true);
  if (parsedUrl.pathname === '/api/file-tree') {
    const directoryPath = './portfolio';
    const fileTree = traverse(directoryPath);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(fileTree));
  } else if (parsedUrl.pathname === '/api/file-content') {
    const filePath = path.join('./portfolio', parsedUrl.query.path);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end(JSON.stringify(err));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ content: data }));
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

function traverse(dir) {
  const files = fs.readdirSync(dir);
  const tree = { name: path.basename(dir), children: [] };

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      tree.children.push(traverse(filePath));
    } else {
      tree.children.push({ name: file });
    }
  });

  return tree;
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
