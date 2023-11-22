const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const Airtable = require('airtable');
const axios = require('axios');
const { Dropbox } = require('dropbox');
const fetch = require('isomorphic-fetch'); // Required for Dropbox SDK

const app = express();
app.use(express.urlencoded({ extended: true }));

// Dropbox setup with OAuth 2.0
const dbx = new Dropbox({
	fetch: fetch,
	clientId: 'ajk872ikp1a9lz2', // Replace with your App key
	clientSecret: 'ce0sn830k5yr14e', // Replace with your App secret
	accessToken: 'sl.BqVOGMDDFgIMRaE4hPKvCDYZDi24WhhrK9FN2VhIi0xlyqSk7u69lxycUjzbm-EKtrWQ4LDe46Q4OElnkbeMbTuwml4cR0cljkFZk_Kngyud8xK7oA1ut6Ff7H7gsjylCSpqqtDkk9bjYn1jQ1Ml4C0' // Replace with the access token obtained from Postman
});

// Airtable setup
const airtableBase = new Airtable({ apiKey: 'patEF71MOUuCcneoW.d376f6081b53aab6900219831e0be8dd200458fb28443db567254fcd268a6268' }).base('app3n81ptFBce0myJ');

// Twilio credentials for authentication
const twilioAccountSid = 'AC0d824dda4621c3814c0385424f6d2197';
const twilioAuthToken = '2e56a22e5e769707a13d5bb55ccf4e88';

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
		twiml.message('Message received. Thank you!');
		res.writeHead(200, {'Content-Type': 'text/xml'});
		res.end(twiml.toString());
	});
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
