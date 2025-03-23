document.addEventListener("DOMContentLoaded", () => {
  const imageInput = document.getElementById("image");
  const previewDiv = document.getElementById("preview");
  const modeToggle = document.getElementById("modeToggle");
  const uploadForm = document.getElementById("uploadForm");
  const submitButton = document.getElementById("submitButton");

  // Gespeicherten Dark-Mode-Status laden und anwenden
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }
  // Toggle-Button-Text entsprechend aktuellem Modus setzen (mit Symbol)
  modeToggle.textContent = document.body.classList.contains("dark-mode") ? "☀ Light Mode" : "🌙 Dark Mode";

  // Dark Mode umschalten
  modeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      modeToggle.textContent = "☀ Light Mode";
      localStorage.setItem("theme", "dark");
    } else {
      modeToggle.textContent = "🌙 Dark Mode";
      localStorage.removeItem("theme");
    }
  });

  // Bildvorschau für ausgewähltes Bild anzeigen
  imageInput.addEventListener("change", (e) => {
    previewDiv.innerHTML = "";
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = document.createElement("img");
        img.src = evt.target.result;
        img.alt = "Bildvorschau";
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        previewDiv.appendChild(img);
      };
      reader.onerror = (err) => {
        console.error("Fehler beim Laden der Datei:", err);
      };
      reader.readAsDataURL(file);
    }
  });

  // Formular-Submit abfangen und Bild via Fetch verarbeiten
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    // Verarbeitungsstatus anzeigen
    submitButton.disabled = true;
    submitButton.textContent = "Verarbeite...";
    previewDiv.innerHTML = "";  // vorherige Vorschau zurücksetzen

    try {
      const formData = new FormData(uploadForm);
      const response = await fetch("/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const errorText = await response.text();
        previewDiv.innerHTML = `<p style="color: red;">${errorText}</p>`;
      } else {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        const resultImg = document.createElement("img");
        resultImg.src = imageUrl;
        resultImg.alt = "Bearbeitetes Bild";
        resultImg.style.maxWidth = "100%";
        resultImg.style.height = "auto";
        previewDiv.innerHTML = "";
        previewDiv.appendChild(resultImg);
      }
    } catch (error) {
      console.error("Fehler bei der Bildverarbeitung:", error);
      previewDiv.innerHTML = `<p style="color: red;">Ein Fehler ist aufgetreten: ${error.message}</p>`;
    } finally {
      // Button und Text zurücksetzen
      submitButton.disabled = false;
      submitButton.textContent = "Bild verarbeiten";
    }
  });
});
