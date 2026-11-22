/**
 * Photos: one of each, and only this product's.
 *
 * Two complaints from real runs: the same photo stored several times, and
 * photos of other products in the gallery. Each case below is a shape that
 * produced one or the other.
 *
 * Runs against the real modules in `verification/compiled` (./compile.sh).
 */
const path = require("path");
const Module = require("module");

const COMPILED = path.join(__dirname, "compiled");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith("@/")) request = path.join(COMPILED, request.slice(2));
  return origResolve.call(this, request, ...rest);
};

const PARSER = path.join(COMPILED, "lib", "server", "parser");
const { imageKey, harvestGalleryImages, upgradeImageUrl } = require(path.join(PARSER, "gallery.js"));
const { normalizeExtract } = require(path.join(PARSER, "normalize.js"));
const { mergeShopifyIntoRaw } = require(path.join(PARSER, "shopify.js"));

let pass = 0;
const failures = [];
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) pass++;
  else failures.push(`${name}\n     expected ${e}\n     actual   ${a}`);
};

/** How many distinct photos a list holds, after the product's own dedupe. */
function photosAfterNormalize(images, sourceUrl) {
  return normalizeExtract({ name: "Piece", images, strategies: [] }, sourceUrl, null).images;
}

console.log("— Scene7: the size asked for, not dropped —");
{
  // Burberry, 2026-11-22: every photo on the site came out soft. Its og:image
  // has no query and the parser dropped the size off the gallery's addresses,
  // as on other CDNs, where that is the original. On Scene7 it is the default
  // rendition: measured 356×400 bare, 500×500 with the preset only, while the
  // page asks for 1501×1500 and the photo is 4200×4725.
  const B = "https://assets.burberry.com/is/image/Burberryltd/492B8282-9F96-48F6-99BA-2DFCB20F2951";
  const page = "https://int.burberry.com/slim-jeans-p81368121";
  const up = (q) => upgradeImageUrl(B + q, page).replace(B, "");
  check("a bare address: fitted into 2000 both ways, its own proportions", up(""), "?wid=2000&hei=2000&fit=constrain");
  check("the preset alone: the same, the preset kept first", up("?$BBY_V3_SL_1$"), "?$BBY_V3_SL_1$&wid=2000&hei=2000&fit=constrain");
  check("the page's own box, scaled up to 2000 on its long side", up("?$BBY_V3_SL_1$&wid=1501&hei=1500"), "?$BBY_V3_SL_1$&wid=2000&hei=1999");
  check("a box already bigger is left as big", up("?$BBY_V3_SL_1$&wid=2500&hei=2500"), "?$BBY_V3_SL_1$&wid=2500&hei=2500");
  check("a width alone (the preset's height would box it: 2000×500) is fitted both ways", up("?$BBY_V3_SL_1$&wid=400"), "?$BBY_V3_SL_1$&wid=2000&hei=2000&fit=constrain");
  check(
    "quality and scale go, a format stays; a 3:4 box stays 3:4",
    up("?$pdp$&qlt=80&wid=300&hei=400&scl=2&fmt=jpeg"),
    "?$pdp$&fmt=jpeg&wid=1500&hei=2000",
  );
  check(
    "other Scene7 hosts too (Timberland, s7d)",
    [
      upgradeImageUrl("https://images.timberland.com/is/image/timberland/A2G8B-hero?wid=480&hei=480", "https://www.timberland.com/"),
      upgradeImageUrl("https://s7d1.scene7.com/is/image/Store/SKU_1?$pdp$", "https://www.store.example/"),
    ],
    [
      "https://images.timberland.com/is/image/timberland/A2G8B-hero?wid=2000&hei=2000",
      "https://s7d1.scene7.com/is/image/Store/SKU_1?$pdp$&wid=2000&hei=2000&fit=constrain",
    ],
  );
  check(
    "elsewhere a size is still dropped: Shopify, Demandware",
    [
      upgradeImageUrl("https://cdn.shopify.com/s/files/1/0001/files/coat.jpg?width=300&v=2", "https://shop.example/"),
      upgradeImageUrl("https://www.store.example/dw/image/v2/AAA_PRD/on/demandware.static/-/Sites/x/coat.jpg?sw=300&sh=400", "https://www.store.example/"),
    ],
    [
      "https://cdn.shopify.com/s/files/1/0001/files/coat.jpg?v=2",
      "https://www.store.example/dw/image/v2/AAA_PRD/on/demandware.static/-/Sites/x/coat.jpg",
    ],
  );
  check("every size of it is one photo", new Set(["", "?$BBY_V3_SL_1$", "?$BBY_V3_SL_1$&wid=1501&hei=1500"].map((q) => imageKey(B + q))).size, 1);
  const kept = photosAfterNormalize([B, `${B}?$BBY_V3_SL_1$&wid=400&hei=400`, `${B}?$BBY_V3_SL_1$&wid=1501&hei=1500`], page);
  check("og:image and the gallery's renditions: one photo, asked for at 2000", [kept.length, /wid=2000/.test(kept[0] || "")], [1, true]);
}

