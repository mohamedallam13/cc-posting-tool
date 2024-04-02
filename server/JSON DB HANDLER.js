; (function (root, factory) {
  root.JSON_DB_HANDLER = factory()
})(this, function () {

  //Needs heavy refactoring

  const { Toolkit } = CCLIBRARIES //Imported from CC Libraries

  const MAX_ENTRIES_COUNT = 1000;

  function init(indexFileId) {
    if (!indexFileId) return null

    const INDEX = initiateDB(indexFileId);
    const OPEN_DB = {};

    function saveIndex() {
      Toolkit.writeToJSON(indexFileId, INDEX);
    }

    function initiateDB() {
      return Toolkit.readFromJSON(indexFileId);
    }

    function closeDB({ dbMain, dbFragment }) {
      if (!dbFragment) closeDBMain(dbMain);
      else closeFragment(dbFragment);
    }

    function closeDBMain(dbMain) {
      const { fragmentsList } = INDEX[dbMain].properties;
      fragmentsList.forEach(closeFragment)
    }

    function closeFragment(dbFragment) {
      if (OPEN_DB[dbFragment]) delete OPEN_DB[dbFragment];
    }

    function clearDB({ dbMain, dbFragment }) {
      if (!dbFragment) clearDBMain(dbMain);
      else clearFragment(dbFragment);
      saveIndex();
    }

    function clearDBMain(dbMain) {
      const { fragmentsList } = INDEX[dbMain].properties;
      fragmentsList.forEach(dbFragment => clearFragment(dbMain, dbFragment))
    }

    function clearFragment(dbMain, dbFragment) {
      const { fileId } = INDEX[dbMain].dbFragments[dbFragment];
      Toolkit.writeToJSON(fileId, {});
      INDEX[dbMain].dbFragments[dbFragment].keyQueryArray = [];
    }

    function destroyDB({ dbMain, dbFragment } = {}) {
      if (!dbMain && !dbFragment) Object.keys(INDEX).forEach(dbMain => destroyDBMain(dbMain));
      else if (!dbFragment) destroyDBMain(dbMain);
      else destroyFragment(dbMain, dbFragment);
      saveIndex()
    }

    function destroyDBMain(dbMain) {
      const { fragmentsList } = INDEX[dbMain].properties;
      const fragmentsList_ = [...fragmentsList];
      fragmentsList_.forEach(dbFragment => destroyFragment(dbMain, dbFragment))
    }

    function destroyFragment(dbMain, dbFragment) {
      const { fileId } = INDEX[dbMain].dbFragments[dbFragment];
      const { fragmentsList } = INDEX[dbMain].properties;
      Toolkit.deleteFile(fileId);
      delete INDEX[dbMain].dbFragments[dbFragment];
      pull(dbFragment, fragmentsList)
    }

    function saveToDBFiles() {
      let saveIndexBool = false;
      Object.keys(OPEN_DB).forEach(dbFragment => {
        const { properties, toWrite } = OPEN_DB[dbFragment];
        const { isChanged, main } = properties;
        if (!isChanged) return
        saveIndexBool = true;
        const { fileId } = INDEX[main].dbFragments[dbFragment];
        if (fileId == "") {
          createNewFile(main, dbFragment, toWrite);
        } else {
          mergeFragmentFiles(fileId, toWrite)
        }
        properties.isChanged = false;
      })
      if (saveIndexBool) saveIndex();
    }

    function mergeFragmentFiles(fileId, toWrite) {
      // I have so many questions about this merging thing here, I will comment out the version part
      // I also dont understand why we are merging
      console.log(toWrite.data[Object.keys(toWrite.data)[Object.keys(toWrite.data).length-1]])
      // const latestUpdatedFile = Toolkit.readFromJSON(fileId);
      // if (toWrite.index) toWrite.index = { ...latestUpdatedFile.index, ...toWrite.index }
      // if (toWrite.data) {
      //   // Object.entries(toWrite.data).forEach(([id, entry]) => {
      //   //   const latestEntry = latestUpdatedFile.data[id]
      //   //   if (latestEntry._v > entry._v) toWrite.data[id] = latestEntry;
      //   // })
      //   toWrite.data = { ...latestUpdatedFile.data, ...toWrite.data }
      // }
      Toolkit.writeToJSON(fileId, toWrite);
    }

    function createNewFile(dbMain, dbFragment, toWrite) {
      const { dbFragments, properties } = INDEX[dbMain];
      const { rootFolder, filesPrefix } = properties;
      fileId = createDBFile(toWrite, rootFolder, filesPrefix, dbFragment);
      dbFragments[dbFragment].fileId = fileId;
    }

    function addToDB(entry, { dbMain, dbFragment }) {
      const { properties } = INDEX[dbMain];
      const { cumulative } = properties
      dbFragment = getProperFragment(dbMain, dbFragment);
      if (cumulative) dbFragment = checkOpenDBSize(dbMain, dbFragment);
      if (!dbFragment) return
      const { key, id } = entry;
      const { ignoreIndex } = INDEX[dbMain].dbFragments[dbFragment];
      if (!ignoreIndex) {
        OPEN_DB[dbFragment].toWrite.index[key] = id;
        if (!INDEX[dbMain].dbFragments[dbFragment].keyQueryArray.includes(key)) INDEX[dbMain].dbFragments[dbFragment].keyQueryArray.push(key); // If it is an update, do not readd the key
      }
      OPEN_DB[dbFragment].toWrite.data[id] = entry;
      if (!INDEX[dbMain].dbFragments[dbFragment].idQueryArray.includes(id)) INDEX[dbMain].dbFragments[dbFragment].idQueryArray.push(id); // If it is an update, do not readd the id
      OPEN_DB[dbFragment].properties.isChanged = true;
      return this
    }

    function lookupByCriteria(criteria = [], { dbMain, dbFragment }) {
      if (dbMain && !dbFragment) return lookUpDBMainByCriteria(criteria, dbMain);
      return lookUpFragmentByCriteria(criteria, dbMain, dbFragment);
    }

    function lookUpDBMainByCriteria(criteria, dbMain) {
      const { dbFragments } = INDEX[dbMain];
      let entries = [];
      const idObj = getCriterionObjByParam(criteria, "id");
      Object.keys(dbFragments).forEach(dbFragment => {
        const fragmentExistCheck = openDBFragment(dbMain, dbFragment);
        if (!fragmentExistCheck) return
        const { idQueryArray } = dbFragments[dbFragment];
        if (idObj) {
          const id = idObj.criterion;
          if (!idQueryArray.includes(id)) return;
          entry = lookUpInFragmentById(id, dbMain, dbFragment)
          entries.push(entry)
        } else {
          entries = [...entries, ...lookUpFragmentByCriteria(criteria, dbMain, dbFragment)]
        }
        // closeFragment(dbFragment);
      })
      return entries
    }

    function lookUpFragmentByCriteria(criteria, dbMain, dbFragment) {
      const fragmentExistCheck = openDBFragment(dbMain, dbFragment);
      if (!fragmentExistCheck) return null
      const { toWrite } = OPEN_DB[dbFragment];
      const { data } = toWrite;
      let entries = Object.values(data);
      if (!criteria || criteria.length == 0) return entries;
      criteria.forEach((criterionObj = {}) => {
        const { param, path, criterion } = criterionObj
        entries = lookUpEntriesByCriteria(entries, { param, path, criterion });
      })
      return entries;
    }

    function lookUpEntriesByCriteria(entries, { param, path, criterion }) {
      const filtered = entries.filter(entry => {
        const value = getValueFromPath(path, param, entry);
        if (value === undefined) return true
        if (value == criterion) {
          console.log(value)
        }
        if (typeof criterion === 'function') return criterion(value)
        else return value == criterion;
      })
      return filtered
    }

    function getCriterionObjByParam(criteria, param) {
      return criteria.filter(criterionObj => criterionObj.param == param)[0];
    }

    function getValueFromPath(path = [], param, entry) {
      let value;
      if (!path || path.length == 0) return entry[param]
      path.forEach((pathParam, i) => {
        if (i == 0) {
          value = entry[pathParam];
        } else {
          if (!value) return
          if (Array.isArray(value)) value = value[0];
          value = value[pathParam]
        }
      })
      if (value) {
        if (Array.isArray(value)) value = value[0];
        value = value[param]
      }
      return value
    }

    function lookUpByKey(key, { dbMain, dbFragment }) {
      if (dbMain && !dbFragment) return lookUpByKeyQueryArray(key, dbMain);
      return lookUpInFragmentByKey(key, dbMain, dbFragment);
    }

    function lookUpById(id, { dbMain, dbFragment }) {
      if (dbMain && !dbFragment) return lookUpByIdQueryArray(id, dbMain);
      return lookUpInFragmentById(id, dbMain, dbFragment);
    }

    function deleteFromDBByKey(key, { dbMain, dbFragment }) {
      if (dbMain && !dbFragment) {
        dbFragment = getFragmentFromQuerry(key, "keyQueryArray", dbMain);
        if (!dbFragment) return
      }
      const fragmentExistCheck = openDBFragment(dbMain, dbFragment);
      if (!fragmentExistCheck) return null
      const id = lookUpForIdInFragment(key, dbMain, dbFragment);
      deleteIdEntriesInFragment(id, dbFragment)
      deleteFromQuerryArray(key, "keyQueryArray", dbMain, dbFragment)
      deleteFromQuerryArray(id, "idQueryArray", dbMain, dbFragment)
      // saveIndex()
    }

    function deleteFromDBById(id, { dbMain, dbFragment }) {
      if (dbMain && !dbFragment) {
        dbFragment = getFragmentFromQuerry(id, "idQueryArray", dbMain);
        if (!dbFragment) return
      }
      const fragmentExistCheck = openDBFragment(dbMain, dbFragment);
      if (!fragmentExistCheck) return
      const keys = lookUpForKeysInFragment(id, dbMain, dbFragment);
      deleteIdEntriesInFragment(id, dbFragment)
      deleteFromQuerryArray(keys, "keyQueryArray", dbMain, dbFragment)
      deleteFromQuerryArray(id, "idQueryArray", dbMain, dbFragment)
      // saveIndex()
    }

    function deleteIdEntriesInFragment(id, dbFragment) {
      const iterativeIndex = { ...OPEN_DB[dbFragment].toWrite.index }
      Object.entries(iterativeIndex).forEach(([key, _id]) => {
        if (id == _id) delete OPEN_DB[dbFragment].toWrite.index[key];
      })
      delete OPEN_DB[dbFragment].toWrite.data[id];
      OPEN_DB[dbFragment].properties.isChanged = true;
    }

    function deleteFromQuerryArray(lookupKey, lookUpQuerryArray, dbMain, dbFragment) {
      if (!Array.isArray(lookupKey)) lookupKey = [lookupKey];
      const { dbFragments } = INDEX[dbMain];
      const queryArray = dbFragments[dbFragment][lookUpQuerryArray];
      if (!queryArray) return
      lookupKey.forEach(oneLookUpKey => pull(oneLookUpKey, queryArray))
    }

    function lookUpByKeyQueryArray(key, dbMain) {
      let entry = null;
      const dbFragment = getFragmentFromQuerry(key, "keyQueryArray", dbMain);
      if (!dbFragment) return null
      const fragmentExistCheck = openDBFragment(dbMain, dbFragment);
      if (!fragmentExistCheck) return null
      entry = lookUpInFragmentByKey(key, dbMain, dbFragment)
      return entry
    }

    function lookUpByIdQueryArray(id, dbMain) {
      let entry = null;
      const dbFragment = getFragmentFromQuerry(id, "idQueryArray", dbMain);
      if (!dbFragment) return
      const fragmentExistCheck = openDBFragment(dbMain, dbFragment);
      if (!fragmentExistCheck) return null
      entry = lookUpInFragmentById(id, dbMain, dbFragment)
      return entry
    }

    function getFragmentFromQuerry(lookupKey, lookupQuerryArray, dbMain) {
      if (!INDEX[dbMain]) throw `No ${dbMain} found in index! make sure the dbMain provided from the model is correct`
      const { dbFragments } = INDEX[dbMain];
      let foundDBFragment
      Object.keys(dbFragments).forEach(dbFragment => {
        const queryArray = dbFragments[dbFragment][lookupQuerryArray];
        if (!queryArray) return
        if (!queryArray.includes(lookupKey)) return;
        foundDBFragment = dbFragment
      })
      return foundDBFragment
    }

    function lookUpInFragmentByKey(key, dbMain, dbFragment) {
      if (!INDEX[dbMain].dbFragments[dbFragment]) return null
      const fragmentExistCheck = openDBFragment(dbMain, dbFragment);
      if (!fragmentExistCheck) return null
      const { toWrite } = OPEN_DB[dbFragment];
      const id = lookUpForIdInFragment(key, dbMain, dbFragment);
      if (!id) return null
      const entry = toWrite.data[id];
      return entry;
    }

    function lookUpInFragmentById(id, dbMain, dbFragment) {
      if (!INDEX[dbMain].dbFragments[dbFragment]) return null
      const fragmentExistCheck = openDBFragment(dbMain, dbFragment);
      if (!fragmentExistCheck) return null
      const { toWrite } = OPEN_DB[dbFragment];
      const entry = toWrite.data[id];
      return entry;
    }

    function lookUpForKeysInFragment(id, dbMain, dbFragment) {
      if (!INDEX[dbMain].dbFragments[dbFragment]) return null
      const { toWrite } = OPEN_DB[dbFragment];
      const { index } = toWrite
      const keys = Object.entries(index).filter(([_key, _id]) => _id == id).map(([_key]) => _key)
      return keys
    }

    function lookUpForIdInFragment(key, dbMain, dbFragment) {
      if (!INDEX[dbMain].dbFragments[dbFragment]) return null
      const { toWrite } = OPEN_DB[dbFragment];
      const id = toWrite.index[key];
      return id
    }

    function createDBFile(toWrite, rootFolder, filesPrefix, dbFragment) {
      const fileName = filesPrefix + "_" + dbFragment;
      return Toolkit.createJSON(fileName, rootFolder, toWrite);
    }

    function getProperFragment(dbMain, dbFragment) {
      //This function does the following: checks the index if the main adn the fragment exists, checks if the fragment is part of cumulative or stand alone db and returns the fragment name based on that, and adds the fragment to the OPEN_DB
      if (!INDEX[dbMain]) {
        console.log("No configs found for this DB")
        return
      }
      dbFragment = checkInIndex(dbMain, dbFragment);
      if (!OPEN_DB[dbFragment]) {
        openDBFragment(dbMain, dbFragment);
      }
      return dbFragment
    }

    function checkInIndex(dbMain, dbFragment) {
      if (!dbFragment) {
        //Cumulative
        dbFragment = getLatestdbMainFragment(dbMain);
      } else {
        //Non-cumulative
        const { dbFragments } = INDEX[dbMain];
        if (!dbFragments[dbFragment])
          addInIndexFile(dbMain, dbFragment);
      }
      return dbFragment;
    }

    function getLatestdbMainFragment(dbMain) {
      let dbFragment = getLastCreatedFragment(dbMain);
      if (!dbFragment) {
        dbFragment = createNewCumulativeFragment(dbMain, dbFragment);
      }
      return dbFragment;
    }

    function openDBFragment(dbMain, dbFragment) {
      if (OPEN_DB[dbFragment]) return true;
      if (!INDEX[dbMain].dbFragments[dbFragment]) return
      let fragmentFileObj;
      const { fileId } = INDEX[dbMain].dbFragments[dbFragment];
      if (fileId) fragmentFileObj = Toolkit.readFromJSON(fileId);
      addToOpenDBsObj(dbMain, dbFragment, fragmentFileObj)
      return true
    }

    function addToOpenDBsObj(dbMain, dbFragment, fragmentFileObj) {
      OPEN_DB[dbFragment] = new OpenDBEntry(dbMain, fragmentFileObj)
    }

    function checkOpenDBSize(dbMain, dbFragment) {
      const { toWrite } = OPEN_DB[dbFragment];
      const { data } = toWrite;
      if (Object.keys(data).length >= MAX_ENTRIES_COUNT) {
        dbFragment = createNewCumulativeFragment(dbMain, dbFragment);
        openDBFragment(dbMain, dbFragment);
        return dbFragment;
      };
      return dbFragment;
    }

    function createNewCumulativeFragment(dbMain, dbFragment) {
      const lastDBFragment = dbFragment || getLastCreatedFragment(dbMain);
      const countingRegex = /_\d/g
      let newFragment
      if (!lastDBFragment) newFragment = dbMain + "_1";
      else if (countingRegex.test(lastDBFragment)) {
        // console.log(lastDBFragment.match(countingRegex)[0][1])
        let count = parseInt(lastDBFragment.match(countingRegex)[0][1]);
        count++;
        newFragment = lastDBFragment.replace(countingRegex, "") + "_" + count;
      } else {
        newFragment = lastDBFragment + "_2";
      }
      addInIndexFile(dbMain, newFragment);
      return newFragment;
    }

    function addInIndexFile(dbMain, dbFragment) {
      INDEX[dbMain].dbFragments[dbFragment] = new IndexEntry();
      INDEX[dbMain].properties.fragmentsList.push(dbFragment);
      // saveIndex();
    }

    function getLastCreatedFragment(dbMain) {
      const { properties } = INDEX[dbMain];
      const { fragmentsList } = properties;
      if (!fragmentsList) return null
      const fragmentsCount = fragmentsList.length;
      if (fragmentsCount != 0) return fragmentsList[fragmentsCount - 1]
      return null
    }

    function getExternalConfig(key, { dbMain, dbFragment }) {
      return INDEX[dbMain].dbFragments[dbFragment].externalConfigs[key]
    }

    function addExternalConfig(key, value, { dbMain, dbFragment }) {
      INDEX[dbMain].dbFragments[dbFragment].externalConfigs[key] = value;
      //saveIndex();
    }

    function OpenDBEntry(dbMain, fragmentFileObj) {
      this.properties = new OpenDBProperties(dbMain);
      this.toWrite = fragmentFileObj || new DBFileObj();

    }

    function OpenDBProperties(dbMain) {
      this.isChanged = false
      this.main = dbMain
    }

    function DBFileObj() {
      this.index = {}
      this.data = {}
    }

    function IndexEntry() {
      this.keyQueryArray = [];
      this.idQueryArray = [];
      this.externalConfigs = {};
      this.ignoreIndex = false;
      this.fileId = "";
    }

    function pull(element, array) {
      const index = array.indexOf(element)
      if (index != -1) array.splice(index, 1);
    }

    return {
      INDEX,
      OPEN_DB,
      addToDB,
      lookUpByKey,
      lookUpById,
      lookupByCriteria,
      deleteFromDBByKey,
      deleteFromDBById,
      saveToDBFiles,
      saveIndex,
      closeDB,
      clearDB,
      destroyDB,
      getExternalConfig,
      addExternalConfig
    };
  }


  return {
    init
  }

})