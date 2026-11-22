/**
 * The whole store's categories as folders: which group of the store's menu
 * each link sits in, read off the markup (`menuStep`), and the tree the popup
 * draws from it (`menuGroups`, `categoryName`).
 *
 * What the admin asked for (2026-11-22): on Burberry the list of categories
 * was a flat run of "View All", "Coats & Jackets", "Polos"… for Women, Men
 * and Children at once, and leaving out Children meant unticking forty rows,
 * guessing which "View All" was whose. Now each sits in its folder — Men ›
 * Clothes › View All, Children › Girls (3-14 Years) › View All — and a folder
 * goes with one tick. On every store, so the menus below are the shapes real
 * stores ship, each written small:
 *
 *   - Burberry: a tab link, its panel after it, each column a list whose
 *     first item is its heading, set apart only by its class;
 *   - Kith (Shopify): tabs and tab panels joined by `aria-labelledby`, and
 *     "Footwear ›" buttons whose lists sit elsewhere, joined by `data-id`;
 *   - END.: buttons named "Open Men :: Subnav submenu" over their panels;
 *   - Nike: `<style>` inside the links, "Men menu" for a name;
 *   - About You: ninety categories under one heading, their addresses saying
 *     `/c/frauen/bekleidung/…`, `/c/frauen/schuhe/…`;
 *   - headings and links side by side in one column, a mobile accordion
 *     (`<details>`), footer columns;
 *   - and what must not become a folder: a promotion's tile, the item for the
 *     page the admin is on, "View all" set in bold, "Back" in a drill-down,
 *     the links and buttons of one list, a flat menu.
 *
 * `menuStep` runs in Chromium; the rest are pure and run here.
 */
const path = require("path");
const { pathToFileURL } = require("url");

let pass = 0;
const failures = [];
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else failures.push(`${name}\n     got  ${JSON.stringify(got).slice(0, 700)}\n     want ${JSON.stringify(want).slice(0, 700)}`);
}

const S = "https://shop.example";

