import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
const port = 6969;

// Enable CORS for all routes
app.use(cors());

// // You can also configure CORS options
// app.use(
//   cors({
//     origin: "https://example.com", // Specify the allowed origin
//     methods: ["GET", "POST", "PUT", "DELETE"], // Specify the allowed HTTP methods
//     allowedHeaders: ["Content-Type", "Authorization"], // Specify the allowed headers
//     credentials: true, // Allow sending cookies with requests
//   })
// );

app.use(express.static("public"));

app.get("/api/file-tree", (_, res) => {
  const directoryPath = "./portfolio/";

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

  const fileTree = traverse(directoryPath);
  res.json(fileTree);
});

app.get("/api/file-content", (req, res) => {
  const filePath = "portfolio/" + req.query.path;

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error reading file");
    } else {
      res.json({ content: data });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
