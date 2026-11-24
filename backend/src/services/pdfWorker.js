const pdfParse = require('pdf-parse');

process.on('message', async (data) => {
  try {
    const buffer = Buffer.from(data.buffer, 'base64');
    const result = await pdfParse(buffer);
    process.send({
      success: true,
      text: result.text || ''
    });
  } catch (err) {
    process.send({
      success: false,
      error: err.message || 'PDF parse error'
    });
  }
});
