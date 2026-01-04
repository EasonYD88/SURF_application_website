import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, 'config.json');

// Load or initialize config
let appConfig = {
  storageRoot: path.join(__dirname, 'uploads')
};

if (fs.existsSync(CONFIG_PATH)) {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    if (savedConfig.storageRoot) {
      appConfig.storageRoot = savedConfig.storageRoot;
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
}

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Config Endpoints
app.get('/config', (req, res) => {
  res.json(appConfig);
});

app.post('/save-backup', (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'No data provided' });

  try {
    const backupDir = path.join(appConfig.storageRoot, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filePath = path.join(backupDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    // Keep only last 10 backups
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse();
      
    if (files.length > 10) {
      files.slice(10).forEach(f => {
        fs.unlinkSync(path.join(backupDir, f));
      });
    }

    res.json({ success: true, filename });
  } catch (e) {
    console.error('Backup failed:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/config', (req, res) => {
  const { storageRoot } = req.body;
  if (storageRoot) {
    appConfig.storageRoot = storageRoot;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(appConfig, null, 2));
    res.json({ success: true, config: appConfig });
  } else {
    res.status(400).json({ error: 'Missing storageRoot' });
  }
});

app.post('/open-folder', (req, res) => {
  const { path: folderPath } = req.body;
  const target = folderPath || appConfig.storageRoot;
  
  let command;
  switch (process.platform) {
    case 'darwin': command = `open "${target}"`; break;
    case 'win32': command = `start "" "${target}"`; break;
    default: command = `xdg-open "${target}"`; break;
  }

  exec(command, (error) => {
    if (error) {
      console.error('Error opening folder:', error);
      return res.status(500).json({ error: 'Failed to open folder' });
    }
    res.json({ success: true });
  });
});

app.post('/create-project-folder', (req, res) => {
  const { projectName } = req.body;
  if (!projectName) {
    return res.status(400).json({ error: 'Missing projectName' });
  }
  
  const sanitize = (str) => str.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5\s]/g, '_');
  const targetDir = path.join(appConfig.storageRoot, sanitize(projectName));
  
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    res.json({ success: true, path: targetDir });
  } catch (error) {
    console.error('Error creating project folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

app.post('/move-file', (req, res) => {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) return res.status(400).json({ error: 'Missing paths' });

  const absOld = path.join(appConfig.storageRoot, oldPath);
  const absNew = path.join(appConfig.storageRoot, newPath);

  try {
    if (fs.existsSync(absOld)) {
      const newDir = path.dirname(absNew);
      if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });
      fs.renameSync(absOld, absNew);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (e) {
    console.error('Error moving file:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/rename-folder', (req, res) => {
  const { oldName, newName } = req.body;
  const absOld = path.join(appConfig.storageRoot, oldName);
  const absNew = path.join(appConfig.storageRoot, newName);

  try {
    if (fs.existsSync(absOld)) {
      fs.renameSync(absOld, absNew);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Folder not found' });
    }
  } catch (e) {
    console.error('Error renaming folder:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/delete-file', (req, res) => {
  const { filePath } = req.body;
  const absPath = path.join(appConfig.storageRoot, filePath);
  try {
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (e) {
    console.error('Error deleting file:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/delete-folder', (req, res) => {
  const { folderName } = req.body;
  const absPath = path.join(appConfig.storageRoot, folderName);
  try {
    if (fs.existsSync(absPath)) {
      fs.rmSync(absPath, { recursive: true, force: true });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Folder not found' });
    }
  } catch (e) {
    console.error('Error deleting folder:', e);
    res.status(500).json({ error: e.message });
  }
});

// Serve files dynamically
app.get(/^\/files\/(.*)/, (req, res) => {
  const filePath = req.params[0];
  const fullPath = path.join(appConfig.storageRoot, filePath);
  
  if (fs.existsSync(fullPath)) {
    res.sendFile(fullPath);
  } else {
    res.status(404).send('File not found');
  }
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(appConfig.storageRoot)) {
      fs.mkdirSync(appConfig.storageRoot, { recursive: true });
    }
    cb(null, appConfig.storageRoot);
  },
  filename: (req, file, cb) => {
    cb(null, `temp_${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// Google Auth
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.file'
];
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

async function getAuthClient() {
  let auth;
  try {
    auth = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    // Save token for future use
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(auth.credentials));
  } catch (error) {
    // If token exists, use it
    if (fs.existsSync(TOKEN_PATH)) {
      const credentials = JSON.parse(fs.readFileSync(TOKEN_PATH));
      auth = new google.auth.OAuth2();
      auth.setCredentials(credentials);
    } else {
      throw error;
    }
  }
  return auth;
}

// Routes
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const { projectId, projectName, type } = req.body;
  
  // Use projectName if available, otherwise fallback to projectId or 'General'
  const safeProjectName = (projectName && projectName !== 'undefined' && projectName !== 'null') 
    ? projectName 
    : ((projectId && projectId !== 'undefined' && projectId !== 'null') ? projectId : 'General');

  // Sanitize paths to prevent directory traversal
  const sanitize = (str) => str.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5\s]/g, '_');
  
  // Create directory structure: storageRoot/ProjectName/
  const targetDir = path.join(appConfig.storageRoot, sanitize(safeProjectName));
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const oldPath = req.file.path;
  // Rename based on type
  const ext = path.extname(req.file.originalname);
  const safeType = (type && type !== 'undefined' && type !== 'null') ? type : 'File';
  const newFilename = `${sanitize(safeType)}${ext}`;
  const newPath = path.join(targetDir, newFilename);

  try {
    // If file exists, overwrite it (or handle collision if needed)
    if (fs.existsSync(newPath)) {
      fs.unlinkSync(newPath);
    }
    fs.renameSync(oldPath, newPath);
    
    // Construct URL
    // Use encodeURIComponent for path segments
    const urlPath = `/files/${encodeURIComponent(sanitize(safeProjectName))}/${encodeURIComponent(newFilename)}`;
    res.json({ link: `http://localhost:${PORT}${urlPath}` });
  } catch (err) {
    console.error('Error moving file:', err);
    res.status(500).send('Error saving file');
  }
});

// Send email
app.post('/send-email', async (req, res) => {
  const { to, subject, body } = req.body;
  try {
    const auth = await getAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const message = [
      `To: ${to}`,
      'Subject: ' + subject,
      '',
      body
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    const result = await gmail.users.messages.send({
      userId: 'me',
      resource: { raw: encodedMessage }
    });

    res.json({ success: true, messageId: result.data.id, threadId: result.data.threadId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check for replies
app.get('/check-replies/:threadId', async (req, res) => {
  const { threadId } = req.params;
  try {
    const auth = await getAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const result = await gmail.users.messages.list({
      userId: 'me',
      q: `thread:${threadId}`,
      maxResults: 10
    });

    const messages = result.data.messages || [];
    const replies = [];
    for (const msg of messages) {
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id
      });
      if (message.data.labelIds && !message.data.labelIds.includes('SENT')) {
        replies.push({
          id: msg.id,
          snippet: message.data.snippet,
          date: message.data.internalDate
        });
      }
    }
    res.json({ replies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload to Google Drive
app.post('/upload-drive', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }
  try {
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = { name: req.file.originalname };
    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path)
    };

    const result = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,webViewLink'
    });

    // Make file public
    await drive.permissions.create({
      fileId: result.data.id,
      resource: {
        type: 'anyone',
        role: 'reader'
      }
    });

    res.json({ link: result.data.webViewLink });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cron job for reminders (example: check daily)
cron.schedule('0 9 * * *', async () => {
  console.log('Checking for follow-ups...');
  // This is a placeholder. In a production system, you would:
  // 1. Query a database for all outreach records
  // 2. Check if nextFollowUp date has passed
  // 3. Check if there's a threadId
  // 4. Use check-replies endpoint to see if there are new replies
  // 5. If no replies after 3 days, send a follow-up email
  // 6. Update the outreach record in the database
});

// Email reminder endpoint - can be called manually or by a frontend scheduler
app.post('/check-followups', async (req, res) => {
  const { outreachList } = req.body; // Array of outreach objects
  try {
    const results = [];
    const today = new Date().toISOString().split('T')[0];
    
    for (const outreach of outreachList) {
      if (!outreach.threadId || !outreach.nextFollowUp) continue;
      
      // Check if follow-up date has passed
      if (outreach.nextFollowUp <= today && outreach.replied === 'No reply') {
        // Check for new replies
        const auth = await getAuthClient();
        const gmail = google.gmail({ version: 'v1', auth });
        const result = await gmail.users.messages.list({
          userId: 'me',
          q: `thread:${outreach.threadId}`,
          maxResults: 10
        });
        
        const messages = result.data.messages || [];
        const hasReplies = messages.some(msg => !msg.labelIds?.includes('SENT'));
        
        if (!hasReplies) {
          // Calculate days since first contact
          const daysSince = Math.floor((new Date() - new Date(outreach.firstContact)) / (1000 * 60 * 60 * 24));
          
          results.push({
            outreachId: outreach.id,
            piName: outreach.piName,
            daysSinceContact: daysSince,
            needsFollowup: daysSince >= 3,
            message: `No reply from ${outreach.piName} after ${daysSince} days`
          });
        }
      }
    }
    
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});