(function (root, factory) {
  root.HELPERS = factory();
})(this, function () {
  function getGDriveImgById(id) {
    return `https://drive.google.com/uc?export=view&id=${id}`;
  }

  function getGDriveImgByLink(link) {
    const [, idSide] = link.split("d/");
    const [id] = idSide.split("/");
    return getGDriveImgById(id);
  }

  function getFavIconFromId(id) {
    return `https://drive.google.com/uc?id=${id}&export=download&format=png`;
  }

  function getFavIconFromLink(link) {
    const [, idSide] = link.split("d/");
    const [id] = idSide.split("/");
    return getFavIconFromId(id);
  }

  function getWhatsappLink(number) {
    return `https://wa.me/${number}`;
  }

  function getEmailLink(email) {
    return `mailto:${email}`;
  }

  return {
    getFavIconFromLink,
    getGDriveImgById,
    getGDriveImgByLink,
    getWhatsappLink,
    getEmailLink,
  };
});
