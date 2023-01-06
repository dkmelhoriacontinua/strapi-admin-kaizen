export class StorageUtils {

  validateStorage() {
    if (typeof (Storage) === "undefined") {
      throw new Error("Não é possível trabalhar com Storage nesse navegador.");
    }
  }

  setItem(key, value) {
    this.validateStorage();

    const formatString = JSON.stringify(value);
    localStorage.setItem(key, formatString);
  }

  getItem(key) {
    this.validateStorage();

    const formatJSON = JSON.parse(localStorage.getItem(key));
    return formatJSON;
  }

}

export default new StorageUtils();
