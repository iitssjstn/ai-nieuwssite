import { isHtmlBody } from "@/lib/content";

export default function ArticleBody({ body }) {
  if (!body) return null;

  if (isHtmlBody(body)) {
    // Alleen door de ingelogde redacteur zelf ingevoerde/opgemaakte content
    // komt hier binnen (via de rich-text-editor) — geen publieke user-input,
    // dus dit is veilig voor dit gebruik.
    return <div dangerouslySetInnerHTML={{ __html: body }} />;
  }

  return (
    <>
      {body.split("\n").filter(Boolean).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}
