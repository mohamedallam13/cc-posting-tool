/**
 * Defines and initializes the MW namespace using the Universal Module Definition (UMD) pattern
 ```
 /**
  * Includes and evaluates an HTML template file with optional properties
  * @param {string} file - The name of the HTML template file to include
  * @param {Object} props - Optional properties to assign to the template (default: {})
  * @returns {string} The evaluated content of the template
  */
 
 /**
  * Renders an HTML template file with optional properties and configuration options
  * @param {string} file - The name of the HTML template file to render
  * @param {Object} props - Optional properties to assign to the template (default: {})
  * @param {Object} options - Optional configuration options for rendering (default: {})
  * @param {boolean} options.preventiFrameAll - If true, prevents iFrame embedding (default: false)
  * @param {string} options.favIcon - URL of the favicon to set
  * @param {string} options.title - Title to set for the HTML output
  * @param {Array} options.metaData - Array of meta tags to add to the HTML output
  * @returns {GoogleAppsScript.HTML.HtmlOutput} The rendered HTML output
  */
 
 /**
  * Adds meta tags to an HTML output
  * @param {GoogleAppsScript.HTML.HtmlOutput} HTMLOutput - The HTML output to add meta tags to
  * @param {Array} metaData - Array of meta tag objects, each containing 'name' and 'content' properties
  */
 
 ``` * @param {Object} root - The global object (e.g., window in browsers)
 * @param {Function} factory - A function that returns the MW module
 * @returns {Object} The MW module
 */
(function (root, factory) {
  root.MW = factory();
})(this, function () {
  /**
   * Includes and evaluates an HTML template file with optional properties.
   * @param {string} file - The name of the HTML template file to include.
   * @param {Object} [props={}] - An optional object containing properties to be assigned to the template.
   * @returns {string} The evaluated content of the template as a string.
   */
  function include(file, props = {}) {
    /**
     * Renders an HTML template file with provided properties and options
     * @param {string} file - The name of the HTML template file to render
     * @param {Object} [props={}] - Properties to be assigned to the template
     * @param {Object} [options={}] - Additional options for rendering
     * @param {boolean} [options.preventiFrameAll] - If true, prevents the output from being embedded in iframes
     * @param {string} [options.favIcon] - URL of the favicon to be set
     * @param {string} [options.title] - Title to be set for the HTML output
     * @param {Object} [options.metaData] - Metadata to be added to the HTML output
     * @returns {HTMLOutput} The rendered HTML output
     */
    console.log(file);
    var template = HtmlService.createTemplateFromFile(file);
    Object.assign(template, props);
    return template.evaluate().getContent();
  }

  function render(file, props = {}, options = {}) {
    const { preventiFrameAll, favIcon, title, metaData } = options;
    const fileTemplate = HtmlService.createTemplateFromFile(file);
    Object.assign(fileTemplate, props);
    const HTMLOutput = fileTemplate.evaluate();
    if (!preventiFrameAll)
      HTMLOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    if (favIcon) HTMLOutput.setFaviconUrl(favIcon);
    if (title) HTMLOutput.setTitle(title);
    if (metaData) addMetaData(HTMLOutput, metaData);
    console.log(HTMLOutput.getContent());
    return HTMLOutput;
  }

  /**
   /**
    * Iterates through metadata tags and adds them to the HTML output
    * @param {Array} metaData - An array of metadata objects
    * @param {Object} HTMLOutput - The HTML output object to which metadata tags are added
    * @returns {void} This function does not return a value
    */
   * Adds metadata tags to an HTML output object.
   * @param {Object} HTMLOutput - The HTML output object to which metadata tags will be added.
   * @param {Array} metaData - An array of metadata objects, each containing 'name' and 'content' properties.
   * @returns {void} This function does not return a value.
   /**
    * Renders a file using the MW rendering engine with optional props and options.
    * @param {string} file - The path or name of the file to be rendered.
    * @param {Object} [props={}] - An optional object containing properties to be passed to the render function.
    * @param {Object} [options={}] - An optional object containing additional options for rendering.
    * @returns {*} The result of the MW.render function call.
    */
   */
  function addMetaData(HTMLOutput, metaData) {
    /**
     * Includes a file with optional properties
     * @param {string} file - The path or name of the file to include
     * @param {Object} [props={}] - Optional properties to pass to the included file
     * @returns {*} The result of including the specified file
     */
    metaData.forEach((metaTag) => {
      const { name, content } = metaTag;
      HTMLOutput.addMetaTag(name, content);
    });
  }

  return {
    include,
    render,
  };
});

function _I(file, props = {}) {
  return MW.include(file, props);
}

function _R(file, props = {}, options = {}) {
  return MW.render(file, props, options);
}
