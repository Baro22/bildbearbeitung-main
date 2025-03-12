document.addEventListener("DOMContentLoaded", () => {
    const imageInput = document.getElementById("image");
    const previewDiv = document.getElementById("preview");
    const modeToggle = document.getElementById("modeToggle");
  
    // Dark Mode Toggle
    modeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      modeToggle.textContent = document.body.classList.contains("dark-mode") ? "Light Mode" : "Dark Mode";
    });
  
    // Bildvorschau
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
  });
  