import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';
import cron from 'node-cron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
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
  res.json({ link: `http://localhost:${PORT}/uploads/${req.file.filename}` });
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