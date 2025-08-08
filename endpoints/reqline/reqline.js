const { createHandler } = require('@app-core/server');
const ReqlineParser = require('../../services/reqline/parser');
const Client = require('../../services/reqline/client');

module.exports = createHandler({
  path: '/',
  method: 'post',
  async handler(rc, helpers) {
    const { reqline } = rc.body;

    if (!reqline) {
      return {
        status: helpers.http_statuses.HTTP_400_BAD_REQUEST,
        data: {
          error: true,
          message: 'Missing reqline parameter',
        },
      };
    }
    try {
      const parser = new ReqlineParser();
      const request = parser.parse(reqline);
      const response = await Client.sendRequest(request);
      return {
        status: helpers.http_statuses.HTTP_201_CREATED,
        data: response,
      };
    } catch (error) {
      return {
        status: helpers.http_statuses.HTTP_400_BAD_REQUEST,
        data: {
          error: true,
          message: error.message,
        },
      };
    }
  },
});
