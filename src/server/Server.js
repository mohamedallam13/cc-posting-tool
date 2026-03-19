const request = {
  page: "client/pages/index"
}

function doGet(e) {
  const { page, props = {} } = request
  console.log(
    "Run by " +  getUser()
  )
  return _R(page, props, { metaData: [{ name: "viewport", content: "width=device-width, initial-scale=1" }] })
}

function getUser() {
  return Session.getActiveUser().getEmail();
}