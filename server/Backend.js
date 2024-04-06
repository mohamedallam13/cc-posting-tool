(function (root, factory) {
  root.BACKEND = factory();
})(this, function () {
  const { REFERENCES_MANAGER } = CCLIBRARIES

  const MASTER_INDEX_FILE_ID = "1ohC9kPnMxyptp8SadRBGAofibGiYTTev"
  const REQUIRED_REFERENCES = ["ccMainConfessionsFeed", "CCJSONSimpleConfessionsIndex"];

  const initDB = JSON_DB_HANDLER.init

  let indexFileId
  let jsonDBManager

  const SAMPLE_DATA = [
    {
      "timestamp": "2024-02-10T14:48:00",
      "compoundedConfession": `195241 #CC #CairoConfessions #CCSexuality 
  #CCAdminNotes: Follow us on #Instagram @cairoconfessions
  Mood:😊 #Contactable / #InternationalDayofWomenandGirlsinScience
  Male, 30 confesses:
  محتاج نصيحة و رأى بالتفصيل عشان الموضوع عندى كبير بس مش عامل مشاكل 
  مراتي بتجيبلي صحابها البنات انام معاهم و دي أكبر متعة ليها و ساعات بتشاركنا و ساعات لأ 
  و بدأت مؤخرا تنام مع حد معايا و بتكررها كتير هو برضه جوز صاحبتها و ساعات بنكون إحنا الأربعة و أوقات كل واحد بيختلي بمرات التاني
  و هي دايما الموضوع ده مثير ليها جدا و بيخلي حياتها أحلى و دايما تشجعني عليه
  و بعدها بتكون معايا في الجنس مرعبة بمعنى الكلمة بتديني إحساس مفيش زيه في الدنيا و مش مخلياني ناقصني حاجة و مبتعملش اي حاجة غير لما بتقولي و بتشرحلي و بتكون مبسوطة إنها مشاركاني كل تفصيلة في رغبات جسمها
  #Truth`,
      "guidelineCompliant": "Yes"
    },
    {
      "timestamp": "2024-02-10T15:20:00",
      "compoundedConfession": `195239 #CC #CairoConfessions #CCLoneliness 
  #CCAdminNotes: Follow us on #Instagram @cairoconfessions
  Mood:😔 #Contactable
  Automated TRIGGER WARNING ⚠️ this post might include a confession about #suicide, please deal with care. All encouraging comments will be deleted. / #InternationalDayofWomenandGirlsinScience
  Male, 21 confesses:
  I dont remember the last time I was happy that I am going home or the last time I had a goodnight sleep or the last time I was excited to talk to someone or when I had someone special in my life I dont remember the last time I had a good meal I just remember that one year of my entire life I was happy and by the end of that year I attempted suicide twice although if you asked my opinion about it...I find it stupid the idea itself of killing myself...it's stupid and boring yet I tried to do it twice people tell me reach out to someone..I can't even reach out to my own family without regretting it who do I reach out to? I can't even afford reaching out to someone and even if I do where the fuck is it gonna go like what would benefit me? because as much as I am mentally ill I am not stupid so much goes through my mind I can talk about every single thing that ever messed me up and I wouldnt know where it ends or where it begins Im just at a point where someone would ask me if I wanted to talk about it and I would just think..why ...why would I? what's the point? you're not staying here neither am I either one of us will die first or someone will disappear and forget about the other the funny thing is after all that I typed I didn't even type what I was feeling horrible about I wanted to talk about how lonely I am , how I keep losing my friends , how increasingly boring I am becoming becuase it doesnt matter anymore nothing does , how depressed I am , how much I hallucinate or how I barely sleep 5 hours no matter how hard I try and wake up the next day feeling like burnt toast if that is even something that can describe it I dont know what to type anymore it's like Im some fucking weirdo who's saying random shit to grab anyone's attention at the same time I am scared of it I just wanted a family since I was 7 for 14 years all I wanted and all I wished for every single birthday alone in my room was to have a real family maybe I wrote that because that's the only problem I can't forget the only problem that makes me pass out after it causes a terrible headache I don't even know what I'm typing at this point it's like a joke lol I guess I said it before it's like a pathetic attempt to connect with a human being
  #Pain #Rant`,
      "guidelineCompliant": "No"
    }
  ];

  function loadFeed() {
    const referencesObj = REFERENCES_MANAGER.init(MASTER_INDEX_FILE_ID).requireFiles(REQUIRED_REFERENCES[0]).requiredFiles;
    const feed = referencesObj.ccMainConfessionsFeed.fileContent;
    return JSON.stringify(feed)
  }

  function updateDB(request, status) {
    getDB()
    const entryObj = updateInDBStatus(request, status)
    writeToDB()
    return JSON.stringify({ success: true, entryObj })
  }

  function clearStatus(request) {
    getDB()
    clearStatusInDB(request)
    writeToDB()
    return JSON.stringify({ success: true })
  }

  function getDB() {
    const referencesObj = REFERENCES_MANAGER.init(MASTER_INDEX_FILE_ID).requireFiles(REQUIRED_REFERENCES[1]).requiredFiles;
    indexFileId = referencesObj.CCJSONSimpleConfessionsIndex.fileId // Get DB Index File Id to start Connection
    jsonDBManager = initDB(indexFileId) // Start Connection with DB
  }


  function updateInDBStatus(request, status) {
    const { serialNum, rejectionReasons } = request
    const serialN = parseInt(serialNum)
    const entryInDB = getEntryFromDB(serialN)
    return updateStatus(entryInDB, status, rejectionReasons)
  }

  function updateStatus(entryInDB, status, rejectionReasons) {
    const { addToDB } = jsonDBManager
    const statusUpdateObj = {
      status,
      rejectionReasons,
      timestamp: new Date()
    }
    entryInDB.status.unshift(statusUpdateObj)
    addToDB(entryInDB, { dbMain: "CCMAIN" })
    return entryInDB
  }

  function clearStatusInDB(request) {
    const { addToDB } = jsonDBManager
    const { serialNum } = request
    const serialN = parseInt(serialNum)
    const entryInDB = getEntryFromDB(serialN)
    entryInDB.status = []
    addToDB(entryInDB, { dbMain: "CCMAIN" })
  }

  function getEntryFromDB(serialNum) {
    const { lookUpByKey } = jsonDBManager
    return lookUpByKey(serialNum, { dbMain: "CCMAIN" })
  }

  function writeToDB() {
    const { saveToDBFiles } = jsonDBManager
    saveToDBFiles()
  }

  return {
    loadFeed,
    updateDB,
    clearStatus
  }

})

function loadFeed() {
  return BACKEND.loadFeed()
}

function updateDB(request, status) {
  console.log(request, status)
  return BACKEND.updateDB(request, status)
}
function clearStatus(request) {
  console.log(request)
  return BACKEND.clearStatus(request)
}
