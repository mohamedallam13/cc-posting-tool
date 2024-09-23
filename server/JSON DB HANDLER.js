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
      console.log(dbFragment)
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
      /**
       * Filters an array of entries based on a specified criterion and path
       * @param {Array} entries - The array of entries to filter
       * @param {string|Array} path - The path to the property to compare
       * @param {string} param - The parameter name to use for comparison
       * @param {*} criterion - The value or function to compare against
       * @returns {Array} An array of filtered entries that match the criterion
       */
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

    /**
     * Retrieves a criterion object from an array based on a specified parameter.
     * @param {Array} criteria - An array of criterion objects to search through.
     * @param {string} param - The parameter value to match against the 'param' property of each criterion object.
     * @returns {Object|undefined} The first criterion object that matches the specified parameter, or undefined if no match is found.
     */
    function getCriterionObjByParam(criteria, param) {
      /**
       * Filters and returns the first criterion object matching the specified parameter
       * @param {Array} criteria - An array of criterion objects to filter
       * @param {string} param - The parameter to match against the criterion objects
       * @returns {Object|undefined} The first criterion object that matches the parameter, or undefined if no match is found
       */
      return criteria.filter(criterionObj => criterionObj.param == param)[0];
    }

    function getValueFromPath(path = [], param, entry) {
      let value;
      if (!path || path.length == 0) return entry[param]
      ```
      /**
       * Traverses a nested object or array structure based on a given path.
       * @param {Array} path - An array of keys or indices representing the path to traverse.
       * @param {Object|Array} entry - The initial object or array to start traversing from.
       * @returns {*} The value found at the end of the path, or undefined if the path is invalid.
       */
      ```
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

    ```
    /**
     * Looks up a value by key in the provided database(s)
     * @param {string} key - The key to look up
     * @param {Object} options - The database options
     /**
      * Looks up an entity by its ID in either the main database or both main and fragment databases
      * @param {string|number} id - The unique identifier of the entity to look up
      * @param {Object} options - An object containing database references
      * @param {Array|Object} options.dbMain - The main database to search in
      * @param {Array|Object} [options.dbFragment] - The optional fragment database to search in
      * @returns {*} The result of the lookup operation
      */
     * @param {Array} options.dbMain - The main database array
     * @param {Object} [options.dbFragment] - The fragment database object (optional)
     * @returns {*} The value associated with the key in the database(s)
     */
    ```    function lookUpByKey(key, { dbMain, dbFragment }) {
      if (dbMain && !dbFragment) return lookUpByKeyQueryArray(key, dbMain);
      return lookUpInFragmentByKey(key, dbMain, dbFragment);
    }

    function lookUpById(id, { dbMain, dbFragment }) {
      if (dbMain && !dbFragment) return lookUpByIdQueryArray(id, dbMain);
      return lookUpInFragmentById(id, dbMain, dbFragment);
    }

    ```
    /**
     * Deletes an entry from the database using the provided key
     * @param {string} key - The key to identify the entry to be deleted
     * @param {Object} options - An object containing database references
     * @param {Object} options.dbMain - The main database object
     * @param {Object} [options.dbFragment] - The database fragment object (optional)
     * @returns {void} This function doesn't return a value
     */
    
    ```    function deleteFromDBByKey(key, { dbMain, dbFragment }) {
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

    ```
    /**
     * Deletes an entry from the database by its ID
     * @param {string|number} id - The unique identifier of the entry to be deleted
     * @param {Object} options - The database options
     * @param {Object} options.dbMain - The main database object
     * @param {Object} options.dbFragment - The database fragment object (optional)
     * @returns {void} This function doesn't return a value
     */
    
    ```    function deleteFromDBById(id, { dbMain, dbFragment }) {
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

    /**
     * Deletes all entries associated with a given ID from a specified database fragment
     ```
     /**
      * Removes entries from the index object based on matching ID
      * @param {Object} iterativeIndex - The index object to iterate over
      * @param {string|number} id - The ID to match against
      * @param {Object} OPEN_DB - The database object containing the index to modify
      * @param {string} dbFragment - The key for the specific database fragment
      * @returns {void} This function does not return a value
      */
     ```
     * @param {string|number} id - The ID of the entries to be deleted
     * @param {string} dbFragment - The name of the database fragment to operate on
     /**
      * Removes specified lookup keys from the query array
      * @param {Array} lookupKey - An array of lookup keys to be removed
      * @param {Array} queryArray - The array from which elements are to be removed
      * @returns {void} This method does not return a value
      */
     * @returns {void} This function doesn't return a value, it modifies the database in place
     */
    function deleteIdEntriesInFragment(id, dbFragment) {
      const iterativeIndex = { ...OPEN_DB[dbFragment].toWrite.index }
      Object.entries(iterativeIndex).forEach(([key, _id]) => {
        /**
         * Deletes specified keys from a query array in the database fragment
         * @param {string|string[]} lookupKey - The key(s) to be deleted from the query array
         * @param {string} lookUpQuerryArray - The name of the query array to modify
         * @param {string} dbMain - The main database identifier
         * @param {string} dbFragment - The database fragment identifier
         * @returns {void} This function does not return a value
         */
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

    /**
     * Looks up an entry in the database using a key query array
     * @param {string} key - The key to search for in the database
     * @param {object} dbMain - The main database object
     * @returns {object|null} The found entry or null if not found
     */
    function lookUpByKeyQueryArray(key, dbMain) {
      let entry = null;
      const dbFragment = getFragmentFromQuerry(key, "keyQueryArray", dbMain);
      if (!dbFragment) return null
      const fragmentExistCheck = openDBFragment(dbMain, dbFragment);
      if (!fragmentExistCheck) return null
      entry = lookUpInFragmentByKey(key, dbMain, dbFragment)
      return entry
    }

    /**
     * Looks up an entry by ID using a query array in the database
     * @param {string|number} id - The ID to look up
     * @param {object} dbMain - The main database object
     /**
      * Retrieves a database fragment based on a lookup key, query array, and main database.
      * @param {string} lookupKey - The key to search for in the query array.
      * @param {string} lookupQuerryArray - The name of the query array to search in.
      * @param {string} dbMain - The main database identifier.
      * @returns {string|undefined} The found database fragment or undefined if not found.
      * @throws {Error} If the specified dbMain is not found in the index.
      */
     * @returns {object|null} The found entry or null if not found
     */
    function lookUpByIdQueryArray(id, dbMain) {
      let entry = null;
      ```
      /**
       * Searches for a specific lookup key within database fragments.
       * @param {Object} dbFragments - An object containing database fragments.
       * @param {string} lookupQuerryArray - The key in dbFragments to access the query array.
       * @param {string} lookupKey - The key to search for in the query array.
       * @returns {string|undefined} The matching database fragment key if found, otherwise undefined.
       */
      ```
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

    /**
     * Looks up an entry in a database fragment by a given key
     * @param {string} key - The key to search for in the fragment
     * @param {string} dbMain - The name of the main database
     * @param {string} dbFragment - The name of the database fragment
     * @returns {object|null} The entry corresponding to the key if found, null otherwise
     */
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

    /**
     * Looks up an entry in a database fragment by its ID
     * @param {string} id - The unique identifier of the entry to look up
     * @param {string} dbMain - The name of the main database
     * @param {string} dbFragment - The name of the database fragment to search in
     * @returns {object|null} The found entry object, or null if not found or if the fragment doesn't exist
     */
    function lookUpInFragmentById(id, dbMain, dbFragment) {
      if (!INDEX[dbMain].dbFragments[dbFragment]) return null
      /**
       * Looks up keys in a database fragment based on a given ID
       * @param {string} id - The ID to search for in the fragment
       * @param {string} dbMain - The main database identifier
       * @param {string} dbFragment - The specific fragment of the database to search in
       * @returns {string[]|null} An array of keys associated with the given ID, or null if the fragment doesn't exist
       */
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
      /**
       * Filters and maps object entries to find keys associated with a specific ID
       * @param {Object} index - The object to search through
       * @param {*} id - The ID to match against
       * @returns {Array<string>} An array of keys that correspond to the given ID
       */
      /**
       * Filters and extracts keys from an object based on a matching ID
       * @param {Object} index - The object to filter and extract keys from
       * @param {*} id - The ID to match against the object values
       /**
        * Looks up an ID in a database fragment based on a given key
        * @param {string} key - The key to search for in the fragment's index
        * @param {string} dbMain - The name of the main database
        * @param {string} dbFragment - The name of the database fragment
        * @returns {string|null} The ID associated with the key in the fragment, or null if not found
        */
       /**
        * Creates a database file with the given content and naming convention.
        * @param {Object} toWrite - The data to be written to the file.
        * @param {string} rootFolder - The root directory where the file will be created.
        * @param {string} filesPrefix - The prefix to be used in the file name.
        * @param {string} dbFragment - The database fragment identifier to be included in the file name.
        * @returns {Promise<void>} A promise that resolves when the file is created successfully.
        */
       * @returns {Array<string>} An array of keys whose corresponding values match the given ID
       */
      const keys = Object.entries(index).filter(([_key, _id]) => _id == id).map(([_key]) => _key)
      return keys
    }

    function lookUpForIdInFragment(key, dbMain, dbFragment) {
      if (!INDEX[dbMain].dbFragments[dbFragment]) return null
      const { toWrite } = OPEN_DB[dbFragment];
      const id = toWrite.index[key];
      return id
    }
/**
 * Retrieves the proper database fragment based on the main database and fragment name.
 * @param {string} dbMain - The name of the main database.
 * @param {string} dbFragment - The initial name of the database fragment.
 * @returns {string|undefined} The proper name of the database fragment, or undefined if no configs are found.
 */

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

    /**
     * Checks and processes the database fragment in the index.
     * @param {string} dbMain - The main database identifier.
     * @param {string|undefined} dbFragment - The database fragment identifier (optional).
     * @returns {string} The processed database fragment identifier.
     */
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

    /**
     * Retrieves or creates the latest database main fragment
     * @param {Object} dbMain - The main database object
     * @returns {Object} The latest database fragment
     */
    function getLatestdbMainFragment(dbMain) {
      let dbFragment = getLastCreatedFragment(dbMain);
      if (!dbFragment) {
        /**
         * Opens a database fragment and adds it to the open databases object.
         * @param {string} dbMain - The main database identifier.
         * @param {string} dbFragment - The database fragment identifier.
         * @returns {boolean} True if the fragment was successfully opened or was already open, undefined otherwise.
         */
        dbFragment = createNewCumulativeFragment(dbMain, dbFragment);
      }
      return dbFragment;
    }

    function openDBFragment(dbMain, dbFragment) {
      if (OPEN_DB[dbFragment]) return true;
      if (!INDEX[dbMain].dbFragments[dbFragment]) return
      let fragmentFileObj;
      const { fileId } = INDEX[dbMain].dbFragments[dbFragment];
      /**
       * Adds a new entry to the OPEN_DB object with the given database fragment as the key
       * @param {string} dbMain - The main database identifier
       * @param {string} dbFragment - The database fragment to be used as the key in OPEN_DB
       * @param {Object} fragmentFileObj - The file object associated with the database fragment
       * @returns {void} This function does not return a value
       */
      if (fileId) fragmentFileObj = Toolkit.readFromJSON(fileId);
      addToOpenDBsObj(dbMain, dbFragment, fragmentFileObj)
      return true
    }

    function addToOpenDBsObj(dbMain, dbFragment, fragmentFileObj) {
      OPEN_DB[dbFragment] = new OpenDBEntry(dbMain, fragmentFileObj)
    }

    /**
     * Checks the size of an open database fragment and creates a new one if the maximum entry count is reached.
     * @param {Object} dbMain - The main database object.
     * @param {Object} dbFragment - The current database fragment object.
     * @returns {Object} The current or newly created database fragment.
     */
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

    /**
     * Creates a new cumulative fragment name based on the main database name and the last created fragment.
     * @param {string} dbMain - The main database name.
     * @param {string|undefined} dbFragment - The last created fragment name (optional).
     * @returns {string} The newly created fragment name.
     */
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
        /**
         * Adds a new database fragment to the index file for a main database
         * @param {string} dbMain - The name of the main database
         * @param {string} dbFragment - The name of the database fragment to add
         * @returns {void} This function doesn't return a value
         */
        /**
         * Retrieves the last created fragment from the given database.
         * @param {Object} dbMain - The main database object containing the index and properties.
         * @returns {Object|null} The last created fragment object, or null if no fragments exist.
         */
        newFragment = lastDBFragment + "_2";
      }
      addInIndexFile(dbMain, newFragment);
      return newFragment;
    }

    function addInIndexFile(dbMain, dbFragment) {
      INDEX[dbMain].dbFragments[dbFragment] = new IndexEntry();
      INDEX[dbMain].properties.fragmentsList.push(dbFragment);
      /**
       * Retrieves an external configuration value from a nested database structure.
       * @param {string} key - The key of the external configuration to retrieve.
       * @param {Object} options - An object containing database information.
       * @param {string} options.dbMain - The main database identifier.
       * @param {string} options.dbFragment - The database fragment identifier.
       * @returns {*} The value of the external configuration for the specified key.
       */
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

    ```
    /**
     * Adds an external configuration to a specific database fragment within the main database index.
     * @param {string} key - The key of the external configuration to be added.
     * @param {*} value - The value of the external configuration to be added.
     * @param {Object} options - An object containing database references.
     * @param {string} options.dbMain - The main database identifier.
     * @param {string} options.dbFragment - The database fragment identifier.
     * @returns {void} This function does not return a value.
     */
    ```
    function addExternalConfig(key, value, { dbMain, dbFragment }) {
      INDEX[dbMain].dbFragments[dbFragment].externalConfigs[key] = value;
      //saveIndex();
    }

    /**
     * Creates a new OpenDBEntry instance.
     * @param {Object} dbMain - The main database object.
     * @param {Object} [fragmentFileObj] - Optional file object for the database fragment. If not provided, a new DBFileObj will be created.
     * @returns {void} This function doesn't return a value.
     */
    function OpenDBEntry(dbMain, fragmentFileObj) {
      this.properties = new OpenDBProperties(dbMain);
      this.toWrite = fragmentFileObj || new DBFileObj();

    }

    /**
     * Constructor for OpenDBProperties
     * @param {Object} dbMain - The main database object
     * @returns {OpenDBProperties} A new OpenDBProperties instance
     */
    function OpenDBProperties(dbMain) {
      this.isChanged = false
      this.main = dbMain
    }

    /**
     * Constructor function for creating a DBFileObj instance
     * @returns {Object} An instance of DBFileObj with initialized index and data properties
     */
    function DBFileObj() {
      /**
       * Constructs an IndexEntry object to store various query arrays and configurations for indexing.
       * @returns {IndexEntry} A new IndexEntry instance with initialized properties.
       */
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

    /**
     * Removes the first occurrence of a specified element from an array.
     * @param {*} element - The element to be removed from the array.
     * @param {Array} array - The array from which the element should be removed.
     * @returns {void} This function does not return a value.
     */
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

})function does not return a value.
     */
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