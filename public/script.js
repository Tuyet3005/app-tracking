document.getElementById('echoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = document.getElementById('textInput').value;
  try {
    const res = await fetch('/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    document.getElementById('output').textContent = data.text;
  } catch (err) {
    document.getElementById('output').textContent = 'Error sending request';
  }
});
