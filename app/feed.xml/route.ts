import { getPublishedBlogArticles } from "@/lib/blog/cms";

export const dynamic = "force-static";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const blogArticles = await getPublishedBlogArticles();
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ventic-pro.com"
  ).replace(/\/$/, "");

  const items = blogArticles.map((article) => {
    const url = baseUrl + "/blog/" + article.slug;
    const pubDate = new Date(
      article.publishedAt + "T12:00:00Z",
    ).toUTCString();

    return [
      "<item>",
      "<title>" + esc(article.title) + "</title>",
      "<link>" + url + "</link>",
      '<guid isPermaLink="true">' + url + "</guid>",
      "<pubDate>" + pubDate + "</pubDate>",
      "<category>" + esc(article.category) + "</category>",
      "<description>" + esc(article.description) + "</description>",
      "</item>",
    ].join("");
  }).join("");

  const latest =
    blogArticles
      .map((article) => article.updatedAt)
      .sort()
      .at(-1) ||
    new Date().toISOString().slice(0, 10);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    '<title>دليل التهوية - Ventic Pro</title>',
    '<link>' + baseUrl + '/blog</link>',
    '<description>مقالات عملية عن تهوية الحمامات والمطابخ والهود وخطوط الطرد.</description>',
    '<language>ar-EG</language>',
    '<lastBuildDate>' +
      new Date(latest + "T12:00:00Z").toUTCString() +
      '</lastBuildDate>',
    items,
    '</channel>',
    '</rss>',
  ].join("");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600",
    },
  });
}
