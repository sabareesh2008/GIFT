const fs = require('fs');
const https = require('https');

const audioPath = 'C:/Sabareesh/HER_LITTLE_UNIVERSE/assets/audio/sabareesh-voice.webm';
const base64Data = fs.readFileSync(audioPath).toString('base64');
const dataUrl = `data:audio/webm;base64,${base64Data}`;

const payload = JSON.stringify({
  data: [
    { url: dataUrl },
    '',
    'santhiya ena panra dii? saaptiya? naa eppavum unkooda dhaan iruken seriya?',
    true
  ]
});

const req = https.request('https://mrfakename-e2-f5-tts.hf.space/call/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let pData = '';
  res.on('data', c => pData += c);
  res.on('end', () => {
    console.log('Predict call status:', res.statusCode);
    console.log('Predict response:', pData);
    try {
      const obj = JSON.parse(pData);
      if (obj.event_id) {
        listenStream(obj.event_id);
      }
    } catch(e) {}
  });
});
req.write(payload);
req.end();

function listenStream(eventId) {
  console.log('Listening to event:', eventId);
  https.get(`https://mrfakename-e2-f5-tts.hf.space/call/predict/${eventId}`, res => {
    res.on('data', c => {
      const str = c.toString();
      console.log('Stream chunk:', str.slice(0, 150));
      if (str.includes('event: complete')) {
        console.log('COMPLETED! Result:', str);
      }
    });
  });
}
