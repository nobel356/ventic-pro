export default function ArticleVisual({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  return (
    <figure style={figureStyle}>
      <img
        src={`/blog/visuals/${slug}.svg`}
        alt={`رسم توضيحي: ${title}`}
        width={1200}
        height={675}
        loading="eager"
        style={imageStyle}
      />
      <figcaption style={captionStyle}>
        رسم توضيحي أصلي من Ventic Pro لتبسيط الفكرة. القيم النهائية تتحدد حسب
        مواصفات الجهاز ومسار التنفيذ الفعلي.
      </figcaption>
    </figure>
  );
}

const figureStyle: React.CSSProperties = {
  margin: "22px 0 0",
};

const imageStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  borderRadius: 18,
  border: "1px solid #dbe7ef",
  background: "#f8fbfd",
};

const captionStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.75,
  marginTop: 7,
};