(async () => {
  const site = await import(pathToFileURL(path.join(__dirname, "..", "extension", "site.js")).href);
  const { menuStep, categoryCandidates, menuGroups, categoryName } = site;

  // ── The tree, from the groups a menu gave ─────────────────────────────────
  console.log("— folders from the menu's groups —");
  const cat = (p, label, trail = [], where = "menu") => ({ url: `${S}${p}`, label, where, trail });
  const groupsOf = (list) => menuGroups(list).map((c) => [c.label, c.group]);

  check(
    "the folders a menu gave stay as given, in the menu's order",
    groupsOf([
      cat("/c/men", "Men"),
      cat("/l/mens-clothing", "Clothes", ["Men"]),
      cat("/l/mens-clothing/view-all", "View All", ["Men", "Clothes"]),
      cat("/l/mens-clothing/polos", "Polos", ["Men", "Clothes"]),
      cat("/c/children", "Children"),
      cat("/l/girls", "View All", ["Children", "Girls (3-14 Years)"]),
    ]),
    [
      ["Men", ["Men"]],
      ["Clothes", ["Men", "Clothes"]],
      ["View All", ["Men", "Clothes"]],
      ["Polos", ["Men", "Clothes"]],
      ["Children", ["Children"]],
      ["View All", ["Children", "Girls (3-14 Years)"]],
    ],
  );
  check(
    "a folder's own page, named like it, goes in it; one named otherwise stays where it is",
    groupsOf([cat("/c/women", "WOMEN"), cat("/c/women/coats", "Coats", ["Women"]), cat("/c/sale", "Sale"), cat("/c/sale/x", "Shoes", ["Women's sale"])]),
    [
      ["WOMEN", ["Women"]],
      ["Coats", ["Women"]],
      ["Sale", []],
      ["Shoes", ["Women's sale"]],
    ],
  );
  check(
    "the footer's links are a folder of their own",
    groupsOf([cat("/c/coats", "Coats"), cat("/c/gift", "Gift ideas", ["Shop"], "footer"), cat("/c/kids", "Kids", [], "footer")]),
    [
      ["Coats", []],
      ["Gift ideas", ["Footer", "Shop"]],
      ["Kids", ["Footer"]],
    ],
  );
  check(
    "the whole menu in one folder is no folder",
    groupsOf([cat("/c/a", "A", ["Menu"]), cat("/c/b", "B", ["Menu", "More"]), cat("/c/c", "C", ["Menu", "More"])]),
    [
      ["A", []],
      ["B", ["More"]],
      ["C", ["More"]],
    ],
  );
  check(
    "a folder that holds only one folder is one folder",
    groupsOf([
      cat("/c/a", "A", ["Black Friday", "Black Friday offers", "Men"]),
      cat("/c/b", "B", ["Black Friday", "Black Friday offers", "Women"]),
      cat("/c/c", "C", ["Brands"]),
    ]),
    [
      ["A", ["Black Friday", "Men"]],
      ["B", ["Black Friday", "Women"]],
      ["C", ["Brands"]],
    ],
  );

  // About You: one heading, ninety categories, the addresses telling them apart.
  const kinds = { bekleidung: ["Kleider", "Jeans", "Hosen", "Jacken", "Röcke"], schuhe: ["Sneaker", "Stiefel", "Sandalen", "Pumps"], accessoires: ["Taschen", "Schals", "Hüte"] };
  const big = [];
  let id = 20200;
  for (const [kind, names] of Object.entries(kinds)) {
    big.push(cat(`/c/frauen/${kind}-${id++}`, kind[0].toUpperCase() + kind.slice(1), ["Nach Kategorien shoppen"]));
    for (const n of names) big.push(cat(`/c/frauen/${kind}/${n.toLowerCase()}-${id++}`, n, ["Nach Kategorien shoppen"]));
  }
  big.push(cat("/c/frauen/top-100-657008", "Top 100", ["Nach Kategorien shoppen"]));
  big.push(cat("/outlet", "Outlet"));
  const split = menuGroups(big);
  check(
    "a big folder is split by its addresses, each part named as the store names its page",
    split.map((c) => `${c.group.join(" › ")} | ${c.label}`),
    [
      "Nach Kategorien shoppen › Bekleidung | Bekleidung",
      "Nach Kategorien shoppen › Bekleidung | Kleider",
      "Nach Kategorien shoppen › Bekleidung | Jeans",
      "Nach Kategorien shoppen › Bekleidung | Hosen",
      "Nach Kategorien shoppen › Bekleidung | Jacken",
      "Nach Kategorien shoppen › Bekleidung | Röcke",
      "Nach Kategorien shoppen › Schuhe | Schuhe",
      "Nach Kategorien shoppen › Schuhe | Sneaker",
      "Nach Kategorien shoppen › Schuhe | Stiefel",
      "Nach Kategorien shoppen › Schuhe | Sandalen",
      "Nach Kategorien shoppen › Schuhe | Pumps",
      "Nach Kategorien shoppen › Accessoires | Accessoires",
      "Nach Kategorien shoppen › Accessoires | Taschen",
      "Nach Kategorien shoppen › Accessoires | Schals",
      "Nach Kategorien shoppen › Accessoires | Hüte",
      "Nach Kategorien shoppen | Top 100",
      " | Outlet",
    ],
  );
  const flatTop = [];
  for (let i = 0; i < 14; i++) flatTop.push(cat(`/${i % 2 ? "c" : "s"}/${["coats", "knitwear", "dresses", "shirts", "jeans", "boots", "bags"][i % 7]}-${i}`, `Thing ${i}`));
  check("a store's shorthand in the address (`/c/`, `/s/`) makes no folder", menuGroups(flatTop).every((c) => !c.group.length), true);
  check(
    "a small folder is left as the menu has it",
    menuGroups([cat("/c/w/coats/a", "A", ["Women"]), cat("/c/w/coats/b", "B", ["Women"]), cat("/c/w/bags/c", "C", ["Women"]), cat("/c/w/bags/d", "D", ["Women"]), cat("/c/m", "Men")]).map((c) => c.group),
    [["Women"], ["Women"], ["Women"], ["Women"], []],
  );
  const menCats = [];
  for (const [kind, names] of Object.entries({ clothing: ["Coats", "Shirts", "Jeans", "Knitwear", "Polos", "Tees", "Shorts"], shoes: ["Boots", "Sneakers", "Loafers", "Sandals", "Derbies", "Slides"] })) {
    for (const n of names) menCats.push(cat(`/en/l/mens-${kind}/${n.toLowerCase()}/`, n));
  }
  check(
    "categories with no folder at all are split by their addresses too",
    [...new Set(menuGroups(menCats).map((c) => c.group.join(" › ")))],
    ["Mens clothing", "Mens shoes"],
  );
  check(
    "a part whose own page is called \"View all\", or shares its name, is named by its address; parts named alike stay apart",
    [...new Set(menuGroups([
      ...["Boots", "Heels", "Flats", "Sneakers", "Sandals"].map((n) => cat(`/c/women/shoes/${n.toLowerCase()}`, n, ["Women"])),
      ...["Totes", "Clutches", "Backpacks", "Belt bags", "Crossbody"].map((n) => cat(`/c/women/bags/${n.toLowerCase().replace(" ", "-")}`, n, ["Women"])),
      cat("/c/women/shoes", "View all", ["Women"]),
      cat("/c/women/bags", "View all", ["Women"]),
      cat("/c/men", "Men"),
    ]).map((c) => c.group.join(" › ")))],
    ["Women › Shoes", "Women › Bags", ""],
  );
  check(
    "categories told apart only by their query are split by their path",
    [...new Set(menuGroups([
      ...["nike", "ugg", "puma", "vans"].map((b) => cat(`/c/clothing?brand=${b}`, b.toUpperCase(), ["Top brands"])),
      ...["nike", "ugg", "puma", "vans"].map((b) => cat(`/c/shoes?brand=${b}`, b.toUpperCase(), ["Top brands"])),
      cat("/c/sale", "Sale"),
    ]).map((c) => c.group.join(" › ")))],
    ["Top brands › Clothing", "Top brands › Shoes", ""],
  );
  check(
    "a small folder whose categories share names is split too: About You's \"Highlights\", \"Neu\" three times",
    menuGroups([
      ...["bekleidung", "schuhe", "accessoires"].flatMap((k) => [cat(`/c/frauen/${k}/neu-1${k.length}`, "Neu", ["Highlights"]), cat(`/c/frauen/${k}/exklusiv-2${k.length}`, "Exklusiv", ["Highlights"])]),
      cat("/c/sale", "Sale"),
    ]).map((c) => categoryName(c)),
    [
      "Highlights › Bekleidung › Neu",
      "Highlights › Bekleidung › Exklusiv",
      "Highlights › Schuhe › Neu",
      "Highlights › Schuhe › Exklusiv",
      "Highlights › Accessoires › Neu",
      "Highlights › Accessoires › Exklusiv",
      "Sale",
    ],
  );
  check(
    "a footer headed \"Footer\" is one Footer folder",
    menuGroups([cat("/c/bags", "Bags", ["Footer", "Shop"], "footer"), cat("/c/sale", "Sale", ["Footer"], "footer"), cat("/c/men", "Men")]).map((c) => c.group),
    [["Footer", "Shop"], ["Footer"], []],
  );
  check(
    "the menu in one folder beside the footer is still no folder",
    menuGroups([cat("/c/a", "A", ["Shop"]), cat("/c/b", "B", ["Shop", "New"]), cat("/c/c", "C", ["Shop", "New"]), cat("/c/g", "Gifts", [], "footer")]).map((c) => c.group),
    [[], ["New"], ["New"], ["Footer"]],
  );
  check("no categories, no folders", menuGroups([]), []);
  check("not a list, no folders", menuGroups(null), []);

  // ── A category's name, with its folders ───────────────────────────────────
  console.log("— a category named with its folders —");
  check("folders first", categoryName({ group: ["Men", "Clothes"], label: "View All" }), "Men › Clothes › View All");
  check("a folder's own page is said once", categoryName({ group: ["Men"], label: "MEN" }), "Men");
  check("no folders, the label alone", categoryName({ label: "Coats" }), "Coats");
  const L = "x".repeat(50);
  const long = categoryName({ group: [L, L, L, L], label: "Coats & Jackets" });
  check("a long name gives up its middle folders, never the category: within the site's 120", [long.length <= 120, long.endsWith("› Coats & Jackets"), long.startsWith(`${L} › …`)], [true, true, true]);
  const G = "g".repeat(60);
  const C = "c".repeat(60);
  for (const group of [[G], [G, "Accessories"], [G, "Accessories", "Scarves"]]) {
    const n = categoryName({ group, label: C });
    check(`however long, both the outermost folder and the category stay (${group.length} folders)`, [n.length <= 120, n.endsWith(C), n.startsWith("ggg")], [true, true, true]);
  }

  // ── The same address twice in a menu ──────────────────────────────────────
  check(
    "listed twice, a category takes the first groups it has: the drawer's, when the header's link had none",
    categoryCandidates(
      [
        { url: `${S}/c/coats`, label: "Coats", where: "menu", trail: [] },
        { url: `${S}/c/coats`, label: "Coats", where: "menu", trail: ["Men"] },
        { url: `${S}/c/coats?sort=new`, label: "Coats", where: "menu", trail: ["Women"] },
      ],
      `${S}/`,
    ).map((c) => [c.label, c.trail]),
    [["Coats", ["Men"]]],
  );
  check(
    "a copy in the footer or a brand list never moves a tab's own page out of its folder",
    menuGroups(
      categoryCandidates(
        [
          { url: `${S}/c/men`, label: "Men", where: "menu", trail: [] },
          { url: `${S}/c/men/shirts`, label: "Shirts", where: "menu", trail: ["Men"] },
          { url: `${S}/c/kids`, label: "Kids", where: "menu", trail: [] },
          { url: `${S}/c/kids/boys`, label: "Boys", where: "menu", trail: ["Kids"] },
          { url: `${S}/c/end`, label: "END. LABEL", where: "menu", trail: [] },
          { url: `${S}/c/end/tees`, label: "Tees", where: "menu", trail: ["END. LABEL"] },
          { url: `${S}/c/end`, label: "END. LABEL", where: "menu", trail: ["Brands"] },
          { url: `${S}/c/men`, label: "Men", where: "footer", trail: ["Shop"] },
          { url: `${S}/c/kids`, label: "Kids", where: "footer", trail: ["Shop"] },
        ],
        `${S}/`,
      ),
    ).map((c) => categoryName(c)),
    ["Men", "Men › Shirts", "Kids", "Kids › Boys", "END. LABEL", "END. LABEL › Tees"],
  );
  check(
    "a different link to the same page leaves it where it is: \"New coats\" in Sale's panel does not move Coats into Sale",
    categoryCandidates(
      [
        { url: `${S}/c/coats`, label: "Coats", where: "menu", trail: [] },
        { url: `${S}/c/coats?sort=new`, label: "New coats", where: "menu", trail: ["Sale"] },
      ],
      `${S}/`,
    ).map((c) => [c.label, c.trail]),
    [["Coats", []]],
  );

  // ── Reading the menus, in a real page ─────────────────────────────────────
  const playwright = (() => {
    try {
      return require(process.env.PLAYWRIGHT_MODULE || "playwright");
    } catch {
      return null;
    }
  })();
  if (!playwright) {
    failures.push("Playwright is not installed: menuStep was not checked (set NODE_PATH or PLAYWRIGHT_MODULE)");
  } else {
    const browser = await playwright.chromium.launch({
      executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    });
    const page = await browser.newPage();
    /** The groups `menuStep` reads for each link of a page, by label, and how long it took. */
    const read = async (html) => {
      await page.route(`${S}/**`, (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }));
      await page.goto(`${S}/`);
      await page.unroute(`${S}/**`);
      const t0 = Date.now();
      // The page as it stands: the reading itself. Opening the menu has its own check below.
      const res = await page.evaluate(`(${menuStep.toString()})({ open: false })`);
      return { links: res.links, ms: Date.now() - t0 };
    };
    const trails = (links) => links.map((l) => `${l.trail.join(" › ")}${l.trail.length ? " | " : ""}${l.label}`);
    const page$ = (body) => `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}<main><h1>Home</h1></main></body></html>`;

    console.log("— Burberry: a tab, its panel, columns headed by their first item —");
    const column = (head, items, base) =>
      `<li class="_cat_1"><ul>` +
      `<li><a href="${base}"><span class="_L2_x">${head}</span></a></li>` +
      items.map((t, i) => `<li><a href="${base}${i}/"><span class="_L3_x _body">${t}</span></a></li>`).join("") +
      `</ul></li>`;
    const burberry = page$(`<header><nav class="_root"><ul>
      <li><a href="/c/women/">Women</a><div class="_navContent"><ul>${column("Clothes", ["View All", "Dresses"], "/l/womens-clothing/")}${column("Shoes", ["View All", "Boots"], "/l/womens-shoes/")}</ul></div></li>
      <li><a href="/c/men/">Men</a><div class="_navContent"><ul>${column("Clothes", ["View All", "Polos"], "/l/mens-clothing/")}${column("Wallets &amp; Card Cases", ["View All", "Bifold Wallets"], "/l/mens-wallets/")}</ul></div></li>
      <li><a href="/c/children/">Children</a><div class="_navContent"><ul>${column("Girls (3-14 Years)", ["View All", "Coats &amp; Jackets"], "/l/girls/")}</ul></div></li>
    </ul></nav></header>`);
    const b = await read(burberry);
    check("every link of Burberry's menu, with its tab and column", trails(b.links), [
      "Women",
      "Women | Clothes",
      "Women › Clothes | View All",
      "Women › Clothes | Dresses",
      "Women | Shoes",
      "Women › Shoes | View All",
      "Women › Shoes | Boots",
      "Men",
      "Men | Clothes",
      "Men › Clothes | View All",
      "Men › Clothes | Polos",
      "Men | Wallets & Card Cases",
      "Men › Wallets & Card Cases | View All",
      "Men › Wallets & Card Cases | Bifold Wallets",
      "Children",
      "Children | Girls (3-14 Years)",
      "Children › Girls (3-14 Years) | View All",
      "Children › Girls (3-14 Years) | Coats & Jackets",
    ]);
    const tree = menuGroups(categoryCandidates(b.links, `${S}/`));
    check(
      "and as the popup's folders: each tab's and column's own page inside it, Children with one tick",
      tree.map((c) => `${c.group.join(" › ")} | ${c.label}`),
      [
        "Women | Women",
        "Women › Clothes | Clothes",
        "Women › Clothes | View All",
        "Women › Clothes | Dresses",
        "Women › Shoes | Shoes",
        "Women › Shoes | View All",
        "Women › Shoes | Boots",
        "Men | Men",
        "Men › Clothes | Clothes",
        "Men › Clothes | View All",
        "Men › Clothes | Polos",
        "Men › Wallets & Card Cases | Wallets & Card Cases",
        "Men › Wallets & Card Cases | View All",
        "Men › Wallets & Card Cases | Bifold Wallets",
        "Children | Children",
        "Children › Girls (3-14 Years) | Girls (3-14 Years)",
        "Children › Girls (3-14 Years) | View All",
        "Children › Girls (3-14 Years) | Coats & Jackets",
      ],
    );

    console.log("— Kith: tabs, and lists opened by buttons from elsewhere —");
    const kith = page$(`<s-drawer role="navigation" aria-label="Mobile Navigation Drawer"><nav class="mobile-nav-container">
      <s-tabs><div role="tablist">
        <button role="tab" id="tab-mens" aria-controls="panel-mens">Mens</button>
        <button role="tab" id="tab-womens" aria-controls="panel-womens">Womens</button>
      </div>
      <div class="tab__panel" role="tabpanel" id="panel-mens" aria-labelledby="tab-mens"><ul>
        <li><a href="/pages/shop-mens" class="font-500">Explore Mens</a></li>
        <li><button data-id="mens-footwear" data-level="1">Footwear <svg><title>Caret</title></svg></button></li>
        <li><a href="/collections/kith-records" class="font-500">Kith Records</a></li>
        <li><button data-id="mens-apparel" data-level="1">Apparel <svg><title>Caret</title></svg></button></li>
        <li><a href="/collections/mens-lifestyle" class="font-500">Lifestyle</a></li>
      </ul></div>
      <div class="tab__panel" role="tabpanel" id="panel-womens" aria-labelledby="tab-womens"><ul>
        <li><button data-id="womens-footwear" data-level="1">Footwear <svg><title>Caret</title></svg></button></li>
      </ul></div></s-tabs>
      <div class="block">
        <ul class="hidden" data-id="mens-footwear" data-back-label="Back to Mens"><li><button>Back</button></li><li><a href="/collections/mens-footwear">Shop All Footwear</a></li><li><a href="/collections/mens-sneakers">Sneakers</a></li></ul>
        <ul class="hidden" data-id="mens-apparel"><li><a href="/collections/mens-tops">Tops</a></li><li><a href="/collections/mens-bottoms">Bottoms</a></li></ul>
        <ul class="hidden" data-id="womens-footwear"><li><a href="/collections/womens-sneakers">Sneakers</a></li></ul>
      </div>
    </nav></s-drawer>`);
    const k = await read(kith);
    check("Kith's tabs name their panels; a button names the list it opens, wherever that list is", trails(k.links), [
      "Mens | Explore Mens",
      "Mens | Kith Records",
      "Mens | Lifestyle",
      "Mens › Footwear | Shop All Footwear",
      "Mens › Footwear | Sneakers",
      "Mens › Apparel | Tops",
      "Mens › Apparel | Bottoms",
      "Womens › Footwear | Sneakers",
    ]);

    console.log("— END.: a button named \"Open Men :: Subnav submenu\" over its panel —");
    const end = page$(`<header><nav><ul>
      <li><button aria-controls="men-sub" aria-label="Open Men :: Subnav submenu" aria-expanded="false">Men</button>
        <div id="men-sub"><div class="col"><h3>Clothing</h3><ul><li><a href="/collections/mens-coats">Coats &amp; Jackets</a></li></ul></div>
        <div class="col"><h3>Footwear</h3><ul><li><a href="/collections/mens-sneakers">Sneakers</a></li></ul></div></div></li>
      <li><button aria-controls="women-sub" aria-label="Open Women :: Subnav submenu" aria-expanded="false"><svg><title>Women</title></svg></button>
        <div id="women-sub"><div class="col"><h3>Clothing</h3><ul><li><a href="/collections/womens-coats">Coats &amp; Jackets</a></li></ul></div></div></li>
    </ul></nav></header>`);
    check("named by its words, and by its label only when it has none: \"Open … :: Subnav submenu\" is the name's dress", trails((await read(end)).links), [
      "Men › Clothing | Coats & Jackets",
      "Men › Footwear | Sneakers",
      "Women › Clothing | Coats & Jackets",
    ]);

    console.log("— Nike: style inside the links, \"Men menu\" for a name —");
    const nike = page$(`<header><nav aria-label="Primary">
      <ul aria-labelledby="men-label"><li><span id="men-label" class="sr">Men menu</span></li>
        <li><a href="/w/mens-shoes"><style>.css-1{font:var(--podium)}</style>Shoes</a></li>
        <li><a href="/w/mens-clothing"><style>.css-2{color:red}</style>Clothing</a></li></ul>
      <ul aria-labelledby="women-label"><li><span id="women-label" class="sr">Women menu</span></li>
        <li><a href="/w/womens-shoes">Shoes</a></li></ul>
    </nav></header>`);
    check("no CSS in a name, and \"Men menu\" is Men", trails((await read(nike)).links), ["Men | Shoes", "Men | Clothing", "Women | Shoes"]);

    console.log("— headings beside their links, an accordion, the footer —");
    const misc = page$(`<header><nav>
      <div class="col"><h4>Clothes</h4><a href="/c/coats">Coats</a><a href="/c/knits">Knitwear</a><h4>Shoes</h4><a href="/c/boots">Boots</a></div>
      <details><summary>Women</summary><ul><li><a href="/c/women/dresses">Dresses</a></li></ul></details>
    </nav></header>
    <footer><div class="cols"><div><h3>Shop</h3><ul><li><a href="/c/gifts">Gift ideas</a></li></ul></div>
      <div><h3>Help</h3><ul><li><a href="/c/size-help">Sizes</a></li></ul></div></div></footer>`);
    const m = await read(misc);
    check("a heading heads the links after it until the next; a summary heads its accordion; footer columns have theirs", trails(m.links), [
      "Clothes | Coats",
      "Clothes | Knitwear",
      "Shoes | Boots",
      "Women | Dresses",
      "Shop | Gift ideas",
      "Help | Sizes",
    ]);
    check("and the footer's are the footer's", m.links.map((l) => l.where), ["menu", "menu", "menu", "menu", "footer", "footer"]);

    console.log("— what is not a folder —");
    const not = page$(`<header><nav>
      <div class="panel">
        <div class="promo"><a href="/c/winter-edit"><img src="data:," alt="">Shop the Winter Edit</a></div>
        <div class="column"><ul><li><a href="/c/coats">Coats</a></li><li><a href="/c/jackets">Jackets</a></li></ul></div>
      </div>
      <ul class="list2">
        <li class="item is-active"><a href="/c/current" aria-current="page"><b>Shirts</b></a></li>
        <li class="item"><a href="/c/tees">Tees</a></li>
        <li class="item"><a href="/c/polos">Polos</a></li>
      </ul>
      <ul class="list3"><li><a href="/c/all"><strong class="bold">View all</strong></a></li><li><a href="/c/bags"><span>Bags</span></a></li><li><a href="/c/belts"><span>Belts</span></a></li></ul>
      <div class="drill"><button class="back">Zurück</button><ul><li><a href="/c/sale">Sale</a></li></ul></div>
      <ul class="flat"><li><a href="/c/new">New</a></li><li><a href="/c/men">Men</a></li><li><a href="/c/women">Women</a></li></ul>
    </nav></header>`);
    check(
      "a promotion's tile, the page the admin is on, \"View all\" in bold, \"Back\" and a flat menu head nothing",
      trails((await read(not)).links),
      ["Shop the Winter Edit", "Coats", "Jackets", "Shirts", "Tees", "Polos", "View all", "Bags", "Belts", "Sale", "New", "Men", "Women"],
    );

    console.log("— the shapes reviewers found wrong (2026-11-22) —");
    const shapes = page$(`<header><div class="announcement-bar"><p>Free UK delivery over £50</p></div><nav>
      <ul class="dawn"><li><a href="/collections/new-arrivals">New Arrivals</a></li>
        <li><details><summary>Men</summary><ul><li><a href="/collections/mens-shirts">Shirts</a></li><li><a href="/collections/mens-jeans">Jeans</a></li></ul></details></li>
        <li><details><summary>Women</summary><ul><li><a href="/collections/dresses">Dresses</a></li></ul></details></li></ul>
      <ul class="bar"><li class="item item--sale"><a class="link" href="/collections/sale">Sale</a></li><li class="item"><a class="link" href="/collections/coats">Coats</a></li><li class="item"><a class="link" href="/collections/knits">Knitwear</a></li></ul>
      <ul class="wp"><li class="menu-item-has-children"><a href="/product-category/kids/">Kids</a><button class="dropdown-toggle" aria-expanded="false"><svg></svg><span class="screen-reader-text">expand child menu</span></button>
        <ul class="sub-menu"><li><a href="/product-category/kids/boys/">Boys</a></li><li><a href="/product-category/kids/girls/">Girls</a></li></ul></li></ul>
      <div class="bs"><a class="dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Gifts</a>
        <div class="dropdown-menu"><h6 class="dropdown-header">For him</h6><a class="dropdown-item" href="/gifts/him">Gifts for him</a><div class="dropdown-divider"></div><a class="dropdown-item" href="/gifts">All gifts</a></div></div>
      <div class="flat"><a href="/collections/new-in">New In</a><button aria-controls="p-acc" aria-expanded="false">Accessories</button><a href="/collections/outlet">Outlet</a></div>
      <div id="p-acc"><div class="drill"><a href="#" class="back">‹ Back</a><ul><li><a href="/collections/belts">Belts</a></li></ul></div></div>
      <ul class="tabs"><li><a href="/brands/a">Brand A</a></li><li><a href="/brands/b">Brand B</a></li></ul>
      <div class="mega-panels"><div class="mega-panel"><h4>Bags</h4><ul><li><a href="/brands/a/bags">A bags</a></li></ul></div><div class="mega-panel"><h4>Bags</h4><ul><li><a href="/brands/b/bags">B bags</a></li></ul></div></div>
      <ul role="menu"><li><a href="/w.html" aria-haspopup="true">Women's</a><ul role="menu" aria-expanded="false" style="display:none"><li><a href="/w/tops.html">Tops</a></li></ul></li></ul>
    </nav></header>`);
    check(
      "a lone link before dropdowns heads none; a highlighted first item heads nothing; WordPress' hidden \"expand child menu\", a divider, a button beside links, \"‹ Back\", an announcement; tabs and their panels in two lists; a jQuery UI panel",
      trails((await read(shapes)).links),
      [
        "New Arrivals",
        "Men | Shirts",
        "Men | Jeans",
        "Women | Dresses",
        "Sale",
        "Coats",
        "Knitwear",
        "Kids",
        "Kids | Boys",
        "Kids | Girls",
        "Gifts",
        "Gifts › For him | Gifts for him",
        "Gifts | All gifts",
        "New In",
        "Outlet",
        "Accessories | ‹ Back",
        "Accessories | Belts",
        "Brand A",
        "Brand B",
        "Brand A › Bags | A bags",
        "Brand B › Bags | B bags",
        "Women's",
        "Women's | Tops",
      ],
    );

    console.log("— a menu whose panels are in the page only while it is open —");
    // Burberry (Base UI's navigation menu): the panels go the first time the
    // pointer has been over the menu and left. Pointed at, a tab puts every
    // panel back, hidden inside its own tab, and shows its own in a box apart
    // from all of them. "Kids" is a button that opens only on a click. The
    // admin had looked at the menu before pressing Collect: seven categories,
    // no folder.
    const live = `<!doctype html><html><head><meta charset="utf-8"><style>.hide{display:none}</style></head><body>
      <header><nav><ul id="bar">
        <li><a href="/c/women/" role="button" aria-expanded="false" data-tab="women">Women</a><div class="panel" data-for="women"></div></li>
        <li><a href="/c/men/" role="button" aria-expanded="false" data-tab="men">Men</a><div class="panel" data-for="men"></div></li>
        <li><button type="button" aria-expanded="false" id="kids">Kids</button><div class="panel" data-for="kids"></div></li>
        <li><a href="/c/bags/" role="button" aria-expanded="false" data-tab="bags">Bags</a><div class="panel" data-for="bags"></div></li>
      </ul><div id="viewport"></div></nav></header><main><h1>Home</h1></main>
      <script>
        const content = {
          women: '<ul class="cols"><li class="cat"><ul><li><a href="/l/womens-clothing/"><span class="h">Clothes</span></a></li><li><a href="/l/womens-clothing/dresses/"><span class="i">Dresses</span></a></li><li><a href="/l/womens-clothing/tops/"><span class="i">Tops</span></a></li></ul></li><li class="cat"><ul><li><a href="/l/womens-bags/"><span class="h">Bags</span></a></li><li><a href="/l/womens-bags/totes/"><span class="i">Totes</span></a></li><li><a href="/l/womens-bags/clutch/"><span class="i">Clutches</span></a></li></ul></li></ul>',
          men: '<ul class="cols"><li class="cat"><ul><li><a href="/l/mens-clothing/"><span class="h">Clothes</span></a></li><li><a href="/l/mens-clothing/polos/"><span class="i">Polos</span></a></li><li><a href="/l/mens-clothing/shirts/"><span class="i">Shirts</span></a></li></ul></li></ul>',
          kids: '<ul><li><a href="/l/kids/boys/">Boys</a></li><li><a href="/l/kids/girls/">Girls</a></li></ul>',
          bags: '<ul><li><a href="/l/bags/collections/">Collections</a></li><li><a href="/l/bags/new/">New bags</a></li></ul>',
        };
        const open = (key) => {
          for (const p of document.querySelectorAll(".panel")) { p.innerHTML = '<div class="hide">' + content[p.dataset.for] + "</div>"; }
          document.getElementById("viewport").innerHTML = '<div class="col">' + content[key] + "</div>";
        };
        const close = () => { for (const p of document.querySelectorAll(".panel")) p.innerHTML = ""; document.getElementById("viewport").innerHTML = ""; };
        for (const a of document.querySelectorAll("[data-tab]")) {
          a.addEventListener("mouseover", () => open(a.dataset.tab));
          a.addEventListener("mouseout", close);
          a.addEventListener("click", (e) => { window.__clicked = (window.__clicked || 0) + 1; });
        }
        document.getElementById("kids").addEventListener("click", (e) => {
          const b = e.currentTarget;
          if (b.getAttribute("aria-expanded") === "false") { b.setAttribute("aria-expanded", "true"); document.getElementById("viewport").innerHTML = content.kids; }
          else { b.setAttribute("aria-expanded", "false"); close(); }
        });
      </script></body></html>`;
    await page.route(`${S}/**`, (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: live }));
    await page.goto(`${S}/`);
    await page.unroute(`${S}/**`);
    const asIs = await page.evaluate(`(${menuStep.toString()})({ open: false })`);
    check("read as the admin left it: the menu bar alone", trails(asIs.links), ["Women", "Men", "Bags"]);
    const opened = await page.evaluate(`(${menuStep.toString()})()`);
    check("opened item by item: each panel's links under their tab and column, whatever box the page shows them in", trails(opened.links), [
      "Women",
      "Men",
      "Bags",
      "Women | Clothes",
      "Women › Clothes | Dresses",
      "Women › Clothes | Tops",
      "Women | Bags",
      "Women › Bags | Totes",
      "Women › Bags | Clutches",
      "Men | Clothes",
      "Men › Clothes | Polos",
      "Men › Clothes | Shirts",
      "Kids | Boys",
      "Kids | Girls",
      "Bags | Collections",
      "Bags | New bags",
    ]);
    const after = await page.evaluate(() => ({
      url: location.pathname,
      clicked: window.__clicked || 0,
      panels: document.querySelectorAll(".panel a, #viewport a").length,
      kids: document.getElementById("kids").getAttribute("aria-expanded"),
    }));
    check("no link was clicked, the tab stayed where it was, and the menu is shut again", after, { url: "/", clicked: 0, panels: 0, kids: "false" });
    const openedTree = menuGroups(categoryCandidates(opened.links, `${S}/`)).map((c) => categoryName(c));
    check(
      "and as folders: Women's Bags in Women, not in the Bags tab",
      openedTree.includes("Women › Bags › Totes") && openedTree.includes("Bags › Collections") && !openedTree.includes("Bags › Totes"),
      true,
    );

    console.log("— a big menu, read quickly —");
    const huge = [];
    for (let t = 0; t < 12; t++) {
      const cols = [];
      for (let c = 0; c < 10; c++) cols.push(column(`Col ${t}-${c}`, Array.from({ length: 24 }, (_, i) => `Item ${i}`), `/l/t${t}c${c}/`));
      huge.push(`<li><a href="/c/t${t}/">Tab ${t}</a><div class="_navContent"><ul>${cols.join("")}</ul></div></li>`);
    }
    const h = await read(page$(`<header><nav><ul>${huge.join("")}</ul></nav></header>`));
    check("three thousand links of a mega-menu, every one in its tab and column", [h.links.length, h.links.filter((l) => l.trail.length === 2).length], [3012, 2880]);
    check(`in well under a second (${h.ms} ms)`, h.ms < 1000, true);
    // A flat list of thousands, each item its own class (WordPress, Magento):
    // counted afresh per item, it took minutes.
    const wp = Array.from({ length: 5000 }, (_, k) => `<li id="menu-item-${k}" class="menu-item menu-item-${k}"><a href="/product-category/brand-${k}/">Brand ${k}</a></li>`).join("");
    const f = await read(page$(`<header><nav><ul class="menu">${wp}</ul></nav></header>`));
    // And opened: nothing in it opens anything, so the few items tried cost little.
    await page.route(`${S}/**`, (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: page$(`<header><nav><ul class="menu">${wp}</ul></nav></header>`) }));
    await page.goto(`${S}/`);
    await page.unroute(`${S}/**`);
    const t1 = Date.now();
    const fo = await page.evaluate(`(${menuStep.toString()})()`);
    const openMs = Date.now() - t1;
    check(`five thousand flat items, opened item by item, in under ten seconds (${openMs} ms)`, [fo.links.length, openMs < 10_000], [5000, true]);
    check(`five thousand flat items, each with its own class, in under two seconds (${f.ms} ms)`, [f.links.length, f.links.every((l) => !l.trail.length), f.ms < 2000], [5000, true, true]);
    await browser.close();
  }

  console.log("");
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(`  ${pass} passed, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
})();
