const express = require('express');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// Statisches Verzeichnis (eine Ebene höher, weil server.js in api liegt)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Body-Parser (für URL-codierte und JSON-Daten – auch wenn Multer multipart/form-data verarbeitet)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Multer zum Verarbeiten von Datei-Uploads (im RAM)
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
      console.log("req.files:", req.files);
      console.log("req.body:", req.body);
      
      // Validierung: Prüfe, ob ein Bild hochgeladen wurde
      if (!req.files || !req.files['image'] || req.files['image'].length === 0) {
        return res.status(400).send('Kein Bild hochgeladen.');
      }

      const imageBuffer = req.files['image'][0].buffer;
      const backgroundBuffer = req.files['background']
        ? req.files['background'][0].buffer
        : null;
      const overlayBuffer = req.files['overlay']
        ? req.files['overlay'][0].buffer
        : null;

      // Parameter aus dem Request mit Standardwerten
      const aspectRatio = req.body.aspectRatio || 'auto'; // z. B. "3:4"
      const quality = req.body.quality || 'fullhd'; // Optionen: thumbnail, hd, fullhd

      // Rotation sicher parsen
      let rotation = parseInt(req.body.rotation, 10);
      if (isNaN(rotation)) rotation = 0;

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
        if (!wRatio || !hRatio) {
          console.log("Ungültiges Seitenverhältnis, verwende Standard-Dimensionen.");
        } else {
          height = Math.round(width * (hRatio / wRatio));
        }
      }

      // Aufbau der Sharp-Pipeline für das Hauptbild
      let processedImage = sharp(imageBuffer);

      // Transformationen: Rotation, Flip, Flop
      if (rotation !== 0) {
        processedImage = processedImage.rotate(rotation);
      }
      if (flip) {
        processedImage = processedImage.flip();
      }
      if (flop) {
        processedImage = processedImage.flop();
      }

      // Größenanpassung
      if (width && height) {
        processedImage = processedImage.resize(width, height, { fit: 'cover' });
      }

      // Hintergrundbild einbinden, falls vorhanden
      if (backgroundBuffer) {
        let background = sharp(backgroundBuffer);
        if (width && height) {
          background = background.resize(width, height, { fit: 'cover' });
        }
        const foregroundBuffer = await processedImage.png().toBuffer();
        processedImage = background.composite([{ input: foregroundBuffer, blend: 'over' }]);
      }

      // Overlay einbinden, falls vorhanden
      if (overlayBuffer) {
        processedImage = processedImage.composite([{ input: overlayBuffer, blend: 'over' }]);
      }

      // Finales Bild als PNG exportieren und senden
      const finalImageBuffer = await processedImage.png().toBuffer();

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="ergebnis.png"',
      });
      res.end(finalImageBuffer, 'binary');
    } catch (error) {
      console.error('Fehler in /upload:', error);
      res.status(500).send(`Ein Fehler ist aufgetreten: ${error.message}`);
    }
  }
);

// Für lokale Tests: Server starten, wenn die Datei direkt ausgeführt wird
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
  });
} else {
  module.exports = app;
}