console.log("— one photo, many addresses —");
{
  const store = "https://mowalola.com/products/jordan-leather-jkt";
  const same = [
    "https://cdn.shopify.com/s/files/1/0123/4567/8901/files/JORDAN-JKT-FRONT.jpg?v=1700000000",
    "https://mowalola.com/cdn/shop/files/JORDAN-JKT-FRONT.jpg?v=1700000000&width=1100",
    "//mowalola.com/cdn/shop/files/JORDAN-JKT-FRONT_600x.jpg?v=1700000000",
  ];
  check("Shopify CDN and the store's /cdn/shop/ are one file", photosAfterNormalize(same, store).length, 1);

  const wp = "https://shop.example.com/product/wool-coat/";
  const wpSame = [
    "https://shop.example.com/wp-content/uploads/2026/09/wool-coat-front.jpg",
    "https://shop.example.com/wp-content/uploads/2026/09/wool-coat-front-300x300.jpg",
    "https://shop.example.com/wp-content/uploads/2026/09/wool-coat-front-768x1024.jpg",
    "https://shop.example.com/wp-content/uploads/2026/09/wool-coat-front-scaled.jpg",
  ];
  check("WordPress thumbnails are the one photo", photosAfterNormalize(wpSame, wp).length, 1);

  const formats = [
    "https://img.example.com/p/wool-coat-front.jpg",
    "https://img.example.com/p/wool-coat-front.jpg.webp",
    "https://img.example.com/p/wool-coat-front@2x.jpg",
    "https://img.example.com/p/wool-coat-front.webp",
  ];
  check("formats and retina renditions are the one photo", photosAfterNormalize(formats, wp).length, 1);

  const ff = [
    "https://cdn-images.farfetch-contents.com/28/53/00/33/28530033_54830861_1000.jpg",
    "https://cdn-images.farfetch-contents.com/28/53/00/33/28530033_54830861_480.jpg",
    "https://cdn-images.farfetch-contents.com/28/53/00/33/28530033_54830868_1000.jpg",
  ];
  check("Farfetch sizes are one photo, frames stay two", photosAfterNormalize(ff, "https://www.farfetch.com/shopping/x-item-28530033.aspx").length, 2);

  check(
    "distinct frames are not merged",
    photosAfterNormalize(
      ["https://img.example.com/p/All-birds_0010.jpg", "https://img.example.com/p/All-birds_0017.jpg"],
      wp,
    ).length,
    2,
  );
  check(
    "a WordPress-looking size outside wp-content is left alone",
    imageKey("https://img.example.com/p/poster-1x1.jpg") === imageKey("https://img.example.com/p/poster.jpg"),
    false,
  );
}

console.log("— only this product's photos —");
{
  const page = "https://shop.example.com/products/black-leather-jacket";
  const trusted = ["https://cdn.example.com/files/black-leather-jacket-front.jpg"];
  const html = `<main>
    <img src="https://cdn.example.com/files/black-leather-jacket-back.jpg">
    <img src="https://cdn.example.com/files/brown-leather-jacket-1.jpg">
    <img src="https://cdn.example.com/files/suede-leather-jacket-tan.jpg">
  </main>`;
  const got = harvestGalleryImages(html, page, trusted, "Black Leather Jacket");
  check("its own back view is kept", got.includes("https://cdn.example.com/files/black-leather-jacket-back.jpg"), true);
  check("a brown leather jacket is not this one", got.some((u) => /brown/.test(u)), false);
  check("nor a suede one", got.some((u) => /suede/.test(u)), false);

  const shoot = harvestGalleryImages(
    '<img src="https://cdn.example.com/files/DSC01240.jpg"><img src="https://cdn.example.com/files/IMG_4410.jpg">',
    "https://shop.example.com/products/wool-coat",
    ["https://cdn.example.com/files/DSC01234.jpg", "https://cdn.example.com/files/IMG_4417.jpg"],
    "Wool Coat",
  );
  check("camera numbers from one shoot are not frames of one product", shoot, []);

  const named = harvestGalleryImages(
    '<img src="https://cdn.example.com/files/nebula-aurelio-jacket-2.jpg">',
    "https://shop.example.com/products/nebula-aurelio-jacket",
    ["https://cdn.example.com/files/hero.jpg"],
    "Nebula Aurelio Jacket",
  );
  check("a file named for the product itself is still found", named.length, 1);
}

console.log("— Shopify's own record is the gallery —");
{
  const page = "https://mowalola.com/products/jordan-leather-jkt";
  const raw = {
    name: "MOWALOLA",
    images: [
      "https://mowalola.com/cdn/shop/files/JORDAN-JKT-FRONT.jpg?v=1",
      "https://mowalola.com/cdn/shop/files/LEATHER-JKT-BROWN-1.jpg?v=1",
      "https://mowalola.com/cdn/shop/files/BUMSTER-LEATHER-JKT.jpg?v=1",
    ],
    strategies: ["json-ld", "gallery"],
  };
  const product = {
    title: "JORDAN LEATHER JACKET",
    handle: "jordan-leather-jkt",
    vendor: "Mowalola",
    options: [],
    variants: [{ price: "1200.00", option1: "S" }],
    images: [
      { src: "https://cdn.shopify.com/s/files/1/0123/4567/files/JORDAN-JKT-FRONT.jpg?v=1", position: 1 },
      { src: "https://cdn.shopify.com/s/files/1/0123/4567/files/JORDAN-JKT-BACK.jpg?v=1", position: 2 },
    ],
  };
  const merged = mergeShopifyIntoRaw(raw, product, page, "GBP");
  const final = normalizeExtract(merged, page, null).images;
  check("two photos: the store's own list, once each", final.length, 2);
  check("no other jacket from the page", final.some((u) => /BROWN|BUMSTER/i.test(u)), false);
}

console.log("");
for (const f of failures) console.log(`  ✗ ${f}`);
console.log(`  ${pass} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
