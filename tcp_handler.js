const net = require('net');
const { parseString } = require('xml2js');
const fs = require('fs');
const path = require('path');

let server;
let sockets = [];
let networkWindow;

// Function to send status updates to the renderer process
function sendStatus(channel, status, data = null) {
  if (networkWindow && !networkWindow.isDestroyed()) {
    networkWindow.webContents.send(channel, { status, ...data });
  }
}

// Function to set the window instances
function setWindows(main, network) {
  networkWindow = network;
}

// Function to copy files
function copyFile(sourcePath, destDir) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file does not exist: ${sourcePath}`);
    return;
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const fileName = path.basename(sourcePath);
  const destPath = path.join(destDir, fileName);

  fs.copyFile(sourcePath, destPath, (err) => {
    if (err) {
      console.error(`Error copying file from ${sourcePath} to ${destPath}:`, err);
    } else {
      console.log(`File copied successfully to ${destPath}`);
    }
  });
}

// Function to process the parsed XML data
function processParsedXml(xmlData) {
    const destDir = path.join(__dirname, 'doc_test');

    if (xmlData.TestResult) {
        const testResult = xmlData.TestResult;

        if (testResult.BlockTestComplete && Array.isArray(testResult.BlockTestComplete)) {
            testResult.BlockTestComplete.forEach(item => {
                if (item.Path && item.Path[0]) {
                    copyFile(item.Path[0], destDir);
                }
                if (item.ResultPath && item.ResultPath[0]) {
                    copyFile(item.ResultPath[0], destDir);
                }
            });
        }
    }
}


function startServer(options) {
  return new Promise((resolve, reject) => {
    const { host, port } = options;

    if (server) {
      const msg = 'Server is already running.';
      console.log(msg);
      sendStatus('tcp-server-status', 'error', { message: msg });
      return reject(new Error(msg));
    }

    server = net.createServer((socket) => {
      const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
      console.log(`Client connected: ${clientAddress}`);
      sockets.push(socket);
      sendStatus('tcp-server-status', 'client-connected', { client: clientAddress });

      let xmlBuffer = '';
      socket.on('data', (data) => {
        xmlBuffer += data.toString('utf8');

        // Process buffer only if it contains a full XML message ending with </TestResult>
        while (xmlBuffer.includes('</TestResult>')) {
          const endIndex = xmlBuffer.indexOf('</TestResult>') + '</TestResult>'.length;
          const fullXml = xmlBuffer.substring(0, endIndex);
          xmlBuffer = xmlBuffer.substring(endIndex);

          if (fullXml.trim().startsWith('<?xml')) {
            console.log(`Received complete XML message from ${clientAddress}`);
            sendStatus('tcp-data-received', 'data', { client: clientAddress, data: fullXml });
            
            // Now, parse the XML
            parseString(fullXml, (err, result) => {
              if (err) {
                const msg = `XML parsing error: ${err.message}`;
                console.error(msg);
                sendStatus('tcp-data-received', 'error', { message: msg });
                return;
              }
              console.log('XML parsed successfully:');
              processParsedXml(result); // Process the parsed data
            });
          }
        }
      });

      socket.on('end', () => {
        console.log(`Client disconnected: ${clientAddress}`);
        sockets = sockets.filter(s => s !== socket);
        sendStatus('tcp-server-status', 'client-disconnected', { client: clientAddress });
      });

      socket.on('error', (err) => {
        console.error(`Socket error from ${clientAddress}: ${err.message}`);
      });

      socket.on('close', () => {
        console.log(`Connection closed for ${clientAddress}`);
        sockets = sockets.filter(s => s !== socket);
      });
    });

    server.on('error', (err) => {
      console.error('Server Error:', err.message);
      sendStatus('tcp-server-status', 'error', { message: err.message });
      server = null;
      reject(err);
    });

    server.listen(port, host, () => {
      const address = server.address();
      console.log(`Server started on ${address.address}:${address.port}`);
      sendStatus('tcp-server-status', 'running', { host: address.address, port: address.port });
      resolve(address);
    });
  });
}

function stopServer() {
  if (!server) {
    console.log('Server is not running.');
    sendStatus('tcp-server-status', 'stopped');
    return;
  }

  sockets.forEach(socket => {
    socket.destroy();
  });
  sockets = [];

  server.close(() => {
    console.log('Server stopped.');
    sendStatus('tcp-server-status', 'stopped');
    server = null;
  });
}

module.exports = {
  startServer,
  stopServer,
  setWindows,
};