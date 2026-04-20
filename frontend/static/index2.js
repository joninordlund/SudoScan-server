const cameraInput = document.getElementById('cameraInput');
const sendBtn = document.getElementById('sendBtn');
const statusText = document.getElementById('status');

let compressedBlob = null;

cameraInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) {
        return;
    }
    statusText.innerText = "Processing image...";
    sendBtn.disabled = true;

    try {
        compressedBlob = await compressImage(file, 1200, 0.7);

        statusText.innerText = "Image ready to send (" + (compressedBlob.size / 1024).toFixed(0) + " KB)";
        sendBtn.disabled = false;
    } catch (err) {
        statusText.innerText = "Error processing image.";
        console.error(err);
    }
});

sendBtn.addEventListener('click', async () => {
    if (!compressedBlob) {
        return;
    }

    const sessionId = window.location.pathname.split('/').pop();
    const formData = new FormData();
    formData.append('file', compressedBlob, 'image.jpg');

    statusText.innerText = "Sending...";
    sendBtn.disabled = true;

    try {
        const response = await fetch(`/api/upload/${sessionId}`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            statusText.innerText = "Sent successfully! Check your PC.";
        } else {
            statusText.innerText = "Upload failed. Try again.";
            sendBtn.disabled = false;
        }
    } catch (err) {
        statusText.innerText = "Network error. Is the server up?";
        sendBtn.disabled = false;
    }
});

function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;


                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
        };
        reader.onerror = (error) => reject(error);
    });
}
