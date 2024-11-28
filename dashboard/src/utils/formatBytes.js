/**
 * Formats bytes into human readable string
 * @param {number} bytes - Size in bytes
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted string (e.g., "1.5 GB")
 */
function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

module.exports = {
    formatBytes
};