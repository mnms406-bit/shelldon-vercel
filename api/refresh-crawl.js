<!-- Manual Crawl Trigger -->
<script>
  async function refreshCrawl() {
    const button = document.getElementById('refresh-crawl-btn');
    if(button) button.disabled = true;

    try {
      const res = await fetch('https://shelldon-vercel.vercel.app/api/progressive-crawl?secret=MY_CRAWL_SECRET');
      const data = await res.json();

      if(data.status === 'success') {
        console.log('Crawl triggered successfully:', data);
        alert('Crawl triggered successfully!');
      } else {
        console.error('Crawl failed:', data);
        alert('Crawl failed: ' + (data.message || 'Unknown error'));
      }
    } catch(err) {
      console.error('Error triggering crawl:', err);
      alert('Error triggering crawl. Check console for details.');
    } finally {
      if(button) button.disabled = false;
    }
  }

  // Example: bind to a button with id="refresh-crawl-btn"
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('refresh-crawl-btn');
    if(button) button.addEventListener('click', refreshCrawl);
  });
</script>

<!-- Example button -->
<button id="refresh-crawl-btn">Refresh Crawl Now</button>
