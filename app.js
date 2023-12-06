require('dotenv').config(); // Load environment variables from .env file
console.log(process.env.AIRTABLE_API_KEY);

const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const Airtable = require('airtable');
const axios = require('axios');
const { Dropbox } = require('dropbox');
const fetch = require('isomorphic-fetch'); // Required for Dropbox SDK

const app = express();
app.use(express.urlencoded({ extended: true }));

// Use environment variables for access and refresh tokens
let accessToken = process.env.DROPBOX_ACCESS_TOKEN; 
let refreshToken = process.env.DROPBOX_REFRESH_TOKEN; 

// Dropbox setup with environment variables
const dbx = new Dropbox({ 
	fetch: fetch,
	clientId: process.env.DROPBOX_CLIENT_ID, 
	clientSecret: process.env.DROPBOX_CLIENT_SECRET,
});

dbx.auth.setRefreshToken(refreshToken);

// Airtable setup with API key from environment variable
const airtableBase = new Airtable({ 
	apiKey: process.env.AIRTABLE_API_KEY 
}).base(process.env.AIRTABLE_BASE_ID);

// Twilio credentials from environment variables
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;


// Function to create a direct download link for a Dropbox file
async function getDropboxSharedLink(path) {
	try {
		const sharedLinkResponse = await dbx.sharingCreateSharedLinkWithSettings({
			path: path,
			settings: {
				requested_visibility: 'public'
			}
		});
		let link = sharedLinkResponse.result.url;
		link = link.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
		return link;
	} catch (error) {
		console.error('Error creating shared link in Dropbox:', error);
		throw error;
	}
}

app.post('/receive-sms', async (req, res) => {
	const incomingMsg = req.body.Body;
	const sender = req.body.From;
	const numMedia = parseInt(req.body.NumMedia, 10);

	let mediaUrls = [];
	for (let i = 0; i < numMedia; i++) {
		const mediaUrl = req.body[`MediaUrl${i}`];

		try {
			const response = await axios.get(mediaUrl, {
				responseType: 'arraybuffer',
				auth: {
					username: twilioAccountSid,
					password: twilioAuthToken
				}
			});
			const fileBuffer = response.data;
			const fileName = `media-${Date.now()}-${i}.png`;

			const dropboxResponse = await dbx.filesUpload({ path: '/' + fileName, contents: fileBuffer });
			
			// Create a direct download link for the uploaded file
			const dropboxFileUrl = await getDropboxSharedLink(dropboxResponse.result.path_display);
			mediaUrls.push({ url: dropboxFileUrl });
		} catch (error) {
			console.error(`Error processing media URL ${i}:`, error);
		}
	}

	airtableBase('Inbox').create([{
		"fields": { 
			"Number": sender, 
			"Message": incomingMsg, 
			"Attachment": mediaUrls.length > 0 ? mediaUrls : null
		}
	}], function(err) {
		if (err) {
			console.error('Error adding record to Airtable:', err);
			const twiml = new MessagingResponse();
			twiml.message('Failed to process your message.');
			res.writeHead(200, {'Content-Type': 'text/xml'});
			res.end(twiml.toString());
			return;
		}

		console.log(`Message from ${sender}: ${incomingMsg} added to Airtable`);
		const twiml = new MessagingResponse();
		twiml.message('Received. Taker Bot is processing your message...');
		res.writeHead(200, {'Content-Type': 'text/xml'});
		res.end(twiml.toString());
	});
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
