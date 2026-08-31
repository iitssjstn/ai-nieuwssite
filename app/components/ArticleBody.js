import { isHtmlBody } from "@/lib/content";
import { sanitizeArticleBody } from "@/lib/sanitize";

export default function ArticleBody({ body }) {
  if (!body) return null;

  if (isHtmlBody(body)) {
    // Sanitisatie is nodig ondanks dat dit redacteur-ingevoerde content is
    // — de rich-text-editor is een contentEditable-veld zonder eigen
    // paste-opschoning, dus geplakte content kan ongefilterd gevaarlijke
    // HTML meenemen. Dit rendert bovendien soms als eerste aanraakpunt met
    // AI-gegenereerde content in het adminvoorbeeldscherm, vóór een
    // redacteur ooit goedkeurt — dus juist hier is het risico op een
    // hoge-privilege (admin-)sessie het grootst als dit ongefilterd bleef.
    return <div dangerouslySetInnerHTML={{ __html: sanitizeArticleBody(body) }} />;
  }

  return (
    <>
      {body.split("\n").filter(Boolean).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}
