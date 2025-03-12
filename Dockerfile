# Verwende ein Debian-basiertes Node 18 Image
FROM node:18-bullseye

# Aktualisiere Paketlisten und installiere benötigte Pakete
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Setze das Arbeitsverzeichnis
WORKDIR /app

# Kopiere nur zuerst package-Dateien, um die Abhängigkeiten zu installieren
COPY package*.json ./

# Installiere alle Node-Abhängigkeiten
RUN npm install

# Kopiere den restlichen Code
COPY . .

# Exponiere den Port, den dein Server nutzt (hier 3000)
EXPOSE 3000

# Starte deine Anwendung
CMD ["npm", "start"]
