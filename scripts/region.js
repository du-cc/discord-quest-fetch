{js:{ignore:
(async () => {
try {

const restrictionURL =
  "https://gist.githubusercontent.com/xGustavvo/3d08b7369eb34b50834815fd43176cae/raw";

const questsURL =
  "https://raw.githubusercontent.com/du-cc/discord-quest-fetch/refs/heads/main/data/quests.json";

const fallbackQuestURL =
  "https://raw.githubusercontent.com/du-cc/discord-quest-fetch/refs/heads/main/data/quests.json";

const [
  restrictionRes,
  questsRes,
  fallbackRes
] = await Promise.all([
  fetch(restrictionURL),
  fetch(questsURL),
  fetch(fallbackQuestURL)
]);

const restrictionsData =
  await restrictionRes.json();

const mainData =
  await questsRes.json();

const fallbackData =
  await fallbackRes.json();

if(!Array.isArray(mainData))
  return "❌ Invalid main quest structure.";

const restrictions =
  restrictionsData.quests || [];

const restrictionsMap =
  new Map(restrictions.map(r => [r.id, r]));

/* NORMALIZE QUEST */

const normalizeQuest = q => {

  if(q.config){
    return q;
  }

  return {
    id: q.id,
    config: {
      starts_at: q.starts_at,
      expires_at: q.expires_at
    }
  };

};

/* NORMALIZE REGIONS */

const normalizeRegions = regions => {

  if(!regions)
    return {
      include: [],
      exclude: []
    };

  if(Array.isArray(regions)){
    return {
      include: regions,
      exclude: []
    };
  }

  return {
    include: Array.isArray(regions.include)
      ? regions.include
      : [],

    exclude: Array.isArray(regions.exclude)
      ? regions.exclude
      : []
  };

};

const dataMap = new Map();

for(const q of mainData){
  dataMap.set(
    q.id,
    normalizeQuest(q)
  );
}

if(Array.isArray(fallbackData)){

  for(const q of fallbackData){

    if(!dataMap.has(q.id)){
      dataMap.set(
        q.id,
        normalizeQuest(q)
      );
    }

  }

}

const data =
  [...dataMap.values()];

const now =
  Date.now();

const countryFlags = {
  AT: ":flag_at:",
  AU: ":flag_au:",
  BE: ":flag_be:",
  BR: ":flag_br:",
  CA: ":flag_ca:",
  CH: ":flag_ch:",
  CN: ":flag_cn:",
  CZ: ":flag_cz:",
  DE: ":flag_de:",
  DK: ":flag_dk:",
  ES: ":flag_es:",
  FI: ":flag_fi:",
  FR: ":flag_fr:",
  HK: ":flag_hk:",
  HU: ":flag_hu:",
  IE: ":flag_ie:",
  IN: ":flag_in:",
  IT: ":flag_it:",
  JP: ":flag_jp:",
  KR: ":flag_kr:",
  MX: ":flag_mx:",
  NL: ":flag_nl:",
  NO: ":flag_no:",
  NZ: ":flag_nz:",
  PL: ":flag_pl:",
  PT: ":flag_pt:",
  SE: ":flag_se:",
  SG: ":flag_sg:",
  SK: ":flag_sk:",
  UK: ":flag_gb:",
  US: ":flag_us:",
  VN: ":flag_vn:"
};

/* PAGE */

const input = String(
  Array.isArray(args)
    ? args.join(" ")
    : args || ""
).trim();

let page = 1;

const pageMatch =
  input.match(/-(\d+)$/);

if(pageMatch){

  page = Math.max(
    1,
    parseInt(
      pageMatch[1],
      10
    )
  );

}

/* QUEST FILTER */

const regionalQuests = [];

for(const q of data){

  let restriction =
    restrictionsMap.get(q.id);

  if(
    !restriction
  ){

    restriction =
      restrictions.find(
        r =>
        r.replacement_id === q.id
      );

  }

  if(!restriction)
    continue;

  const regions =
    normalizeRegions(
      restriction.regions
    );

  const include =
    regions.include;

  const exclude =
    regions.exclude;

  const hasRestrictions =
    include.length ||
    exclude.length;

  if(
    restriction.is_global ||
    !hasRestrictions
  ){
    continue;
  }

  const expires =
    Date.parse(
      q.config?.expires_at
    );

  const starts =
    Date.parse(
      q.config?.starts_at
    );

  if(
    !isNaN(starts) &&
    now < starts
  ){
    continue;
  }

  if(
    !isNaN(expires) &&
    expires <= now
  ){
    continue;
  }

  regionalQuests.push({
    id: q.id,
    starts_at:
      q.config?.starts_at,
    include,
    exclude
  });

}

if(
  !regionalQuests.length
){

  return "No active region-restricted quests found.\nOnly latest 40 quests are fetched (bot can't handle more than that). Use \`-t regionweb\` for complete data";

}

/* SORT */

regionalQuests.sort(
(a,b)=>
  Date.parse(
    b.starts_at||0
  )-
  Date.parse(
    a.starts_at||0
  )
);

/* PAGINATION */

const pages=[];

let currentPage=[];
let currentLength=0;

const footerReserve=100;

for(const quest of regionalQuests){

  const includeFlags =
    quest.include
    .map(
      r =>
      countryFlags[r] ||
      `\`${r}\``
    )
    .join(" ");

  const excludeFlags =
    quest.exclude
    .map(
      r =>
      countryFlags[r] ||
      `\`${r}\``
    )
    .join(" ");

  let line =
    `- https://discord.com/quests/${quest.id}`;

  if(includeFlags){

    line +=
      `\n  Include: ${includeFlags}`;

  }

  if(excludeFlags){

    line +=
      `\n  Exclude: ${excludeFlags}`;

  }

  line += "\n";

  if(
    currentLength +
    line.length >
    (1900-footerReserve)
  ){

    pages.push(
      currentPage
    );

    currentPage=[];

    currentLength=0;

  }

  currentPage.push(
    line
  );

  currentLength +=
    line.length;

}

if(
  currentPage.length
){

  pages.push(
    currentPage
  );

}

const totalPages =
  pages.length;

if(
  page >
  totalPages
){

  return `❌ Page ${page} does not exist. Max page: ${totalPages}.\nOnly latest 40 quests are fetched (bot can't handle more than that). Use \`-t regionweb\` for complete data`;

}

const pageItems =
  pages[
    page-1
  ];

let shownBefore=0;

for(
  let i=0;
  i<page-1;
  i++
){

  shownBefore +=
    pages[i].length;

}

const shownStart =
  shownBefore+1;

const shownEnd =
  shownBefore+
  pageItems.length;

/* OUTPUT */

let output =
"<:Discovery:960579493205012521> **Region-Restricted Quests**\n\n";

output +=
  pageItems.join("");

output +=
`\n*( Page ${page}/${totalPages} • Showing ${shownStart}-${shownEnd} of ${regionalQuests.length} quests )*\nOnly latest 40 quests are fetched (bot can't handle more than that). Use \`-t regionweb\` for complete data`;

return output.trim();

}catch(e){

return `❌ Error fetching quest data.\n${e}\nuse \`-t regionweb\``;

}

})()
}}
