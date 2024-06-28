import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";
import { prisma } from "../db";
import createFile from "../storage/createFile";
import { Link } from "@prisma/client";

const handleReadablility = async (content: string, link: Link) => {
  const window = new JSDOM("").window;
  const purify = DOMPurify(window);
  const cleanedUpContent = purify.sanitize(content);
  const dom = new JSDOM(cleanedUpContent, { url: link.url || "" });
  const article = new Readability(dom.window.document).parse();
  const articleText = article?.textContent
    .replace(/ +(?= )/g, "") // strip out multiple spaces
    .replace(/(\r\n|\n|\r)/gm, " "); // strip out line breaks

  if (articleText && articleText !== "") {
    const collectionId = (
      await prisma.link.findUnique({
        where: { id: link.id },
        select: { collectionId: true },
      })
    )?.collectionId;

    await createFile({
      data: JSON.stringify(article),
      filePath: `archives/${collectionId}/${link.id}_readability.json`,
    });

    await prisma.link.update({
      where: { id: link.id },
      data: {
        readable: `archives/${collectionId}/${link.id}_readability.json`,
        textContent: articleText,
      },
    });
  }
};

export default handleReadablility;