// Browser Navigation Function
function browserGo() {
    let url = document.getElementById('browser-url').value;
    const frame = document.getElementById('browser-frame');

    if (!url) return;

    // Dark web sites - load from darkweb folder
    if (url.includes('darkbazaar.onion')) {
        frame.src = 'darkweb/darkbazaar.html';
        return;
    }
    if (url.includes('cryptominer.pool')) {
        frame.src = 'darkweb/cryptominer.html';
        return;
    }
    if (url.includes('hexexchange.com')) {
        frame.src = 'darkweb/hexexchange.html';
        return;
    }

    // Regular URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    frame.src = url;
}
