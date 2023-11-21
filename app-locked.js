const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const Airtable = require('airtable');
const axios = require('axios');
const { Dropbox } = require('dropbox');

const app = express();
app.use(express.urlencoded({ extended: true }));

// Dropbox setup
const dbx = new Dropbox({ accessToken: 'sl.BqTzwxI9o2xtCu5G95q_eKCkBWy_GdVfyG3ym2kJ_awvxckutAqH26baOcsHD-eCc-UdXB7goDAX6qIheg-szbpejPvmNPJFggyA67bDBPnQas4zrpQkV_M-XW2h-laNrkPkuSmaBKU7J2ZubpaOGDI' });

// Airtable setup
const airtableBase = new Airtable({ apiKey: 'patEF71MOUuCcneoW.d376f6081b53aab6900219831e0be8dd200458fb28443db567254fcd268a6268' }).base('app3n81ptFBce0myJ');

// Twilio credentials for authentication
const twilioAccountSid = 'AC0d824dda4621c3814c0385424f6d2197';
const twilioAuthToken = '6e131a7f711015ac69447e4bae4486b2';

app.post('/receive-sms', async (req, res) => {
	const incomingMsg = req.body.Body;
	const sender = req.body.From;
	const numMedia = parseInt(req.body.NumMedia, 10);

	let mediaUrls = [];
	for (let i = 0; i < numMedia; i++) {
		const mediaUrl = req.body[`MediaUrl${i}`];

		try {
			// Download the media file from Twilio with authentication
			const response = await axios.get(mediaUrl, {
				responseType: 'arraybuffer',
				auth: {
					username: twilioAccountSid,
					password: twilioAuthToken
				}
			});
			const fileBuffer = response.data;

			// Generate a unique file name for Dropbox
			const fileName = `media-${Date.now()}-${i}`;

			// Upload the file to Dropbox
			const dropboxResponse = await dbx.filesUpload({ path: '/' + fileName, contents: fileBuffer });
			const dropboxFileUrl = `https://www.dropbox.com/home${dropboxResponse.result.path_lower}?raw=1`; // Dropbox URL for the uploaded file
			mediaUrls.push({ url: dropboxFileUrl });
		} catch (error) {
			console.error(`Error processing media URL ${i}:`, error);
		}
	}

	// Add record to Airtable
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

const port = 3000;
app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
