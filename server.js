import { createServer } from 'http';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data', 'links.json');

// Load existing links from file(links.json file)
const loadLinks = async () => {
  try {
    const data = await readFile(DATA_FILE, 'utf-8');
    return data.trim() ? JSON.parse(data) : {}; // Handle empty files
  } catch (error) {
    if (error.code === 'ENOENT') { // If file doesn't exist, create an empty one
      await writeFile(DATA_FILE, JSON.stringify({}), 'utf-8');
      return {};
    }
    throw error;
  }
};

// Converts the links object into a JSON string and writes it to links.json.
const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links, null, 2));
};

// Starts an HTTP server that handles requests.
const server = createServer(async (req, res) => {
  if (req.method === 'GET') {
    // Serves index.html when the root (URL /) is accessed.
    if (req.url === '/') {     
      try {
        const data = await readFile(path.join(__dirname, 'public', 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.write('<h1 style="background-color: red; color: white; padding: 10px; text-align: center;>404 - Page Not Found</h1>')
        res.end();
      }

  // Returns stored shortened URLs in JSON format.
    }else if(req.url==='/links'){
      const links = await loadLinks();
      res.writeHead(200,{'content-type':'application/json'})
      return res.end(JSON.stringify(links));

  // If a shortened URL exists, redirects to the original URL.
    }else{  
      const links=await loadLinks();
      const shortcode=req.url.slice(1);
      console.log('links red.',req.url);
      if(links[shortcode]){
        res.writeHead(302,{location:links[shortcode]})
        return res.end();
      }
      res.writeHead(404, {'Content-Type': 'text/html'});
      res.write(`<h1 style="background-color: red; color: white; padding: 10px; text-align: center;">Shortened URL not found</h1>`); 
      res.end();

    }
  }

  // Checks if the request is a POST to /shorten.
  if (req.method === 'POST' && req.url === '/shorten') {
    const links = await loadLinks();
  // Collects data from the request.
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
  //  Parses the received data.
    req.on('end', async () => {
      console.log(body);
      try {
        const { url, shorturl } = JSON.parse(body);

    // Ensures the URL is provided.
        if (!url) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          return res.end('URL is required');
        }
        // generate a random 4-byte hex string.
        const finalShortCode = shorturl || crypto.randomBytes(4).toString('hex');

        // Ensures the short code is unique.
        if (links[finalShortCode]) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          return res.end('Short code already exists. Please choose another.');
        }
        // Saves the short code and returns it in the response.
        links[finalShortCode] = url;
        await saveLinks(links);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, shortenedUrl: `http://localhost:3045/${finalShortCode}` }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });
  }
});

const port = 3045;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
