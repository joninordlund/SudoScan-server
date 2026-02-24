const cameraInput = document.getElementById('cameraInput');
const status0 = document.getElementById('status');
const preview = document.getElementById('preview');
const sendBtn = document.getElementById('sendBtn');

const pathParts = window.location.pathname.split('/');
const sessionId = pathParts[pathParts.length - 1];

if (!sessionId || sessionId === "" || sessionId === "capture") {
    status0.textContent = "Virhe: Session ID puuttuu. Skannaa QR-koodi uudestaan.";
    cameraLabel.style.display = 'none';
}

cameraInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    preview.style.opacity = '1';
    status0.textContent = 'Check the image and send';
    sendBtn.disabled = false;
});

sendBtn.addEventListener('click', async function() {
    const file = cameraInput.files[0];
    if (!file || !sessionId) {
        status0.textContent = 'Error: Missing image or ID';
        return;
    }

    status0.textContent = 'Sending...';
    sendBtn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`/api/upload/${sessionId}`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            status0.textContent = 'Success! You can go back to the app.';
            preview.style.opacity = '0.5';
        } else {
            status0.textContent = 'Upload failed.';
            sendBtn.disabled = false;
        }
    } catch (error) {
        console.error(error);
        status0.textContent = 'Network error.';
        sendBtn.disabled = false;
    }
});
