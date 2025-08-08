const axios = require('axios');

class Client {
  static async sendRequest(reqObj) {
    const { method, url, headers, query, body, fullUrl } = reqObj;
    const startTime = Date.now();

    const axiosConfig = {
      method,
      url,
      headers,
    };

    // Add body for POST requests
    if (method === 'POST' && Object.keys(body).length > 0) {
      axiosConfig.data = body;
    }

    const response = await axios(axiosConfig);
    const endTime = Date.now();

    // Build success response
    const successResponse = {
      request: {
        query,
        body,
        headers,
        full_url: fullUrl,
      },
      response: {
        http_status: response.status,
        duration: endTime - startTime,
        request_start_timestamp: startTime,
        request_stop_timestamp: endTime,
        response_data: response.data,
      },
    };

    return successResponse;
  }
}

module.exports = Client;
