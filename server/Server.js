const request = {
  page: "client/pages/index"
}

function doGet(e) {
  const { page, props = {} } = request
  return _R(page, props, { metaData: [{ name: "viewport", content: "width=device-width, initial-scale=1" }] })
}