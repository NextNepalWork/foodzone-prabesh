// This function handles all routes and serves index.html for client-side routing
exports.handler = async (event, context) => {
  try {
    // This will be handled by the SPA routing
    return {
      statusCode: 200,
      body: '',
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
  } catch (error) {
    console.error('Error in serverless function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
