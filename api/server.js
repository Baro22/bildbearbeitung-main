const express = require('express');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// Statisches Verzeichnis (eine Ebene höher, da server.js in api liegt)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Body-Parser Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Multer für Datei-Uploads (Speicherung im Arbeitsspeicher)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 4.5 * 1024 * 1024 } });

// Route für den Datei-Upload und die Bildverarbeitung
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
      
      // Prüfen, ob ein Hauptbild hochgeladen wurde
      if (!req.files || !req.files['image'] || req.files['image'].length === 0) {
        return res.status(400).send('Kein Bild hochgeladen.');
      }

      const imageBuffer = req.files['image'][0].buffer;
      const backgroundBuffer = req.files['background'] ? req.files['background'][0].buffer : null;
      const overlayBuffer = req.files['overlay'] ? req.files['overlay'][0].buffer : null;

      // Anfrage-Parameter mit Standardwerten auslesen
      const aspectRatio = req.body.aspectRatio || 'auto';  // z.B. "3:4"
      const quality = req.body.quality || 'fullhd';        // thumbnail, hd oder fullhd

      // Rotation numerisch auswerten
      let rotation = parseInt(req.body.rotation, 10);
      if (isNaN(rotation)) rotation = 0;

      const flip = req.body.flip === 'true';
      const flop = req.body.flop === 'true';

      // Helligkeit, Sättigung und Graustufen auslesen
      let brightness = parseFloat(req.body.brightness);
      if (isNaN(brightness) || brightness < 0) brightness = 1;
      let saturation = parseFloat(req.body.saturation);
      if (isNaN(saturation) || saturation < 0) saturation = 1;
      const grayscale = req.body.grayscale === 'true';

      // Ausgabe-Dimensionen basierend auf Qualität setzen
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

      // Seitenverhältnis berücksichtigen (falls angegeben)
      if (aspectRatio !== 'auto' && width && height) {
        const [wRatio, hRatio] = aspectRatio.split(':').map(Number);
        if (!wRatio || !hRatio) {
          console.log("Ungültiges Seitenverhältnis, verwende Standard-Dimensionen.");
        } else {
          height = Math.round(width * (hRatio / wRatio));
        }
      }

      // Sharp-Pipeline für das Hauptbild aufbauen
      let processedImage = sharp(imageBuffer);

      // Transformationen anwenden: Rotation, Flip, Flop
      if (rotation !== 0) {
        processedImage = processedImage.rotate(rotation);
      }
      if (flip) {
        processedImage = processedImage.flip();
      }
      if (flop) {
        processedImage = processedImage.flop();
      }

      // Größenanpassung (Resize)
      if (width && height) {
        processedImage = processedImage.resize(width, height, { fit: 'cover' });
      }

      // Helligkeit/Sättigung anwenden (falls vom Benutzer verändert)
      if (!grayscale && (brightness !== 1 || saturation !== 1)) {
        processedImage = processedImage.modulate({ brightness: brightness, saturation: saturation });
      } else if (grayscale && brightness !== 1) {
        // Bei Graustufen nur Helligkeit (Farbanteile werden später entfernt)
        processedImage = processedImage.modulate({ brightness: brightness });
      }

      // Hintergrundbild einfügen, falls vorhanden
      if (backgroundBuffer) {
        let background = sharp(backgroundBuffer);
        if (width && height) {
          background = background.resize(width, height, { fit: 'cover' });
        }
        const foregroundBuffer = await processedImage.png().toBuffer();
        processedImage = background.composite([{ input: foregroundBuffer, blend: 'over' }]);
      }

      // Overlay-Bild einfügen, falls vorhanden
      if (overlayBuffer) {
        processedImage = processedImage.composite([{ input: overlayBuffer, blend: 'over' }]);
      }

      // Ausgabe in Graustufen umwandeln, falls gewählt
      if (grayscale) {
        processedImage = processedImage.grayscale();
      }

      // Ergebnis als PNG erzeugen und zurücksenden
      const finalImageBuffer = await processedImage.png().toBuffer();
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="ergebnis.png"',
      });
      res.end(finalImageBuffer, 'binary');
    } catch (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).send('Die hochgeladene Datei überschreitet die maximale Größe von 4,5 MB.');
      }
      console.error('Fehler in /upload:', error);
      res.status(500).send(`Ein Fehler ist aufgetreten: ${error.message}`);
    }
  }
);

// Server starten (für lokale Tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
  });
} else {
  module.exports = app;
}



