const { ReqlineParseErrorMessages } = require('@app-core/messages');
const { throwAppError } = require('@app-core/errors');

class Parser {
  constructor() {
    this.validMethods = ['GET', 'POST'];
    this.requiredKeywords = ['HTTP', 'URL'];
    this.optionalKeywords = ['HEADERS', 'QUERY', 'BODY'];
    this.allKeywords = [...this.requiredKeywords, ...this.optionalKeywords];
  }

  parse(reqline) {
    if (!reqline || typeof reqline !== 'string') {
      throw new Error('Invalid reqline statement');
    }

    const sections = this.splitByPipe(reqline);

    // Validate sections
    const parsedSections = this.validateAndParseSections(sections);

    // Build final request object
    return this.buildRequest(parsedSections);
  }

  splitByPipe(reqline) {
    const sections = [];
    let current = '';
    let i = 0;

    while (i < reqline.length) {
      if (reqline[i] === '|') {
        if (current) {
          sections.push(current);
        }
        current = '';
      } else {
        current += reqline[i];
      }
      i++;
    }

    // Add the last section
    if (current) {
      sections.push(current);
    }

    return sections;
  }

  validateAndParseSections(sections) {
    const parsed = {};

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      // Validate spacing around pipes
      if (i === 0) {
        // First section shouldn't start with space
        if (section.startsWith(' ')) {
          throwAppError(ReqlineParseErrorMessages.INVALID_PIPE_DEL_SPACING);
        }
      } else {
        // Other sections should start with exactly one space
        if (!section.startsWith(' ')) {
          throwAppError(ReqlineParseErrorMessages.INVALID_PIPE_DEL_SPACING);
        }
        if (section.startsWith('  ')) {
          throwAppError(ReqlineParseErrorMessages.MULTIPLE_SPACES_FOUND);
        }
      }

      if (i < sections.length - 1) {
        // All but last section should end with exactly one space
        if (!section.endsWith(' ')) {
          throwAppError(ReqlineParseErrorMessages.INVALID_PIPE_DEL_SPACING);
        }
        if (section.endsWith('  ')) {
          throwAppError(ReqlineParseErrorMessages.MULTIPLE_SPACES_FOUND);
        }
      }

      // Clean the section
      const cleanSection = section.trim();

      // Parse the section
      const sectionData = this.parseSection(cleanSection);
      parsed[sectionData.keyword] = sectionData.value;
    }

    // Validate required keywords
    if (!parsed.HTTP) {
      throwAppError(ReqlineParseErrorMessages.MISSING_HTTP);
    }
    if (!parsed.URL) {
      throwAppError(ReqlineParseErrorMessages.MISSING_URL);
    }

    return parsed;
  }

  parseSection(section) {
    // Find the first space to separate keyword from value
    let spaceIndex = -1;
    for (let i = 0; i < section.length; i++) {
      if (section[i] === ' ') {
        spaceIndex = i;
        break;
      }
    }

    if (spaceIndex === -1) {
      throwAppError(ReqlineParseErrorMessages.MISSING_SPACE_AFTER_KEYWORD);
    }

    const keyword = section.substring(0, spaceIndex);
    const value = section.substring(spaceIndex + 1);

    // Validate keyword is uppercase
    if (keyword !== keyword.toUpperCase()) {
      if (this.allKeywords.includes(keyword.toUpperCase())) {
        throwAppError(ReqlineParseErrorMessages.KEYWORDS_MUST_BE_UPPERCASE);
      }
    }

    // Validate keyword is known
    if (!this.allKeywords.includes(keyword)) {
      throwAppError(`Unknown keyword: ${keyword}`);
    }

    // Validate there's exactly one space after keyword
    if (section.charAt(spaceIndex + 1) === ' ') {
      throwAppError(ReqlineParseErrorMessages.MULTIPLE_SPACES_FOUND);
    }

    // Special validation for HTTP method
    if (keyword === 'HTTP') {
      if (!this.validMethods.includes(value)) {
        if (this.validMethods.includes(value.toUpperCase())) {
          throwAppError(ReqlineParseErrorMessages.METHOD_MUST_BE_UPPERCASE);
        } else {
          throwAppError(ReqlineParseErrorMessages.INVALID_HTTP_METHOD);
        }
      }
    }

    // Parse JSON values for HEADERS, QUERY, BODY
    if (this.optionalKeywords.includes(keyword)) {
      try {
        const parsedValue = JSON.parse(value);
        return { keyword, value: parsedValue };
      } catch (error) {
        throwAppError(`Invalid JSON format in ${keyword} section`);
      }
    }

    return { keyword, value };
  }

  buildRequest(sections) {
    const method = sections.HTTP;
    const url = sections.URL;
    const headers = sections.HEADERS || {};
    const query = sections.QUERY || {};
    const body = sections.BODY || {};

    // Build full URL with query parameters
    let fullUrl = url;
    const queryKeys = Object.keys(query);
    if (queryKeys.length > 0) {
      const queryString = queryKeys
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
        .join('&');
      fullUrl += `?${queryString}`;
    }

    return {
      method,
      url,
      headers,
      query,
      body,
      fullUrl,
    };
  }
}

module.exports = Parser;
