const methodSelect = document.getElementById('method');
const urlInput = document.getElementById('url');
const sendBtn = document.getElementById('sendBtn');
const headersInput = document.getElementById('headers');
const bodyInput = document.getElementById('body');
const bodySection = document.getElementById('bodySection');
const statusCode = document.getElementById('statusCode');
const responseText = document.getElementById('response');
const textTab = document.getElementById('textTab');
const jsonTab = document.getElementById('jsonTab');
const themeToggle = document.getElementById('themeToggle');

let rawResponse = '';

const savedTheme = localStorage.getItem('apicat-theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    themeToggle.textContent = 'Light';
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeToggle.textContent = isDark ? 'Light' : 'Dark';
    localStorage.setItem('apicat-theme', isDark ? 'dark' : 'light');
});

methodSelect.addEventListener('change', () => {
    bodySection.style.display = methodSelect.value === 'POST' ? 'block' : 'none';
});

textTab.addEventListener('click', () => {
    textTab.classList.add('active');
    jsonTab.classList.remove('active');
    try {
        const json = JSON.parse(rawResponse);
        responseText.value = rawResponse;
    } catch {
        responseText.value = rawResponse;
    }
});

jsonTab.addEventListener('click', () => {
    jsonTab.classList.add('active');
    textTab.classList.remove('active');
    try {
        const json = JSON.parse(rawResponse);
        responseText.value = JSON.stringify(json, null, 2);
    } catch {
        responseText.value = rawResponse;
    }
});

sendBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
        alert('Please enter a URL');
        return;
    }

    const method = methodSelect.value;
    let headers = {};
    try {
        if (headersInput.value.trim()) {
            headers = JSON.parse(headersInput.value);
        }
    } catch {
        alert('Invalid headers JSON');
        return;
    }

    const options = {
        method,
        headers
    };

    if (method === 'POST' && bodyInput.value.trim()) {
        try {
            options.body = bodyInput.value;
        } catch {
            alert('Invalid body');
            return;
        }
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    statusCode.textContent = '';
    responseText.value = '';
    rawResponse = '';

    try {
        const res = await fetch(url, options);
        statusCode.textContent = `Status: ${res.status} ${res.statusText}`;
        rawResponse = await res.text();
        responseText.value = rawResponse;
    } catch (err) {
        statusCode.textContent = 'Error';
        rawResponse = err.message;
        responseText.value = err.message;
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
});

bodySection.style.display = 'none';
