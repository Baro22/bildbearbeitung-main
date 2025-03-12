// Import von benötigten Modulen
const express = require('express');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// Statisches Verzeichnis, in dem die Webseite (HTML, CSS) liegt
app.use(express.static(path.join(__dirname, 'public')));

// Multer zum Verarbeiten von Datei-Uploads (Speicherung im RAM)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route für den Datei-Upload
app.post(
  '/upload',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'background', maxCount: 1 },
    { name: 'overlay', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Eingehende Bilddaten
      const imageBuffer = req.files['image'][0].buffer;
      const backgroundBuffer = req.files['background'] ? req.files['background'][0].buffer : null;
      const overlayBuffer = req.files['overlay'] ? req.files['overlay'][0].buffer : null;

      // Parameter aus dem Request mit Standardwerten
      const aspectRatio = req.body.aspectRatio || 'auto'; // z.B. "3:4"
      const quality = req.body.quality || 'fullhd'; // Optionen: thumbnail, hd, fullhd
      const rotation = parseInt(req.body.rotation, 10) || 0; // Rotationsgrad
      const flip = req.body.flip === 'true';
      const flop = req.body.flop === 'true';

      // Qualitätsvorgaben (Standard-Dimensionen)
      let width, height;
      if (quality === 'thumbnail') {
        width = 300;
        height = 300;
      } else if (quality === 'hd') {
        width = 1280;
        height = 720;
      } else if (quality === 'fullhd') {
        width = 1920;
        height = 1080;
      }

      // Anpassung der Dimensionen anhand des Seitenverhältnisses (falls angegeben)
      if (aspectRatio !== 'auto' && width && height) {
        const [wRatio, hRatio] = aspectRatio.split(':').map(Number);
        height = Math.round(width * (hRatio / wRatio));
      }

      // Aufbau der Sharp-Pipeline für das Hauptbild
      let processedImage = sharp(imageBuffer);

      // Zusätzliche Transformationen
      if (rotation !== 0) {
        processedImage = processedImage.rotate(rotation);
      }
      if (flip) {
        processedImage = processedImage.flip();
      }
      if (flop) {
        processedImage = processedImage.flop();
      }

      // Größenanpassung (falls Dimensionen definiert sind)
      if (width && height) {
        processedImage = processedImage.resize(width, height, { fit: 'cover' });
      }

      // Falls ein Hintergrundbild hochgeladen wurde, wird das bearbeitete Hauptbild darüber gelegt
      if (backgroundBuffer) {
        let background = sharp(backgroundBuffer);
        if (width && height) {
          background = background.resize(width, height, { fit: 'cover' });
        }
        const foregroundBuffer = await processedImage.png().toBuffer();
        processedImage = background.composite([{ input: foregroundBuffer, blend: 'over' }]);
      }

      // Falls ein Overlay vorhanden ist, wird es über das Bild gelegt
      if (overlayBuffer) {
        processedImage = processedImage.composite([{ input: overlayBuffer, blend: 'over' }]);
      }

      // Export des finalen Bildes als PNG und Versand an den Client
      const finalImageBuffer = await processedImage.png().toBuffer();

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="ergebnis.png"',
      });
      res.end(finalImageBuffer, 'binary');
    } catch (error) {
      console.error(error);
      res.status(500).send(`Ein Fehler ist aufgetreten: ${error.message}`);
    }
  }
);

// // Server starten
// app.listen(PORT, () => {
//   console.log(`Server läuft auf http://localhost:${PORT}`);
// });

