const request = {
  page: "client/pages/index"
}

/**
 * Handles GET requests and renders a page with props and metadata.
 * @param {Object} e - The event object containing request parameters.
 * @param {string} e.page - The page to be rendered.
 * @param {Object} [e.props={}] - Optional properties to be passed to the page.
 * @returns {Object} The rendered page with metadata.
 */
function doGet(e) {
  const { page, props = {} } = request
  console.log(
    "Run by " +  getUser()
  )
  return _R(page, props, { metaData: [{ name: "viewport", content: "width=device-width, initial-scale=1" }] })
}

/**
 * Retrieves the email address of the currently active user.
 * @returns {string} The email address of the active user.
 */
function getUser() {
  return Session.getActiveUser().getEmail();
}